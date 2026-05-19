'use client'

import { QRCodeSVG } from 'qrcode.react'

const URL = 'https://khmusic-booking.vercel.app/login'

export default function QRPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-8">
      <div className="text-center">
        <p className="text-gray-400 text-sm font-medium tracking-widest uppercase mb-1">KH Music Academy</p>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">연습실 예약</h1>
      </div>

      <div className="p-6 rounded-3xl shadow-2xl shadow-black/10 border border-gray-100 bg-white">
        <QRCodeSVG
          value={URL}
          size={220}
          bgColor="#ffffff"
          fgColor="#111111"
          level="M"
        />
      </div>

      <div className="text-center space-y-1">
        <p className="text-gray-900 font-semibold text-base">QR 코드를 스캔하세요</p>
        <p className="text-gray-400 text-sm">카메라 앱으로 스캔하면 바로 연결돼요</p>
      </div>

      <div className="px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100">
        <p className="text-gray-400 text-xs text-center font-mono">{URL}</p>
      </div>
    </div>
  )
}
