'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('비밀번호가 일치하지 않아요.'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 해요.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('오류가 발생했어요. 링크가 만료되었을 수 있어요.'); return }
    setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0c0c12' }}>
      <div className="w-full max-w-sm flex flex-col items-center" style={{ marginBottom: '12vh' }}>

        <div className="flex flex-col items-center mb-10">
          <img src="/logo.png" alt="KH Music" className="w-20 h-20 rounded-3xl mb-6"
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }} />
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">비밀번호 재설정</h1>
          <p className="text-white/35 text-sm">KH Music & Studio</p>
        </div>

        {done ? (
          <div className="text-center">
            <p className="text-white font-semibold mb-2">비밀번호가 변경됐어요 ✅</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>다시 로그인해주세요</p>
            <a href="/login" className="font-semibold text-sm" style={{ color: '#818cf8' }}>로그인으로 이동</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)" required
              className="w-full rounded-2xl px-5 py-4 text-white text-[15px] focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }} />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="비밀번호 확인" required
              className="w-full rounded-2xl px-5 py-4 text-white text-[15px] focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }} />
            {error && <p className="text-red-400 text-sm text-center pt-1">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] disabled:opacity-50 transition active:scale-95 mt-1"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
