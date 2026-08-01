'use client'

import { useEffect, useState } from 'react'

export type HolidaySets = { closed: Set<string>; short: Set<string> }

const CACHE_KEY = 'kh-holidays-cache-v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const EMPTY: HolidaySets = { closed: new Set(), short: new Set() }

function readCache(): HolidaySets | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { closed: string[]; short: string[]; savedAt: number }
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null
    return { closed: new Set(parsed.closed), short: new Set(parsed.short) }
  } catch {
    return null
  }
}

function writeCache(data: { closed: string[]; short: string[] }) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }))
  } catch { /* non-critical */ }
}

// 공휴일 목록을 구글 공개 캘린더에서 자동으로 받아온다(수동 날짜 관리 불필요).
// 실패하면 이전에 캐시된 값(있다면)을 그대로 쓰고, 아예 없으면 빈 값(=휴일 없음으로
// 취급, 평소처럼 정상 운영)으로 안전하게 fallback.
export function useHolidays(): HolidaySets {
  const [holidays, setHolidays] = useState<HolidaySets>(() => readCache() ?? EMPTY)

  useEffect(() => {
    fetch('/api/holidays')
      .then(res => res.json())
      .then((data: { closed: string[]; short: string[]; error?: boolean }) => {
        if (data.error) return
        setHolidays({ closed: new Set(data.closed), short: new Set(data.short) })
        writeCache({ closed: data.closed, short: data.short })
      })
      .catch(() => { /* 캐시된 값 유지 */ })
  }, [])

  return holidays
}

export function getMainHours(date: string, holidays: HolidaySets): number[] | null {
  const day = new Date(date + 'T00:00:00').getDay()
  if (day === 0 || holidays.closed.has(date)) return null
  if (day === 6 || holidays.short.has(date)) return Array.from({ length: 8 }, (_, i) => i + 11)
  return Array.from({ length: 11 }, (_, i) => i + 11)
}

export function getAnnexHours(): number[] {
  return Array.from({ length: 11 }, (_, i) => i + 11)
}
