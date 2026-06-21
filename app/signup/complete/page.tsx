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
    const email = (await supabase.auth.getSession()).data.session?.user.email ?? ''
    fetch('/api/notify-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email, phone: phone.trim() }) }).catch(() => {})
    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 10 }}>가입 신청 완료!</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.8 }}>관리자 승인 후 이용 가능해요.</p>
      </div>
    </div>
  )

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, padding: '14px 18px', fontSize: 15, color: '#fff',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 8 }}>정보 입력</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>이름과 연락처를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="이름" required style={inputStyle} />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="연락처 (예: 010-0000-0000)" style={inputStyle} />

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1, marginTop: 4,
            }}>
            {loading ? '처리 중...' : '가입 신청하기'}
          </button>

          <button type="button" onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 14, cursor: 'pointer', padding: '8px' }}>
            다른 계정으로 로그인
          </button>
        </form>
      </div>
    </div>
  )
}
