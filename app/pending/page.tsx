'use client'

import { supabase } from '@/lib/supabase'

export default function PendingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>

        {/* 아이콘 */}
        <div style={{
          width: 88, height: 88, borderRadius: 28, margin: '0 auto 32px',
          background: 'rgba(99,102,241,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40,
          boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 8px 32px rgba(99,102,241,0.15)',
        }}>⏳</div>

        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 16 }}>승인 대기 중</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1.8, marginBottom: 40 }}>
          관리자가 가입을 승인하면<br />
          이용하실 수 있어요.
        </p>

        {/* 안내 박스 */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18, padding: '24px 28px', marginBottom: 40, textAlign: 'left',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 0.5, marginBottom: 14 }}>안내</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              '승인은 보통 당일 처리됩니다',
              '승인 완료 시 로그인 후 바로 이용 가능해요',
              '문의는 선생님께 직접 연락해주세요',
            ].map((text, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 14, cursor: 'pointer', padding: '8px' }}>
          로그아웃
        </button>
      </div>
    </div>
  )
}
