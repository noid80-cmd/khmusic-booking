import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPER_ADMIN = 'noid80@hanmail.net'

export async function POST(req: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'service key 없음' }, { status: 500 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 요청자 세션 확인
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token)
  if (!caller) return NextResponse.json({ error: '인증 실패' }, { status: 401 })

  // 어드민 확인
  const { data: adminRecord } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('user_id', caller.id)
    .maybeSingle()

  const isSuperAdmin = caller.email === SUPER_ADMIN
  if (!adminRecord && !isSuperAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { authUserId } = await req.json()
  if (!authUserId) return NextResponse.json({ error: 'authUserId 필요' }, { status: 400 })

  // Auth 유저 삭제 (accounts 테이블은 cascade로 자동 삭제)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
