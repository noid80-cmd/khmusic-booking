'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const STUDENT_TYPES = [
  { value: 'exam',         label: '입시반' },
  { value: 'audition',     label: '오디션반' },
  { value: 'professional', label: '전문반' },
  { value: 'hobby',        label: '취미반' },
] as const

type StudentType = typeof STUDENT_TYPES[number]['value']

export default function SignupPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [studentType, setStudentType] = useState<StudentType | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!studentType) { setError('반을 선택해주세요.'); return }
    setError(''); setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already exists')) {
        setError('이미 가입된 이메일이에요. 로그인 페이지에서 로그인해주세요.')
      } else {
        setError(authError.message)
      }
      setLoading(false); return
    }

    if (data.user) {
      const { error: accError } = await supabase.from('accounts').insert({
        user_id: data.user.id,
        name: name.trim(),
        phone: phone.trim(),
        student_type: studentType,
      })
      if (accError) { setError('오류가 발생했어요.'); setLoading(false); return }
    }

    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 10 }}>가입 신청 완료!</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.8 }}>
          관리자 승인 후 이용 가능해요.<br />승인되면 로그인해주세요.
        </p>
        <Link href="/login" style={{ marginTop: 24, display: 'inline-block', color: '#818cf8', fontSize: 14 }}>로그인으로 이동</Link>
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
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 8 }}>가입 신청</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>관리자 승인 후 이용 가능해요</p>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 학생 유형 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>반 선택</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {STUDENT_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setStudentType(t.value)}
                  style={{
                    padding: '14px 10px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: studentType === t.value ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${studentType === t.value ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                    color: studentType === t.value ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="이름" required style={inputStyle} />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="연락처 (예: 010-0000-0000)" style={inputStyle} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="이메일" required style={inputStyle} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)" required minLength={6} style={inputStyle} />

          {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{error}</p>}

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
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 24 }}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" style={{ color: '#818cf8' }}>로그인</Link>
        </p>
      </div>
    </div>
  )
}
