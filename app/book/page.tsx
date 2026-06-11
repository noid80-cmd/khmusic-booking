'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, Room, Booking } from '@/lib/supabase'

function fmt(h: number) { return `${h}:00` }
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function todayStr() { return localDateStr(new Date()) }

const MAIN_CLOSED = new Set([
  '2025-01-01','2026-01-01','2027-01-01',
  '2025-01-28','2025-01-29','2025-01-30',
  '2026-02-16','2026-02-17','2026-02-18',
  '2025-10-05','2025-10-06','2025-10-07',
  '2026-09-24','2026-09-25','2026-09-26',
  '2025-12-25','2026-12-25','2027-12-25',
])

function getHours(date: string, building: 'main' | 'annex'): number[] | null {
  if (building === 'annex') return Array.from({ length: 11 }, (_, i) => i + 11)
  const day = new Date(date + 'T00:00:00').getDay()
  if (day === 0 || MAIN_CLOSED.has(date)) return null
  if (day === 6) return Array.from({ length: 8 }, (_, i) => i + 11)
  return Array.from({ length: 11 }, (_, i) => i + 11)
}

function shortName(name: string) {
  return name
    .replace('GUITAR & BASS', 'G&B')
    .replace('ENSEMBLE ROOM', 'ENS')
    .replace('PIANO', 'P')
    .replace('MIDI', 'M')
    .replace('DRUMS', 'DR')
}

function getRoomSoftware(name: string): string {
  if (name === 'MIDI 1' || name === 'MIDI 2') return 'Logic · Ableton'
  if (name === 'MIDI 3') return 'Ableton · Cubase'
  if (name === 'MIDI 4') return 'Ableton'
  return ''
}

