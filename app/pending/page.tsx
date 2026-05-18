'use client'

import { supabase } from '@/lib/supabase'

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 text-center">
      <div>
        <div className="text-5xl mb-5">⏳</div>
        <h2 className="text-xl font-black text-white mb-3">승인 대기 중</h2>
        <p className="text-white/50 text-sm leading-relaxed">
          관리자가 가입을 승인하면<br />
          이용하실 수 있어요.
        </p>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
          className="mt-8 text-white/30 text-sm hover:text-white/60">
          로그아웃
        </button>
      </div>
    </div>
  )
}
