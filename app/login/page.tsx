'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('이메일 또는 비밀번호가 올바르지 않아요.'); setLoading(false); return }
    const { data: acc } = await supabase.from('accounts').select('id').eq('user_id', data.user.id).maybeSingle()
    window.location.href = acc ? '/' : '/signup/complete'
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0c0c12' }}>

      {/* 배경 그라디언트 장식 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
        }} />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center">

      {/* 로고 영역 */}
      <div className="flex flex-col items-center mb-10">
        <img src="/logo.png" alt="KH Music" className="w-20 h-20 rounded-3xl mb-6"
          style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }} />
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">연습실 예약</h1>
        <p className="text-white/35 text-sm">KH Music & Studio</p>
      </div>

      {/* 폼 영역 */}
      <div className="w-full flex flex-col">

        {/* Google 로그인 */}
        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 font-semibold py-4 rounded-2xl mb-8 transition active:scale-95"
          style={{ background: '#fff', color: '#111', fontSize: 15 }}>
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/>
          </svg>
          Google로 로그인
        </button>

        {/* 구분선 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>이메일로 로그인</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* 이메일 폼 */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일" required
            className="w-full rounded-2xl px-5 py-4 text-white text-[15px] focus:outline-none transition"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호" required
            className="w-full rounded-2xl px-5 py-4 text-white text-[15px] focus:outline-none transition"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }} />
          {error && <p className="text-red-400 text-sm text-center pt-1">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-[15px] disabled:opacity-50 transition active:scale-95 mt-1"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm mt-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-semibold" style={{ color: '#818cf8' }}>가입 신청</Link>
        </p>
      </div>
      </div>
    </div>
  )
}
