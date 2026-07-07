import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KH Music 연습실 예약',
  description: 'KH Music Academy 연습실 예약 시스템',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '연습실예약' },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-full">
        {children}
        <a href="https://www.khmusic.co.kr" target="_blank" rel="noopener noreferrer"
          style={{ position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            fontSize: 11, color: 'rgba(30,27,75,0.3)', letterSpacing: '0.05em',
            textDecoration: 'none', zIndex: 9999, whiteSpace: 'nowrap' }}>
          by KH Music
        </a>
      </body>
    </html>
  )
}
