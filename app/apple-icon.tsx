import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#3d3d4a',
        borderRadius: 0,
      }}>
        <span style={{ color: '#d4a0b0', fontSize: 80, fontWeight: 900, letterSpacing: -3, fontFamily: 'sans-serif' }}>KH</span>
      </div>
    ),
    { ...size }
  )
}
