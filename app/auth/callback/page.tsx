'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    const run = async () => {
      // PKCE: URL에 code 파라미터가 있는 경우
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => {})
      }

      // 세션 확인 (최대 5초 대기)
      for (let i = 0; i < 10; i++) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          window.location.href = '/'
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
