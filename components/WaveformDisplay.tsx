'use client'

import { useEffect, useRef } from 'react'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
  onAudioEnergy: (rms: number) => void
}

// module-level map so audiocontext survives react strict-mode double-invoke
const audioMap = new WeakMap<HTMLMediaElement, { ctx: AudioContext; analyser: AnalyserNode }>()

const SCROLL_BUF = 3000
const NEW_PER_FRAME = 24

export default function WaveformDisplay({ videoRef, onAudioEnergy }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollBuf = useRef(new Float32Array(SCROLL_BUF))

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    // get or create audiocontext for this video element
    let entry = audioMap.get(video)
    if (!entry) {
      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(video)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyser.connect(ctx.destination)
      entry = { ctx, analyser }
      audioMap.set(video, entry)
    }
    const { ctx: audioCtx, analyser } = entry

    // resume audiocontext on play (browser autoplay policy)
    const onPlay = () => audioCtx.resume()
    video.addEventListener('play', onPlay)

    const drawCtx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height
    const timeDomain = new Uint8Array(analyser.fftSize)
    let raf: number

    function draw() {
      raf = requestAnimationFrame(draw)

      analyser.getByteTimeDomainData(timeDomain)

      // append newest samples to scroll buffer
      scrollBuf.current.copyWithin(0, NEW_PER_FRAME)
      for (let i = 0; i < NEW_PER_FRAME; i++) {
        const raw = timeDomain[timeDomain.length - NEW_PER_FRAME + i]
        scrollBuf.current[SCROLL_BUF - NEW_PER_FRAME + i] = (raw - 128) / 128
      }

      // rms energy for vibe alignment
      let sum = 0
      for (let i = 0; i < timeDomain.length; i++) {
        const v = (timeDomain[i] - 128) / 128
        sum += v * v
      }
      onAudioEnergy(Math.sqrt(sum / timeDomain.length))

      // draw
      drawCtx.fillStyle = '#000'
      drawCtx.fillRect(0, 0, W, H)

      // centre axis
      drawCtx.strokeStyle = '#003310'
      drawCtx.lineWidth = 1
      drawCtx.beginPath()
      drawCtx.moveTo(0, H / 2)
      drawCtx.lineTo(W, H / 2)
      drawCtx.stroke()

      // waveform
      drawCtx.strokeStyle = '#00ff41'
      drawCtx.lineWidth = 1.5
      drawCtx.beginPath()
      for (let i = 0; i < SCROLL_BUF; i++) {
        const x = (i / SCROLL_BUF) * W
        const y = H / 2 + scrollBuf.current[i] * (H / 2) * 0.85
        i === 0 ? drawCtx.moveTo(x, y) : drawCtx.lineTo(x, y)
      }
      drawCtx.stroke()

      // labels
      drawCtx.fillStyle = '#00aa2a'
      drawCtx.font = `14px var(--font-vt323), monospace`
      drawCtx.fillText('AUDIO WAVEFORM  ·  REAL-TIME', 8, 16)
      drawCtx.fillText('+1', 4, 22)
      drawCtx.fillText(' 0', 4, H / 2 + 6)
      drawCtx.fillText('-1', 4, H - 4)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      video.removeEventListener('play', onPlay)
    }
  }, [videoRef, onAudioEnergy])

  return (
    <div className="hud-box p-0 overflow-hidden w-full h-full">
      <canvas
        ref={canvasRef}
        width={900}
        height={176}
        className="w-full h-full block"
      />
    </div>
  )
}
