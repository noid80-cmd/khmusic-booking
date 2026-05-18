import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KH Music 연습실 예약',
    short_name: 'KH예약',
    description: 'KH Music Academy 연습실 예약 시스템',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#6366f1',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
