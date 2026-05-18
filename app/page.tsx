'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Root() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      supabase.from('accounts').select('status').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
        if (!data) { router.replace('/signup/complete'); return }
        if (data.status === 'pending') { router.replace('/pending'); return }
        router.replace('/book')
      })
    })
  }, [router])

  return <div className="min-h-screen bg-[#0a0a0a]" />
}
