'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SignupCompletePage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUserId(session.user.id)
      // 이미 accounts 있으면 바로 이동
      supabase.from('accounts').select('status').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
        if (data) { window.location.href = '/'; return }
      })
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    const { error } = await supabase.from('accounts').insert({
      user_id: userId,
      name: name.trim(),
      phone: phone.trim(),
    })
    if (error) { alert('오류가 발생했어요.'); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 text-center">
      <div>
        <div className="text-5xl mb-5">✅</div>
        <h2 className="text-xl font-black text-white mb-3">가입 신청 완료!</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          관리자 승인 후 이용 가능해요.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-black text-white mb-1">정보 입력</h1>
          <p className="text-white/40 text-sm">이름과 연락처를 입력해주세요</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="이름" required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="연락처 (예: 010-0000-0000)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" />
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-medium disabled:opacity-50 mt-1"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {loading ? '처리 중...' : '가입 신청하기'}
          </button>
          <button type="button" onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="w-full py-3 rounded-xl font-medium text-sm"
            style={{ color: 'rgba(255,255,255,0.3)', background: 'transparent', border: 'none' }}>
            다른 계정으로 로그인
          </button>
        </form>
      </div>
    </div>
  )
}
