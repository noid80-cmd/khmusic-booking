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
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, textAlign: 'center',
            padding: '8px 0 10px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
            fontSize: 11, fontWeight: 600, color: 'rgba(99,102,241,0.6)', letterSpacing: '0.15em',
            textDecoration: 'none', zIndex: 9999, whiteSpace: 'nowrap' }}>
          by KHMUSIC
        </a>
      </body>
    </html>
  )
}
