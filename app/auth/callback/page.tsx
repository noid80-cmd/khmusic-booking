'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

async function redirectForSession(session: Session) {
  const { data } = await supabase.from('accounts').select('id').eq('user_id', session.user.id).maybeSingle()
  if (data) { window.location.href = '/'; return }
  const { data: adminData } = await supabase.from('admins').select('id')
    .or(`email.eq.${session.user.email},user_id.eq.${session.user.id}`).maybeSingle()
  window.location.href = adminData ? '/admin' : '/signup/complete'
}

export default function AuthCallback() {
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const type = params.get('type')
    const errorDesc = params.get('error_description')

    if (errorDesc) { setErrMsg(errorDesc); return }

    const run = async () => {
      // 비밀번호 재설정: code 교환 후 /auth/reset으로
      if (type === 'recovery' && code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {})
        window.location.href = '/auth/reset'
        return
      }

      // PKCE code가 있으면 교환 시도
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (data.session) {
          await redirectForSession(data.session)
          return
        }
        if (error) {
          // PKCE verifier 누락 등 교환 실패 → 기존 세션 확인
          const { data: { session } } = await supabase.auth.getSession()
          if (session) { await redirectForSession(session); return }
          setErrMsg('로그인에 실패했어요. 다시 시도해주세요.')
          setTimeout(() => { window.location.href = '/login' }, 2000)
          return
        }
      }

      // code 없을 때 (implicit flow 또는 이미 세션 있을 때)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { await redirectForSession(session); return }

      window.location.href = '/login'
    }

    run()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-white/40 text-sm">{errMsg || '로그인 처리 중...'}</p>
    </div>
  )
}
