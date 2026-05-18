'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    if (data.user) {
      const { error: accError } = await supabase.from('accounts').insert({
        user_id: data.user.id,
        name: name.trim(),
        phone: phone.trim(),
      })
      if (accError) { setError('오류가 발생했어요.'); setLoading(false); return }
    }

    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 text-center">
      <div>
        <div className="text-5xl mb-5">✅</div>
        <h2 className="text-xl font-black text-white mb-3">가입 신청 완료!</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          관리자 승인 후 이용 가능해요.<br />
          승인되면 로그인해주세요.
        </p>
        <Link href="/login" className="mt-6 inline-block text-indigo-400 text-sm hover:underline">로그인으로 이동</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-black text-white mb-1">가입 신청</h1>
          <p className="text-white/40 text-sm">관리자 승인 후 이용 가능해요</p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="이름" required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="연락처 (예: 010-0000-0000)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일" required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)" required minLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50 mt-1"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {loading ? '처리 중...' : '가입 신청하기'}
          </button>
        </form>

        <p className="text-center text-white/40 text-sm mt-5">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-indigo-400 hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  )
}
