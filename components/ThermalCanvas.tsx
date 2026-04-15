'use client'

import { useEffect, useRef, useCallback } from 'react'
import { applyIronbowToImageData, detectMotion } from '@/lib/thermal'
import type { MotionData } from '@/lib/thermal'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
  thermalMode: boolean
  onMotion: (data: MotionData, velocity: number) => void
  onEnergy: (energy: number) => void
  onModelReady?: () => void
}

// low-res canvas for frame-diff energy metrics
const PW = 320
const PH = 180

// coco-ssd detection interval (ms)
const DETECT_INTERVAL = 150

// ema smoothing for boxes
const SMOOTH = 0.3
const MAX_VEL = 500
const CONFIDENCE = 0.4

interface SmoothedBox {
  x: number; y: number; w: number; h: number
  cx: number; cy: number  // normalised 0–1
}

export default function ThermalCanvas({ videoRef, thermalMode, onMotion, onEnergy, onModelReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const motionOffRef = useRef<HTMLCanvasElement | null>(null)
  const thermalOffRef = useRef<HTMLCanvasElement | null>(null)
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null)
  const prevTimeRef = useRef<number>(0)
  const prevCentroidRef = useRef<{ x: number; y: number } | null>(null)
  const smoothedBoxes = useRef<SmoothedBox[]>([])
  const velEma = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const lastDetectAt = useRef<number>(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null)
  const modelLoadingRef = useRef<boolean>(false)

  const onMotionStable = useCallback(onMotion, []) // eslint-disable-line react-hooks/exhaustive-deps
  const onEnergyStable = useCallback(onEnergy, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // load coco-ssd model once
    if (!modelRef.current && !modelLoadingRef.current) {
      modelLoadingRef.current = true
      Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd'),
      ]).then(([tf, cocoSsd]) => {
        tf.setBackend('webgl').catch(() => tf.setBackend('cpu'))
        return cocoSsd.load({ base: 'lite_mobilenet_v2' })
      }).then(model => {
        modelRef.current = model
        modelLoadingRef.current = false
        onModelReady?.()
      }).catch(console.error)
    }

    const motionOff = document.createElement('canvas')
    motionOff.width = PW; motionOff.height = PH
    motionOffRef.current = motionOff

    const thermalOff = document.createElement('canvas')
    thermalOff.width = 1280; thermalOff.height = 720
    thermalOffRef.current = thermalOff

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

    function frame(now: number) {
      rafRef.current = requestAnimationFrame(frame)
      const video = videoRef.current
      if (!video || video.readyState < 2) return

      const W = canvas.width
      const H = canvas.height

      if (video.paused) {
        ctx.clearRect(0, 0, W, H)
        smoothedBoxes.current = []
        return
      }

      // frame-diff energy
      const motionCtx = motionOff.getContext('2d', { willReadFrequently: true })!
      motionCtx.drawImage(video, 0, 0, PW, PH)
      const motionImgData = motionCtx.getImageData(0, 0, PW, PH)
      const curr = motionImgData.data

      if (prevFrameRef.current) {
        const motion = detectMotion(prevFrameRef.current, curr, PW, PH)
        onEnergyStable(motion.energy)
      }
      prevFrameRef.current = new Uint8ClampedArray(curr)

      // coco-ssd detection (throttled)
      const model = modelRef.current
      if (model && now - lastDetectAt.current >= DETECT_INTERVAL) {
        lastDetectAt.current = now
        const dt = (now - prevTimeRef.current) / 1000
        prevTimeRef.current = now

        model.detect(video).then((predictions: Array<{
          class: string; score: number
          bbox: [number, number, number, number]
        }>) => {
          // filter to people above confidence threshold
          const people = predictions.filter(p => p.class === 'person' && p.score >= CONFIDENCE)

          // sort by area, largest first
          people.sort((a, b) => (b.bbox[2] * b.bbox[3]) - (a.bbox[2] * a.bbox[3]))

          const vW = video.videoWidth || 1280
          const vH = video.videoHeight || 720

          // smooth boxes with ema
          const incoming = people.map(p => ({
            x: p.bbox[0] / vW,
            y: p.bbox[1] / vH,
            w: p.bbox[2] / vW,
            h: p.bbox[3] / vH,
            cx: (p.bbox[0] + p.bbox[2] / 2) / vW,
            cy: (p.bbox[1] + p.bbox[3] / 2) / vH,
          }))

          smoothedBoxes.current = incoming.map((box, i) => {
            const prev = smoothedBoxes.current[i]
            if (!prev) return box
            return {
              x: lerp(prev.x, box.x, SMOOTH),
              y: lerp(prev.y, box.y, SMOOTH),
              w: lerp(prev.w, box.w, SMOOTH),
              h: lerp(prev.h, box.h, SMOOTH),
              cx: lerp(prev.cx, box.cx, SMOOTH),
              cy: lerp(prev.cy, box.cy, SMOOTH),
            }
          })

          // velocity from primary subject centroid
          let velocity = 0
          const first = smoothedBoxes.current[0]
          if (prevCentroidRef.current && first && dt > 0) {
            const dx = (first.cx - prevCentroidRef.current.x) * W
            const dy = (first.cy - prevCentroidRef.current.y) * H
            velocity = Math.min(Math.sqrt(dx * dx + dy * dy) / dt, MAX_VEL)
          }
          velEma.current = velEma.current * 0.7 + velocity * 0.3
          if (first) prevCentroidRef.current = { x: first.cx, y: first.cy }

          // build motiondata for telemetry
          const primary = smoothedBoxes.current[0]
          const motionData: MotionData = {
            subjects: smoothedBoxes.current.map(b => ({
              bbox: {
                x: b.x * PW, y: b.y * PH,
                w: b.w * PW, h: b.h * PH,
              },
              centroid: { x: b.cx, y: b.cy },
              occupancy: b.w * b.h,
            })),
            energy: 0,
            bbox: primary ? {
              x: primary.x * PW, y: primary.y * PH,
              w: primary.w * PW, h: primary.h * PH,
            } : null,
            centroid: primary ? { x: primary.cx, y: primary.cy } : { x: 0.5, y: 0.5 },
            occupancy: primary ? primary.w * primary.h : 0,
          }

          onMotionStable(motionData, velEma.current)
        }).catch(() => {/* detection failed this frame, keep stale boxes */})
      }

      // render
      ctx.clearRect(0, 0, W, H)

      if (thermalMode) {
        const thermalCtx = thermalOff.getContext('2d', { willReadFrequently: true })!
        thermalCtx.drawImage(video, 0, 0, 1280, 720)
        const imgData = thermalCtx.getImageData(0, 0, 1280, 720)
        applyIronbowToImageData(imgData.data)
        thermalCtx.putImageData(imgData, 0, 0)
        ctx.drawImage(thermalOff, 0, 0, W, H)
      }

      const boxes = smoothedBoxes.current
      if (boxes.length > 0) {
        boxes.forEach((box, i) => {
          // pad boxes horizontally, trim vertically
          const padX = box.w * W * 0.18
          const trimY = box.h * H * 0.38
          const bx = Math.max(0, box.x * W - padX)
          const by = box.y * H + trimY
          const bw = Math.min(W - bx, box.w * W + padX * 2)
          const bh = box.h * H - trimY * 2
          const label = `TGT-${String(i + 1).padStart(3, '0')}`

          ctx.strokeStyle = '#00ff41'
          ctx.lineWidth = 2
          ctx.strokeRect(bx, by, bw, bh)

          // corner ticks
          const t = 12
          ctx.beginPath()
          ctx.moveTo(bx, by + t);           ctx.lineTo(bx, by);        ctx.lineTo(bx + t, by)
          ctx.moveTo(bx + bw - t, by);      ctx.lineTo(bx + bw, by);   ctx.lineTo(bx + bw, by + t)
          ctx.moveTo(bx, by + bh - t);      ctx.lineTo(bx, by + bh);   ctx.lineTo(bx + t, by + bh)
          ctx.moveTo(bx + bw - t, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - t)
          ctx.stroke()

          ctx.font = '18px var(--font-vt323), monospace'
          const tw = ctx.measureText(label).width
          ctx.fillStyle = '#000'
          ctx.fillRect(bx + bw - tw - 4, by + bh - 22, tw + 8, 22)
          ctx.fillStyle = '#00ff41'
          ctx.fillText(label, bx + bw - tw, by + bh - 4)

          if (i === 0) {
            const lineY = by + bh * 0.35
            ctx.strokeStyle = '#00ff41'
            ctx.lineWidth = 1
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            ctx.moveTo(bx + bw, lineY)
            ctx.lineTo(W, lineY)
            ctx.stroke()
            ctx.setLineDash([])
          }
        })
      }
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [videoRef, thermalMode, onMotionStable, onEnergyStable])

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
