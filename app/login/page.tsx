'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    if (error) { setError('이메일을 확인해주세요.'); return }
    setResetSent(true)
  }

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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  const inputStyle = {
    width: '100%', background: '#ffffff', border: '1px solid #e4e4ef',
    borderRadius: 16, padding: '14px 18px', fontSize: 15, outline: 'none',
    color: '#1e1b4b', colorScheme: 'light' as const,
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ background: '#f0f0f8' }}>

      {/* 배경 장식 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }} />
      </div>

      <div className="w-full max-w-sm flex flex-col items-center" style={{ marginBottom: '10vh' }}>

        {/* 로고 */}
        <div className="flex flex-col items-center mb-14">
          <img src="/logo.png" alt="KH Music" className="w-20 h-20 rounded-3xl mb-4 object-cover"
            style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.2)' }} />
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#1e1b4b' }}>연습실 예약</h1>
        </div>

        {/* 폼 */}
        <div className="w-full flex flex-col gap-6">

          {/* Google 로그인 */}
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 font-bold rounded-2xl transition active:scale-95"
            style={{ background: '#ffffff', color: '#1e1b4b', fontSize: 16, border: '1px solid #d8d8ec', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', minHeight: 54, padding: '0 20px' }}>
            <svg width="24" height="24" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
            Google로 로그인
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#d8d8ec' }} />
            <span className="text-[12px] font-semibold" style={{ color: '#8b8baa' }}>이메일로 로그인</span>
            <div className="flex-1 h-px" style={{ background: '#d8d8ec' }} />
          </div>

          {/* 이메일 폼 */}
          {!resetMode ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="이메일" required style={inputStyle} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호" required style={inputStyle} />
              {error && <p className="text-red-500 text-sm text-center pt-1">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-2xl text-white font-bold text-[17px] disabled:opacity-50 transition active:scale-95 mt-1"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)', minHeight: 54 }}>
                {loading ? '로그인 중...' : '로그인'}
              </button>
              <button type="button" onClick={() => { setResetMode(true); setError('') }}
                className="text-center text-sm font-medium mt-1" style={{ color: '#8b8baa' }}>
                비밀번호를 잊으셨나요?
              </button>
            </form>
          ) : resetSent ? (
            <div className="text-center py-4">
              <p className="font-semibold mb-2" style={{ color: '#1e1b4b' }}>이메일을 확인해주세요 ✉️</p>
              <p className="text-sm mb-6" style={{ color: '#8b8baa' }}>재설정 링크를 보냈어요</p>
              <button onClick={() => { setResetMode(false); setResetSent(false) }}
                className="text-sm font-semibold" style={{ color: '#6366f1' }}>로그인으로 돌아가기</button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-3">
              <p className="text-sm font-semibold mb-1" style={{ color: '#1e1b4b' }}>비밀번호 재설정</p>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="가입한 이메일" required style={inputStyle} />
              {error && <p className="text-red-500 text-sm text-center pt-1">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-4 rounded-2xl text-white font-bold text-[15px] disabled:opacity-50 transition active:scale-95"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.28)' }}>
                {loading ? '전송 중...' : '재설정 링크 보내기'}
              </button>
              <button type="button" onClick={() => { setResetMode(false); setError('') }}
                className="text-center text-sm font-medium" style={{ color: '#8b8baa' }}>
                취소
              </button>
            </form>
          )}

          <p className="text-center text-sm mt-2 font-medium" style={{ color: '#8b8baa' }}>
            계정이 없으신가요?{' '}
            <Link href="/signup" className="font-bold" style={{ color: '#6366f1' }}>가입 신청</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
