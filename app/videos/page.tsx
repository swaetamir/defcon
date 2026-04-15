import Link from 'next/link'
import { VIDEOS } from '@/lib/videos'
import VideoCard from '@/components/VideoCard'

export default function VideosPage() {
  return (
    <div className="p-8 flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl tracking-widest">PLEASE SELECT A VIDEO:</h1>
        <Link href="/" className="hud-box text-xl tracking-widest hover:bg-[var(--green-dark)] transition-colors">
          ← BACK
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-y-10 gap-x-8">
        {VIDEOS.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}
