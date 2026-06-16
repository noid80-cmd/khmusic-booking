import { NextResponse } from 'next/server'

const BOT_TOKEN = '8844510756:AAEmttbeJQTNvy-HOWd77F4lvN0Cy4pi2xA'
const CHAT_ID = '8940756620'

export async function POST(req: Request) {
  const { name, email, phone } = await req.json()

  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const time = kst.toISOString().replace('T', ' ').slice(0, 16)

  const text = [
    '🔔 새 회원가입 신청',
    `이름: ${name}`,
    `이메일: ${email}`,
    phone ? `연락처: ${phone}` : null,
    `시간: ${time} KST`,
    `앱: KH Music 연습실`,
  ].filter(Boolean).join('\n')

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  })

  return NextResponse.json({ ok: true })
}