function getRoomColor(name: string) {
  if (name.startsWith('PIANO'))   return { bg: '#eef2ff', border: '#c7d2fe', text: '#6366f1' }
  if (name.startsWith('MIDI'))    return { bg: '#ecfeff', border: '#a5f3fc', text: '#0891b2' }
  if (name.startsWith('GUITAR'))  return { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c' }
  if (name.startsWith('DRUMS') || name === '소극장' || name === '녹음실' || name.startsWith('ENSEMBLE'))
                                  return { bg: '#fff1f2', border: '#fecdd3', text: '#e11d48' }
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' }
}

function typeLabel(t: string | null) {
  if (t === 'exam') return '입시반'
  if (t === 'audition') return '오디션반'
  if (t === 'professional') return '전문반'
  if (t === 'admin') return '관리자'
  return '취미반'
}

export default function BookPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [building, setBuilding] = useState<'main' | 'annex'>('main')
  const [roomType, setRoomType] = useState<'piano' | 'midi' | 'guitar' | 'etc'>('piano')
  const [date, setDate] = useState(todayStr())
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<(Booking & { account?: { name: string } | null })[]>([])
  const [classes, setClasses] = useState<{ id: string, room_id: string, start_hour: number, end_hour: number, instructor: string }[]>([])
  const [myBookings, setMyBookings] = useState<(Booking & { room: Room })[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [now, setNow] = useState(new Date())
  const [adminModal, setAdminModal] = useState<{ roomId: string, hour: number } | null>(null)
  const [adminName, setAdminName] = useState('')
  const [adminIsClass, setAdminIsClass] = useState(false)
  const [adminEndHour, setAdminEndHour] = useState(12)
  const [studentModal, setStudentModal] = useState<{ roomId: string, hour: number } | null>(null)
  const [studentEndHour, setStudentEndHour] = useState(12)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      supabase.from('accounts').select('*').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
        if (!data || data.status !== 'approved') { window.location.href = '/pending'; return }
        setAccount(data)
      })
    })
  }, [])

  useEffect(() => {
    if (!account) return
    loadData()
  }, [account, building, date])

  async function loadData() {
    setLoading(true)
    const [roomsRes, bookingsRes, classesRes, myRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('building', building).eq('is_active', true).order('display_order'),
      supabase.from('bookings').select('*, account:accounts(name)').eq('date', date).in('room_id',
        (await supabase.from('rooms').select('id').eq('building', building)).data?.map(r => r.id) || []
      ),
      supabase.from('class_schedules').select('*').eq('date', date),
      supabase.from('bookings').select('*, room:rooms(*)').eq('account_id', account!.id).gte('date', todayStr()).order('date').order('start_hour'),
    ])
    setRooms(roomsRes.data || [])
    setBookings(bookingsRes.data || [])
    setClasses((classesRes as { data: { id: string, room_id: string, start_hour: number, end_hour: number, instructor: string }[] | null }).data || [])
    setMyBookings((myRes.data || []) as (Booking & { room: Room })[])
    setLoading(false)
  }

  function canBook(roomId: string, hour: number): boolean {
    if (!account) return false
    if (rooms.find(r => r.id === roomId)?.is_locked) return false
    if (account.student_type === 'admin') return true
    const isToday = date === todayStr()
    if (account.student_type === 'hobby') {
      if (date !== todayStr()) return false
      if (myBookings.filter(b => b.date === date).length > 0) return false
      const curHour = now.getHours()
      const curMin = now.getMinutes()
      if (curHour < 10 || (curHour === 10 && curMin < 50)) return false
      return hour > curHour || (hour === curHour && curMin < 50)
    }
    if (!isToday) return false
    const curHour = now.getHours()
    const curMin = now.getMinutes()
    if (curHour < 10 || (curHour === 10 && curMin < 50)) return false
    if (myBookings.some(b => b.date === date && b.start_hour === hour)) return false
    if (building === 'annex' && (account.student_type === 'exam' || account.student_type === 'audition')) {
      return hour > curHour || (hour === curHour && curMin < 50)
    }
    const todayCount = myBookings.filter(b => b.date === date).length
    const effectiveHour = curMin >= 50 ? curHour + 1 : curHour
    const active = myBookings.find(b => b.date === date && b.start_hour === effectiveHour)
    if (active) {
      if (todayCount < 2) return hour === effectiveHour + 1
      return curMin >= 50 && hour === effectiveHour + 1
    }
    return hour === effectiveHour
  }

  function getBooking(roomId: string, hour: number) {
    return bookings.find(b => b.room_id === roomId && b.start_hour === hour)
  }

  function getClass(roomId: string, hour: number) {
    return classes.find(c => c.room_id === roomId && c.start_hour <= hour && hour < c.end_hour)
  }

  function getAvailableEndHours(roomId: string, startHour: number): number[] {
    const results: number[] = []
    for (let endH = startHour + 1; endH <= 22; endH++) {
      if (endH - 1 > startHour && (getBooking(roomId, endH - 1) || getClass(roomId, endH - 1))) break
      results.push(endH)
    }
    return results
  }

  async function handleBook(roomId: string, hour: number) {
    if (!account || !canBook(roomId, hour)) return
    if (getBooking(roomId, hour)) return
    if (account.student_type === 'admin') {
      setAdminName('')
      setAdminIsClass(false)
      setAdminEndHour(hour + 1)
      setAdminModal({ roomId, hour })
      return
    }
    setStudentEndHour(hour + 1)
    setStudentModal({ roomId, hour })
  }

  async function handleStudentConfirm() {
    if (!studentModal || !account) return
    const { roomId, hour } = studentModal
    setStudentModal(null)
    setBooking(true)
    for (let h = hour; h < studentEndHour; h++) {
      const { error } = await supabase.from('bookings').insert({
        account_id: account.id, room_id: roomId, date,
        start_hour: h, end_hour: h + 1, booking_type: 'student',
      })
      if (error) { alert('예약에 실패했어요. 다른 분이 먼저 예약했을 수 있어요.'); break }
    }
    await loadData()
    setBooking(false)
  }

  async function handleCancel(bookingId: string) {
    const target = myBookings.find(b => b.id === bookingId) ?? bookings.find(b => b.id === bookingId)
    if (!target) return
    const sourceList = myBookings.some(b => b.id === bookingId)
      ? myBookings
      : target.account_id
        ? bookings.filter(b => b.account_id === target.account_id)
        : [target]
    const toCancel: string[] = [bookingId]
    let next = target.start_hour + 1
    while (true) {
      const found = sourceList.find(b => b.date === target.date && b.start_hour === next)
      if (!found) break
      toCancel.push(found.id)
      next++
    }
    const msg = toCancel.length > 1 ? `${toCancel.length}개 예약이 연속으로 취소됩니다. 취소할까요?` : '예약을 취소할까요?'
    if (!confirm(msg)) return
    await supabase.from('bookings').delete().in('id', toCancel)
    await loadData()
  }

  async function handleAdminConfirm() {
    if (!adminModal || !adminName.trim()) return
    const { roomId, hour } = adminModal
    const isClass = adminIsClass && isMain
    setAdminModal(null)
    setBooking(true)
    if (isClass) {
      const { error } = await supabase.from('class_schedules').insert({
        room_id: roomId, date, start_hour: hour, end_hour: adminEndHour, instructor: adminName.trim()
      })
      if (error) alert('수업 등록 실패: ' + error.message)
    } else {
      for (let h = hour; h < adminEndHour; h++) {
        const { error } = await supabase.from('bookings').insert({
          account_id: null, room_id: roomId, date,
          start_hour: h, end_hour: h + 1,
          booking_type: 'external', external_name: adminName.trim(),
        })
        if (error) { alert('예약 실패: ' + error.message); break }
      }
    }
    await loadData()
    setBooking(false)
  }

  async function handleDeleteClass(classId: string, instructor: string) {
    if (!confirm(`"${instructor}" 수업을 삭제할까요?`)) return
    await supabase.from('class_schedules').delete().eq('id', classId)
    await loadData()
  }

  const isExam = account?.student_type === 'exam' || account?.student_type === 'audition' || account?.student_type === 'professional' || account?.student_type === 'admin'
  const currentHour = now.getHours()
  const isMain = building === 'main'
  const operatingHours = getHours(date, building)

  const color = isMain
    ? { primary: '#6366f1', bookableBg: '#e0e7ff', bookableBorder: '#a5b4fc', bookableHotBg: '#c7d2fe', bookableHotBorder: '#818cf8', text: '#4f46e5', mineBg: '#6366f1', mineBorder: '#4f46e5' }
    : { primary: '#16a34a', bookableBg: '#dcfce7', bookableBorder: '#86efac', bookableHotBg: '#bbf7d0', bookableHotBorder: '#4ade80', text: '#15803d', mineBg: '#22c55e', mineBorder: '#16a34a' }

  const mainRoomTypes = [
    { key: 'piano',  label: '피아노',     color: '#6366f1', dimColor: '#a8a8cc', activeBg: '#eef2ff', activeBorder: '#c7d2fe', dimBorder: '#ebebf5', filter: (r: Room) => r.name.startsWith('PIANO') },
    { key: 'midi',   label: 'MIDI',       color: '#0891b2', dimColor: '#88b0c0', activeBg: '#ecfeff', activeBorder: '#a5f3fc', dimBorder: '#ebebf5', filter: (r: Room) => r.name.startsWith('MIDI') },
    { key: 'guitar', label: '기타&베이스', color: '#ea580c', dimColor: '#c8a088', activeBg: '#fff7ed', activeBorder: '#fed7aa', dimBorder: '#ebebf5', filter: (r: Room) => r.name.startsWith('GUITAR') },
    { key: 'etc',    label: '드럼&그외',   color: '#e11d48', dimColor: '#c89098', activeBg: '#fff1f2', activeBorder: '#fecdd3', dimBorder: '#ebebf5', filter: (r: Room) => r.name.startsWith('DRUMS') || r.name === '소극장' || r.name === '녹음실' || r.name.startsWith('ENSEMBLE') },
  ] as const

  const filteredRooms = building === 'annex' ? rooms : rooms.filter(
    mainRoomTypes.find(t => t.key === roomType)?.filter ?? (() => true)
  )

  // badge style per student type
  const typeBadgeStyle = {
    exam:         { bg: '#eef2ff', color: '#6366f1' },
    audition:     { bg: '#fefce8', color: '#d97706' },
    professional: { bg: '#f0fdf4', color: '#16a34a' },
    admin:        { bg: '#fff7ed', color: '#ea580c' },
    hobby:        { bg: '#faf5ff', color: '#9333ea' },
  }
  const badgeStyle = typeBadgeStyle[account?.student_type ?? 'hobby'] ?? typeBadgeStyle.hobby

  if (!account) return <div className="min-h-screen" style={{ background: '#f0f0f8' }} />

  return (
    <>
    <div className="min-h-screen pb-28" style={{ background: '#f0f0f8' }}>

      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-20" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid #e8e8f2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* 상단: 브랜드 + 로그아웃 */}
        <div className="hdr-brand-row flex items-center justify-between"
          style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f8' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="/logo.png" alt="KH Music" className="hdr-logo rounded-2xl object-cover"
                style={{ width: 48, height: 48, boxShadow: '0 4px 16px rgba(99,102,241,0.2)' }} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: '#22c55e' }} />
            </div>
            <div>
              <p className="hdr-title font-black leading-none tracking-tight" style={{ color: '#1e1b4b', fontSize: 20 }}>연습실 예약</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-[13px] font-semibold" style={{ color: '#6b6b9a' }}>{account.name}</p>
                <span style={{ color: '#c0c0d8', fontSize: 10 }}>·</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
                  {typeLabel(account.student_type)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {account.student_type === 'admin' && (
              <button onClick={() => window.location.href = '/admin'}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition"
                style={{ color: '#6366f1', background: '#eef2ff', borderColor: '#c7d2fe' }}>
                관리자
              </button>
            )}
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg border transition"
              style={{ color: '#a0a0c0', background: '#f5f5fb', borderColor: '#e8e8f2' }}>
              로그아웃
            </button>
          </div>
        </div>

        {/* 필터 탭 — 좁게 중앙 정렬 */}
        <div className="hdr-filter-wrap" style={{ maxWidth: 700, margin: '0 auto', padding: '10px 16px 8px' }}>

          {/* 건물 탭 */}
          <div className="flex gap-3">
            {(['main', 'annex'] as const).filter(b => b === 'main' || account.student_type === 'exam' || account.student_type === 'audition' || account.student_type === 'admin').map(b => {
              const active = building === b
              const c = b === 'main'
                ? { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' }
                : { color: '#16a34a', bg: '#f0fdf4', border: '#86efac' }
              return (
                <button key={b} onClick={() => setBuilding(b)}
                  className="hdr-tab-btn flex-1 rounded-2xl text-base font-black transition-all border"
                  style={{
                    paddingTop: 10, paddingBottom: 10,
                    background: active ? c.bg : '#ffffff',
                    color: active ? c.color : '#a0a0c0',
                    borderColor: active ? c.border : '#e8e8f2',
                    boxShadow: active ? `0 4px 14px ${b === 'main' ? 'rgba(99,102,241,0.18)' : 'rgba(22,163,74,0.18)'}` : '0 1px 3px rgba(0,0,0,0.04)',
                    letterSpacing: '0.05em',
                  }}>
                  {b === 'main' ? '본관' : '별관'}
                </button>
              )
            })}
          </div>

          {/* 방 종류 탭 (본관만) */}
          {building === 'main' && (
            <div className="flex gap-2" style={{ marginTop: 8 }}>
              {mainRoomTypes.map(t => {
                const active = roomType === t.key
                return (
                  <button key={t.key} onClick={() => setRoomType(t.key)}
                    className="hdr-sub-tab-btn flex-1 rounded-xl text-[13px] font-bold transition-all border"
                    style={{
                      paddingTop: 8, paddingBottom: 8,
                      background: active ? t.activeBg : '#ffffff',
                      color: active ? t.color : t.dimColor,
                      borderColor: active ? t.activeBorder : t.dimBorder,
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    }}>
                    {t.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        </div>{/* /maxWidth wrapper */}
      </div>

      <div className="pt-5 space-y-4" style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 0' }}>

        {/* 날짜 */}
        {account.student_type === 'admin' ? (
          <div style={{ display: 'flex', alignItems: 'center', maxWidth: 700, margin: '0 auto', gap: 8 }}>
            <button
              onClick={() => {
                const d = new Date(date + 'T00:00:00')
                d.setDate(d.getDate() - 1)
                const prev = localDateStr(d)
                if (prev >= todayStr()) setDate(prev)
              }}
              disabled={date <= todayStr()}
              className="rounded-xl border transition"
              style={{
                padding: '12px 18px', fontSize: 20, lineHeight: 1, fontFamily: 'inherit',
                background: '#ffffff', borderColor: '#e4e4ef',
                color: date <= todayStr() ? '#c0c0d8' : '#1e1b4b',
                cursor: date <= todayStr() ? 'default' : 'pointer', flexShrink: 0,
              }}
            >‹</button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              min={todayStr()}
              className="rounded-xl focus:outline-none transition border"
              style={{ flex: 1, minWidth: 0, padding: '12px 16px', fontSize: 15, fontFamily: 'inherit', background: '#ffffff', borderColor: '#e4e4ef', color: '#1e1b4b', colorScheme: 'light' }} />
            <button
              onClick={() => {
                const d = new Date(date + 'T00:00:00')
                d.setDate(d.getDate() + 1)
                setDate(localDateStr(d))
              }}
              className="rounded-xl border transition"
              style={{
                padding: '12px 18px', fontSize: 20, lineHeight: 1, fontFamily: 'inherit',
                background: '#ffffff', borderColor: '#e4e4ef', color: '#1e1b4b',
                cursor: 'pointer', flexShrink: 0,
              }}
            >›</button>
          </div>
        ) : (
          <input type="date" value={date} readOnly
            className="rounded-xl border"
            style={{ display: 'block', width: '100%', maxWidth: 700, margin: '0 auto', padding: '12px 16px', fontSize: 15, fontFamily: 'inherit', background: '#f5f5fb', borderColor: '#e4e4ef', color: '#1e1b4b', colorScheme: 'light' }} />
        )}

        {/* 안내 */}
        {isExam && account.student_type !== 'admin' && date === todayStr() && (
          <div className="px-4 py-3 rounded-xl text-xs flex items-center gap-2 border"
            style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#6366f1' }}>
            <span style={{ fontSize: 14 }}>●</span>
            {currentHour < 10 || (currentHour === 10 && now.getMinutes() < 50)
              ? '10:50 이후 예약 가능'
              : myBookings.some(b => b.date === date && b.start_hour === currentHour)
                ? `${currentHour + 1}:00 추가 예약 가능 (하루 최대 2시간)`
                : now.getMinutes() >= 50
                  ? `${currentHour + 1}:00 예약 가능`
                  : `${currentHour}:00 예약 가능`}
          </div>
        )}
        {account.student_type === 'hobby' && (
          <div className="px-4 py-3 rounded-xl text-xs flex items-center gap-2 border"
            style={{ background: '#faf5ff', borderColor: '#e9d5ff', color: '#9333ea' }}>
            <span style={{ fontSize: 14 }}>●</span>
            하루 1시간 · 당일 10:50 이후 예약 가능
          </div>
        )}
        {building === 'annex' && account.student_type !== 'exam' && account.student_type !== 'audition' && account.student_type !== 'admin' && (
          <div className="px-4 py-3.5 rounded-xl text-sm font-semibold text-center flex items-center justify-center gap-2 border"
            style={{ background: '#fff7ed', borderColor: '#fed7aa', color: '#ea580c' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            별관은 입시반·오디션반만 이용 가능해요
          </div>
        )}

        {/* 내 예약 */}
        {myBookings.length > 0 && (
          <div>
            <p className="text-[11px] font-bold mb-2 uppercase tracking-widest" style={{ color: '#b0b0cc' }}>
              내 예약
            </p>
            <div className="space-y-2">
              {myBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-white border"
                  style={{ borderColor: '#e8e8f2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-[2px] h-8 rounded-full" style={{ background: color.primary }} />
                    <div>
                      <p className="text-sm font-semibold leading-none" style={{ color: '#1e1b4b' }}>{(b.room as Room).name}</p>
                      <p className="text-[11px] mt-1" style={{ color: '#a0a0c0' }}>
                        {b.date} · {fmt(b.start_hour)} ~ {fmt(b.end_hour)}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleCancel(b.id)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition border"
                    style={{ color: '#ef4444', background: '#fef2f2', borderColor: '#fecaca' }}>
                    취소
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 예약 그리드 */}
        {loading ? (
          <div className="text-center py-20 text-sm" style={{ color: '#c0c0d8' }}>불러오는 중...</div>
        ) : operatingHours === null ? (
          <div className="py-16 text-center rounded-2xl bg-white border" style={{ borderColor: '#e8e8f2' }}>
            <p className="text-2xl mb-3">🔒</p>
            <p className="text-sm font-semibold" style={{ color: '#6b6b9a' }}>
              {building === 'main' ? '본관' : '별관'} 휴무일이에요
            </p>
            <p className="text-xs mt-1" style={{ color: '#b0b0cc' }}>
              {new Date(date + 'T00:00:00').getDay() === 0 ? '일요일은 본관이 운영하지 않아요' : '해당일은 휴무예요'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-bold mb-3 uppercase tracking-widest" style={{ color: '#b0b0cc' }}>
              예약 현황
            </p>
            <div className="overflow-x-auto">
              <div style={{
                display: 'grid',
                gridTemplateColumns: `36px repeat(${filteredRooms.length}, minmax(48px, 1fr))`,
                gap: '3px',
                minWidth: `${filteredRooms.length * 51 + 39}px`,
              }}>

                {/* 헤더 */}
                <div />
                {filteredRooms.map(r => {
                  const rc = getRoomColor(r.name)
                  return (
                    <div key={`hdr-${r.id}`} className="flex flex-col items-center justify-center rounded-lg gap-0.5"
                      style={{
                        height: 44,
                        background: r.is_locked ? '#f5f5fa' : rc.bg,
                        border: `1px solid ${r.is_locked ? '#e0e0ee' : rc.border}`,
                      }}>
                      <span className="text-[10px] font-bold" style={{ color: r.is_locked ? '#c0c0d8' : rc.text, letterSpacing: '0.02em' }}>
                        {r.is_locked ? '🔒' : shortName(r.name)}
                      </span>
                      {r.is_locked && (
                        <span className="text-[8px]" style={{ color: '#c0c0d8' }}>사용불가</span>
                      )}
                      {!r.is_locked && getRoomSoftware(r.name) && (
                        <span className="text-[8px] font-medium" style={{ color: rc.text, opacity: 0.6 }}>
                          {getRoomSoftware(r.name)}
                        </span>
                      )}
                    </div>
                  )
                })}

                {/* 셀 */}
                {operatingHours.flatMap(h => {
                  const isCurrent = h === currentHour && date === todayStr()
                  return [
                    <div key={`t-${h}`} className="flex items-center justify-end pr-2">
                      <span className="text-[11px] font-bold" style={{ color: isCurrent ? color.primary : '#a0a0c0' }}>
                        {h}
                      </span>
                    </div>,
                    ...filteredRooms.map(r => {
                      const cls = getClass(r.id, h)
                      const bk = getBooking(r.id, h)
                      const isMine = bk?.account_id === account.id
                      const bookable = canBook(r.id, h)
                      const restricted = building === 'annex' && account.student_type !== 'exam' && account.student_type !== 'audition' && account.student_type !== 'admin'

                      if (cls) {
                        if (account.student_type === 'admin') return (
                          <button key={`${h}-${r.id}`} onClick={() => handleDeleteClass(cls.id, cls.instructor)}
                            className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                            style={{ background: '#fde8ef', border: '1px solid #fca5b8' }}>
                            <span className="text-[9px] font-semibold truncate px-1.5" style={{ color: '#e11d48' }}>
                              {cls.instructor}
                            </span>
                          </button>
                        )
                        return (
                          <div key={`${h}-${r.id}`} className="h-11 rounded-lg flex items-center justify-center"
                            style={{ background: '#fde8ef', border: '1px solid #fecdd3' }}>
                            <span className="text-[9px] font-semibold truncate px-1.5" style={{ color: '#e11d48', opacity: 0.8 }}>
                              {cls.instructor}
                            </span>
                          </div>
                        )
                      }

                      if (isMine) return (
                        <button key={`${h}-${r.id}`} onClick={() => handleCancel(bk!.id)}
                          className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                          style={{ background: color.mineBg, border: `2px solid ${color.mineBorder}` }}>
                          <span className="text-[9px] font-bold truncate px-1.5" style={{ color: 'white' }}>
                            {account.student_type === 'admin' ? 'X' : account.name}
                          </span>
                        </button>
                      )

                      if (bk) {
                        if (bk.booking_type === 'blocked') return (
                          <div key={`${h}-${r.id}`} className="h-11 rounded-lg flex items-center justify-center"
                            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                            <span style={{ fontSize: 11 }}>🔒</span>
                          </div>
                        )
                        if (account.student_type === 'admin') return (
                          <button key={`${h}-${r.id}`} onClick={() => handleCancel(bk.id)}
                            className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                            style={{ background: '#f1f5f9', border: '1px solid #94a3b8' }}>
                            <span className="text-[9px] font-medium truncate px-1.5" style={{ color: '#475569' }}>
                              {bk.external_name ?? bk.account?.name ?? '?'}
                            </span>
                          </button>
                        )
                        return (
                          <div key={`${h}-${r.id}`} className="h-11 rounded-lg flex items-center justify-center"
                            style={{ background: '#f1f5f9', border: '1px solid #94a3b8' }}>
                            <span className="text-[9px] font-medium truncate px-1.5" style={{ color: '#64748b' }}>
                              {bk.external_name ?? bk.account?.name ?? ''}
                            </span>
                          </div>
                        )
                      }

                      if (restricted || !bookable) return (
                        <div key={`${h}-${r.id}`} className="h-11 rounded-lg"
                          style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }} />
                      )

                      return (
                        <button key={`${h}-${r.id}`} onClick={() => handleBook(r.id, h)} disabled={booking}
                          className="h-11 rounded-lg flex items-center justify-center transition active:scale-95 disabled:opacity-40"
                          style={{
                            background: isCurrent ? color.bookableHotBg : color.bookableBg,
                            border: `1px solid ${isCurrent ? color.bookableHotBorder : color.bookableBorder}`,
                          }}>
                          <span className="text-[14px] font-light" style={{ color: color.text }}>+</span>
                        </button>
                      )
                    }),
                  ]
                })}
              </div>
            </div>

            {/* 별관 현관 비밀번호 */}
            {building === 'annex' && (
              <div className="mt-5 px-5 py-4 rounded-2xl flex items-center gap-3 border"
                style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                <span style={{ fontSize: 20 }}>🔐</span>
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: '#16a34a', opacity: 0.7 }}>별관 현관 비밀번호</p>
                  <p className="text-lg font-black tracking-widest" style={{ color: '#16a34a' }}>2094*</p>
                </div>
              </div>
            )}

            {/* 범례 */}
            <div className="flex gap-3 mt-4 flex-wrap px-1">
              {[
                { bg: color.bookableBg, border: color.bookableBorder, label: '예약 가능', textColor: color.text },
                { bg: color.mineBg, border: color.mineBorder, label: '내 예약', textColor: 'white' },
                { bg: '#f1f5f9', border: '#94a3b8', label: '예약됨', textColor: '#64748b' },
                { bg: '#fde8ef', border: '#fca5b8', label: '수업', textColor: '#e11d48' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border"
                  style={{ borderColor: '#e8e8f2' }}>
                  <div className="w-3 h-3 rounded-[3px] border" style={{ background: item.bg, borderColor: item.border }} />
                  <span className="text-[11px] font-medium" style={{ color: '#9898b8' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>

    {adminModal && (() => {
      const isClass = adminIsClass && isMain
      const endHours = getAvailableEndHours(adminModal.roomId, adminModal.hour)
      return (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(30,27,75,0.25)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAdminModal(null) }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 20, width: '100%', maxWidth: 320, boxShadow: '0 25px 50px rgba(0,0,0,0.12)', border: '1px solid #e8e8f2' }}>

            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#b0b0cc' }}>{adminModal.hour}:00</p>

            <input value={adminName} onChange={e => setAdminName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminConfirm()}
              placeholder={isClass ? '강사명' : '이름'}
              autoFocus
              style={{ width: '100%', border: `1px solid ${isClass ? '#fca5b8' : '#e4e4ef'}`, borderRadius: 16, padding: '12px 16px', fontSize: 15, outline: 'none', marginBottom: 12, color: '#1e1b4b', boxSizing: 'border-box' }} />

            {isMain && (
              <button onClick={() => setAdminIsClass(!adminIsClass)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, marginBottom: 12, border: `1px solid ${adminIsClass ? '#fca5b8' : '#ebebf5'}`, background: adminIsClass ? '#fde8ef' : '#f8f8fc', cursor: 'pointer' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: adminIsClass ? '#e11d48' : '#a0a0c0' }}>수업</span>
                <div style={{ borderRadius: 999, position: 'relative', background: adminIsClass ? '#fca5b8' : '#e4e4ef', width: 44, height: 24, flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: 2, left: adminIsClass ? 22 : 2, width: 20, height: 20, borderRadius: 999, background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
                </div>
              </button>
            )}

            <select value={adminEndHour} onChange={e => setAdminEndHour(Number(e.target.value))}
              style={{ width: '100%', border: `1px solid ${isClass ? '#fca5b8' : '#e4e4ef'}`, borderRadius: 16, padding: '12px 16px', fontSize: 14, outline: 'none', marginBottom: 12, color: isClass ? '#e11d48' : '#6366f1', background: isClass ? '#fde8ef' : '#eef2ff', colorScheme: 'light', cursor: 'pointer', boxSizing: 'border-box' }}>
              {endHours.map(h => <option key={h} value={h}>{h}:00 까지</option>)}
            </select>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAdminModal(null)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 600, fontSize: 14, border: '1px solid #e8e8f2', background: '#f5f5fb', color: '#a0a0c0', cursor: 'pointer' }}>취소</button>
              <button onClick={handleAdminConfirm} disabled={!adminName.trim()}
                style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 700, fontSize: 14, color: 'white', border: 'none', cursor: 'pointer', opacity: adminName.trim() ? 1 : 0.4, background: isClass ? 'linear-gradient(135deg,#f43f5e,#e11d48)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {isClass ? '수업 등록' : '예약'}
              </button>
            </div>
          </div>
        </div>
      )
    })()}

    {studentModal && (() => {
      const todayBooked = myBookings.filter(b => b.date === date).length
      const maxHours = account?.student_type === 'hobby' ? 1 : Math.max(1, 2 - todayBooked)
      const endHours = getAvailableEndHours(studentModal.roomId, studentModal.hour).slice(0, maxHours)
      return (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(30,27,75,0.25)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setStudentModal(null) }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 20, width: '100%', maxWidth: 320, boxShadow: '0 25px 50px rgba(0,0,0,0.12)', border: '1px solid #e8e8f2' }}>

            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#b0b0cc' }}>{studentModal.hour}:00</p>

            {endHours.length > 1 ? (
              <select value={studentEndHour} onChange={e => setStudentEndHour(Number(e.target.value))}
                style={{ width: '100%', border: `1px solid ${isMain ? '#a5b4fc' : '#86efac'}`, borderRadius: 16, padding: '12px 16px', fontSize: 14, outline: 'none', marginBottom: 12, color: isMain ? '#6366f1' : '#16a34a', background: isMain ? '#eef2ff' : '#f0fdf4', colorScheme: 'light', cursor: 'pointer', boxSizing: 'border-box' }}>
                {endHours.map(h => <option key={h} value={h}>{h}:00 까지</option>)}
              </select>
            ) : (
              <p style={{ fontSize: 15, fontWeight: 600, color: isMain ? '#6366f1' : '#16a34a', marginBottom: 12, padding: '12px 16px', background: isMain ? '#eef2ff' : '#f0fdf4', borderRadius: 16 }}>
                {(endHours[0] ?? studentModal.hour + 1)}:00 까지
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStudentModal(null)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 600, fontSize: 14, border: '1px solid #e8e8f2', background: '#f5f5fb', color: '#a0a0c0', cursor: 'pointer' }}>취소</button>
              <button onClick={handleStudentConfirm}
                style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 700, fontSize: 14, color: 'white', border: 'none', cursor: 'pointer', background: isMain ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#16a34a,#22c55e)' }}>
                예약
              </button>
            </div>
          </div>
        </div>
      )
    })()}
    </>
  )
}
