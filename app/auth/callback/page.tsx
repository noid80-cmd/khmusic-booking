'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        window.location.href = '/'
      })
    } else {
      window.location.href = '/'
    }
  }, [])

  return <div className="min-h-screen bg-[#0a0a0a]" />
}
