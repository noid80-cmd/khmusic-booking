'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    // implicit flow: 토큰이 URL hash에 자동으로 들어옴
    // onAuthStateChange로 세션 감지 후 이동
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = '/'
      }
    })

    // 이미 세션이 있으면 바로 이동
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/'
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-white/40 text-sm">로그인 처리 중...</p>
    </div>
  )
}
