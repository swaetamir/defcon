'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import ThermalCanvas from './ThermalCanvas'
import WaveformDisplay from './WaveformDisplay'
import type { MotionData } from '@/lib/thermal'
import type { Video } from '@/lib/videos'

interface Props { video: Video }

// telemetry update interval (ms)
const TELEMETRY_HZ = 200
// buffer length
const BUF_LEN = 45

// coactivation: fraction of recent samples where both signals exceed their mean
// more robust than pearson for noisy a/v sync
function coactivation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 8) return 0
  const ma = a.slice(0, n).reduce((s, v) => s + v, 0) / n
  const mb = b.slice(0, n).reduce((s, v) => s + v, 0) / n
  let count = 0
  for (let i = 0; i < n; i++) {
    if (a[i] > ma && b[i] > mb) count++
  }
  return count / n
}

export default function VideoAnalysis({ video }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [thermalMode, setThermalMode] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [tracking, setTracking] = useState<MotionData | null>(null)
  const [subjectCount, setSubjectCount] = useState(0)
  const [vibeAlignment, setVibeAlignment] = useState(0)

  const videoEnergyBuf = useRef<number[]>([])
  const audioEnergyBuf = useRef<number[]>([])
  const lastTelemetryAt = useRef<number>(0)
  // running ema for velocity
  const velEma = useRef<number>(0)

  const handleVideoEnergy = useCallback((energy: number) => {
    videoEnergyBuf.current.push(energy)
    if (videoEnergyBuf.current.length > BUF_LEN) videoEnergyBuf.current.shift()
  }, [])

  const handleMotion = useCallback((data: MotionData, vel: number) => {
    // ema smooth velocity
    velEma.current = velEma.current * 0.8 + vel * 0.2

    // throttle state updates to ~5fps
    const now = performance.now()
    if (now - lastTelemetryAt.current < TELEMETRY_HZ) return
    lastTelemetryAt.current = now

    setTracking(data)
    setSubjectCount(data.subjects.length)
    const score = coactivation(videoEnergyBuf.current, audioEnergyBuf.current)
    setVibeAlignment(Math.round(score * 100))
  }, [])

  const handleAudioEnergy = useCallback((rms: number) => {
    audioEnergyBuf.current.push(rms)
    if (audioEnergyBuf.current.length > BUF_LEN) audioEnergyBuf.current.shift()
  }, [])

  const detected = modelReady && subjectCount > 0
  const cx  = detected && tracking?.centroid
    ? `${Math.round(tracking.centroid.x * 1280)}, ${Math.round(tracking.centroid.y * 720)}`
    : '—'
  const occ = detected && tracking ? `${(tracking.occupancy * 100).toFixed(1)}%` : '—'
  const vel = detected ? `${Math.round(velEma.current)}` : '—'

  return (
    <div
      className="flex flex-col h-screen p-6 gap-3 overflow-hidden"
      style={{ fontFamily: 'var(--font-vt323), monospace' }}
    >
      <div className="flex items-center gap-4 text-xl tracking-widest shrink-0 pb-2 border-b border-[var(--green-dark)]">
        <Link href="/videos" className="dim hover:text-white transition-colors text-2xl">←</Link>
        <span className="dim">YOU HAVE SELECTED:</span>
        <span>{video.title}</span>
        <span className="dim">BY</span>
        <span>{video.artist}</span>
      </div>

      <div className="flex gap-5 min-h-0 items-stretch" style={{ height: '63vh' }}>

        <div className="flex flex-col gap-1 min-w-0" style={{ width: '58%' }}>
          <div className="flex justify-end gap-6 text-lg tracking-widest shrink-0">
            <button
              onClick={() => setThermalMode(true)}
              className={thermalMode ? '' : 'dim hover:text-white transition-colors'}
            >
              THERMAL
            </button>
            <span className="dim">|</span>
            <button
              onClick={() => setThermalMode(false)}
              className={!thermalMode ? '' : 'dim hover:text-white transition-colors'}
            >
              NORMAL
            </button>
          </div>

          <div className="relative flex-1 min-h-0 bg-black border border-[var(--green-dark)] overflow-hidden">
            <video
              ref={videoRef}
              src={video.src}
              controls
              crossOrigin="anonymous"
              className={`absolute inset-0 w-full h-full object-contain ${thermalMode ? 'invisible' : ''}`}
            />
            <ThermalCanvas
              videoRef={videoRef}
              thermalMode={thermalMode}
              onMotion={handleMotion}
              onEnergy={handleVideoEnergy}
              onModelReady={() => setModelReady(true)}
            />
          </div>
        </div>

        <div className="hud-box shrink-0 flex flex-col text-xl tracking-wide overflow-hidden" style={{ width: '20%' }}>
          <div className={`text-lg mb-3 pb-2 border-b border-[var(--green-dark)] ${detected ? '' : 'dim'}`}>
            {!modelReady
              ? <><span className="cursor">_</span> LOADING MODEL</>
              : detected
                ? `${subjectCount} SUBJECT${subjectCount > 1 ? 'S' : ''} DETECTED`
                : 'NO SIGNAL'}
          </div>

          <div className="flex flex-col gap-4 flex-1">
            <div>
              <div className="dim text-sm tracking-widest mb-1">VELOCITY</div>
              <div className="text-2xl">{vel}<span className="dim text-sm"> PX/S</span></div>
            </div>
            <div className="border-t border-[var(--green-dark)] pt-4">
              <div className="dim text-sm tracking-widest mb-1">CENTROID</div>
              <div className="text-xl">{cx}</div>
            </div>
            <div className="border-t border-[var(--green-dark)] pt-4">
              <div className="dim text-sm tracking-widest mb-1">AREA OCC.</div>
              <div className="text-2xl">{occ}</div>
            </div>
          </div>
        </div>

      </div>

      <div className="flex gap-5 items-stretch h-44 shrink-0">
        <div style={{ width: '58%' }} className="min-w-0">
          <WaveformDisplay videoRef={videoRef} onAudioEnergy={handleAudioEnergy} />
        </div>
        <div className="flex flex-col justify-center text-right tracking-widest" style={{ width: '20%' }}>
          <div className="dim text-lg">VIBE ALIGNMENT</div>
          <div className="text-6xl">{vibeAlignment}%</div>
        </div>
      </div>

    </div>
  )
}
