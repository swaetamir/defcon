'use client'

import Link from 'next/link'
import type { Video } from '@/lib/videos'

interface Props {
  video: Video
}

export default function VideoCard({ video }: Props) {
  return (
    <Link
      href={`/videos/${video.id}`}
      className="flex flex-col gap-2 group cursor-pointer"
    >
      {/* thumbnail */}
      <div className="relative w-full aspect-video overflow-hidden border border-[var(--green-dim)] group-hover:border-[var(--green)] transition-colors">
        {video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background:
                'linear-gradient(135deg, #0a0a2e 0%, #1a0a3e 20%, #3d0a2e 40%, #6e1a0a 60%, #c84a00 80%, #ffd700 100%)',
            }}
          />
        )}

        {/* thermal camera hud overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ fontSize: '9px', fontFamily: 'var(--font-vt323), monospace', color: 'var(--green)', lineHeight: 1.2 }}>
          <div className="absolute top-1 right-1">36.1 C</div>
          <div className="absolute top-1 left-1">⊕15.3</div>
          <div className="absolute bottom-1 right-1">16.7 Y</div>
          <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[var(--green)]" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[var(--green)]" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[var(--green)]" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[var(--green)]" />
        </div>
      </div>

      {/* metadata */}
      <div className="flex items-baseline justify-between gap-4 text-base tracking-wider leading-tight px-1">
        <div className="group-hover:text-white transition-colors truncate">{video.title}</div>
        <div className="dim shrink-0">{video.artist} · {video.year}</div>
      </div>
    </Link>
  )
}
