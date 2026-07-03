'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const type = params.get('type')

      // PKCE: URL에 code 파라미터가 있는 경우
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {})
      }

      // 비밀번호 재설정 플로우 → /auth/reset으로 이동
      if (type === 'recovery') {
        window.location.href = '/auth/reset'
        return
      }

      // 세션 확인 (최대 5초 대기)
      for (let i = 0; i < 10; i++) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data } = await supabase.from('accounts').select('id').eq('user_id', session.user.id).maybeSingle()
          if (data) { window.location.href = '/'; return }
          const { data: adminData } = await supabase.from('admins').select('id')
            .or(`email.eq.${session.user.email},user_id.eq.${session.user.id}`).maybeSingle()
          window.location.href = adminData ? '/admin' : '/signup/complete'
          return
        }
        await new Promise(r => setTimeout(r, 500))
      }

      // 5초 후에도 세션 없으면 로그인 페이지로
      window.location.href = '/login'
    }
    run()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-white/40 text-sm">로그인 처리 중...</p>
    </div>
  )
}
