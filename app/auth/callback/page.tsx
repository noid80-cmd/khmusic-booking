'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }
      // onAuthStateChange가 세션 감지할 때까지 잠깐 대기
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = '/'
      } else {
        // 세션이 없으면 1초 후 재시도
        setTimeout(async () => {
          const { data: { session: s2 } } = await supabase.auth.getSession()
          window.location.href = s2 ? '/' : '/login'
        }, 1000)
      }
    }
    run()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-white/40 text-sm">로그인 처리 중...</p>
    </div>
  )
}
