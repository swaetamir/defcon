import { VIDEOS } from '@/lib/videos'
import VideoAnalysis from '@/components/VideoAnalysis'
import { notFound } from 'next/navigation'

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const video = VIDEOS.find(v => v.id === id)
  if (!video) notFound()
  return <VideoAnalysis video={video} />
}
