export interface Video {
  id: string
  title: string
  artist: string
  year: number
  src: string
  thumbnail: string
}

export const VIDEOS: Video[] = [
  {
    id: '001',
    title: 'BULLET FROM A GUN',
    artist: 'SKEPTA',
    year: 2019,
    src: 'https://pub-0676fca3e3904780a0f8b5baf1c3b814.r2.dev/bulletfromagun-skepta.mp4',
    thumbnail: '/thumbnails/bulletfromagun-skepta.jpg',
  },
  {
    id: '002',
    title: 'X',
    artist: 'TIAKOLA',
    year: 2024,
    src: 'https://pub-0676fca3e3904780a0f8b5baf1c3b814.r2.dev/x-tiakola.mp4',
    thumbnail: '/thumbnails/x-tiakola.jpg',
  },
  {
    id: '003',
    title: 'COME N GO',
    artist: 'YEAT',
    year: 2025,
    src: 'https://pub-0676fca3e3904780a0f8b5baf1c3b814.r2.dev/comnego-yeat.mp4',
    thumbnail: '/thumbnails/comnego-yeat.jpg',
  },
  {
    id: '004',
    title: '5AM IN TORONTO',
    artist: 'DRAKE',
    year: 2013,
    src: 'https://pub-0676fca3e3904780a0f8b5baf1c3b814.r2.dev/5amintoronto-drake.mp4',
    thumbnail: '/thumbnails/5amintoronto-drake.jpg',
  },
  {
    id: '005',
    title: 'SKYBOX',
    artist: 'GUNNA',
    year: 2022,
    src: 'https://pub-0676fca3e3904780a0f8b5baf1c3b814.r2.dev/skybox-gunna.mp4',
    thumbnail: '/thumbnails/skybox-gunna.jpg',
  },
  {
    id: '006',
    title: 'FASHION KILLA',
    artist: 'ASAP ROCKY',
    year: 2013,
    src: 'https://pub-0676fca3e3904780a0f8b5baf1c3b814.r2.dev/fashionkilla-asaprocky.mp4',
    thumbnail: '/thumbnails/fashionkilla-asaprocky.jpg',
  },
]
