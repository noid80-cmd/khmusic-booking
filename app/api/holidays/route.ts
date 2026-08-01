import { NextResponse } from 'next/server'

// 구글 공개 "대한민국 휴일" 캘린더 — API 키 없이 누구나 접근 가능한 ICS 피드.
// 설날/추석/신정(새해첫날)/크리스마스는 본관 완전 휴무, 나머지 법정공휴일(대체공휴일
// 포함)은 토요일과 같은 단축 운영(11~19시)으로 분류한다.
//
// 주의: 이 피드에는 식목일·노동절·어버이날·스승의날·제헌절·국군의날·선거일·
// 크리스마스 이브·섣달그믐 등 실제 관공서 휴일이 아닌 기념일도 함께 들어있어서
// 전부 반영하면 안 됨 — 아래 화이트리스트에 있는 이름만 공휴일로 인정한다.
// 대체공휴일은 "쉬는 날 OOO" 형태로 오므로 접두사를 떼고 같은 화이트리스트로 판별.
const ICS_URL = 'https://calendar.google.com/calendar/ical/ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics'
const SUBSTITUTE_PREFIX = '쉬는 날 '
const FULL_CLOSURE_NAMES = new Set(['새해첫날', '설날', '설날 연휴', '추석', '추석 연휴', '크리스마스'])
const SHORT_HOURS_NAMES = new Set(['삼일절', '어린이날', '부처님오신날', '현충일', '광복절', '개천절', '한글날'])

function parseIcsDates(ics: string): { date: string; name: string }[] {
  const events: { date: string; name: string }[] = []
  const blocks = ics.split('BEGIN:VEVENT').slice(1)
  for (const block of blocks) {
    const dateMatch = block.match(/DTSTART;VALUE=DATE:(\d{8})/)
    const nameMatch = block.match(/SUMMARY:(.+)/)
    if (!dateMatch || !nameMatch) continue
    const raw = dateMatch[1]
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    events.push({ date, name: nameMatch[1].trim() })
  }
  return events
}

export async function GET() {
  try {
    const res = await fetch(ICS_URL, { next: { revalidate: 60 * 60 * 24 } })
    if (!res.ok) throw new Error(`ics fetch failed: ${res.status}`)
    const ics = await res.text()
    const events = parseIcsDates(ics)

    const closed = new Set<string>()
    const short = new Set<string>()
    for (const { date, name } of events) {
      const base = name.startsWith(SUBSTITUTE_PREFIX) ? name.slice(SUBSTITUTE_PREFIX.length) : name
      if (FULL_CLOSURE_NAMES.has(base)) closed.add(date)
      else if (SHORT_HOURS_NAMES.has(base)) short.add(date)
    }

    return NextResponse.json({ closed: [...closed], short: [...short] })
  } catch {
    return NextResponse.json({ closed: [], short: [], error: true })
  }
}
