'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, Room, Booking } from '@/lib/supabase'

function fmt(h: number) { return `${h}:00` }
function todayStr() { return new Date().toISOString().slice(0, 10) }

// 본관 휴무일 (신정·구정연휴·추석연휴·크리스마스)
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
  if (day === 0 || MAIN_CLOSED.has(date)) return null          // 휴무
  if (day === 6) return Array.from({ length: 8 }, (_, i) => i + 11) // 토: 11~18
  return Array.from({ length: 11 }, (_, i) => i + 11)          // 평일: 11~21
}

function shortName(name: string) {
  return name
    .replace('GUITAR & BASS', 'G&B')
    .replace('ENSEMBLE ROOM', 'ENS')
    .replace('PIANO', 'P')
    .replace('MIDI', 'M')
    .replace('DRUMS', 'DR')
}

function getRoomColor(name: string) {
  if (name.startsWith('PIANO'))   return { bg: 'rgba(99,102,241,0.13)',  border: 'rgba(99,102,241,0.28)',  text: '#a5b4fc' }
  if (name.startsWith('MIDI'))    return { bg: 'rgba(6,182,212,0.13)',   border: 'rgba(6,182,212,0.28)',   text: '#67e8f9' }
  if (name.startsWith('GUITAR'))  return { bg: 'rgba(251,146,60,0.13)',  border: 'rgba(251,146,60,0.28)',  text: '#fdba74' }
  if (name.startsWith('DRUMS') || name === '소극장' || name === '녹음실' || name.startsWith('ENSEMBLE'))
                                  return { bg: 'rgba(244,63,94,0.13)',   border: 'rgba(244,63,94,0.28)',   text: '#fda4af' }
  // 별관
  return { bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.28)', text: '#6ee7b7' }
}

function typeLabel(t: string | null) {
  if (t === 'exam') return '입시반'
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
  const [bookings, setBookings] = useState<Booking[]>([])
  const [classes, setClasses] = useState<{ room_id: string, start_hour: number, end_hour: number, instructor: string }[]>([])
  const [myBookings, setMyBookings] = useState<(Booking & { room: Room })[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [now, setNow] = useState(new Date())

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
      supabase.from('bookings').select('*').eq('date', date).in('room_id',
        (await supabase.from('rooms').select('id').eq('building', building)).data?.map(r => r.id) || []
      ),
      building === 'main'
        ? supabase.from('class_schedules').select('*').eq('date', date)
        : Promise.resolve({ data: [] }),
      supabase.from('bookings').select('*, room:rooms(*)').eq('account_id', account!.id).gte('date', todayStr()).order('date').order('start_hour'),
    ])
    setRooms(roomsRes.data || [])
    setBookings(bookingsRes.data || [])
    setClasses((classesRes as { data: { room_id: string, start_hour: number, end_hour: number, instructor: string }[] | null }).data || [])
    setMyBookings((myRes.data || []) as (Booking & { room: Room })[])
    setLoading(false)
  }

  function canBook(roomId: string, hour: number): boolean {
    if (!account) return false
    if (account.student_type === 'admin') return true
    const isToday = date === todayStr()
    if (account.student_type === 'hobby') {
      return myBookings.filter(b => b.date === date).length === 0
    }
    if (!isToday) return false

    const curHour = now.getHours()
    const curMin = now.getMinutes()

    // 10:50 전에는 예약 불가
    if (curHour < 10 || (curHour === 10 && curMin < 50)) return false

    // 같은 시간대 다른 방 중복 예약 불가
    if (myBookings.some(b => b.date === date && b.start_hour === hour)) return false

    // 현재 진행 중인 예약이 있으면 → :50 이후에만 다음 시간 예약 가능
    const active = myBookings.find(b => b.date === date && b.start_hour === curHour)
    if (active) {
      return curMin >= 50 && hour === curHour + 1
    }

    // 첫 예약: 현재 시간 또는 다음 시간만
    return hour === curHour || hour === curHour + 1
  }

  function getBooking(roomId: string, hour: number) {
    return bookings.find(b => b.room_id === roomId && b.start_hour === hour)
  }

  function getClass(roomId: string, hour: number) {
    return classes.find(c => c.room_id === roomId && c.start_hour <= hour && hour < c.end_hour)
  }

  async function handleBook(roomId: string, hour: number) {
    if (!account || !canBook(roomId, hour)) return
    if (getBooking(roomId, hour)) return
    setBooking(true)
    const { error } = await supabase.from('bookings').insert({
      account_id: account.id, room_id: roomId, date,
      start_hour: hour, end_hour: hour + 1, booking_type: 'student',
    })
    if (error) alert('예약에 실패했어요. 다른 분이 먼저 예약했을 수 있어요.')
    await loadData()
    setBooking(false)
  }

  async function handleCancel(bookingId: string) {
    if (!confirm('예약을 취소할까요?')) return
    await supabase.from('bookings').delete().eq('id', bookingId)
    await loadData()
  }

  const isExam = account?.student_type === 'exam' || account?.student_type === 'professional' || account?.student_type === 'admin'
  const currentHour = now.getHours()
  const isMain = building === 'main'
  const operatingHours = getHours(date, building) // null = 휴무

  // 색은 최소화: 포인트 컬러만 정의
  const color = isMain
    ? { primary: '#6366f1', glow: 'rgba(99,102,241,0.25)', bookableBg: 'rgba(99,102,241,0.08)', bookableBorder: 'rgba(99,102,241,0.22)', bookableHotBg: 'rgba(99,102,241,0.14)', bookableHotBorder: 'rgba(99,102,241,0.38)', text: '#a5b4fc' }
    : { primary: '#10b981', glow: 'rgba(16,185,129,0.25)', bookableBg: 'rgba(16,185,129,0.08)', bookableBorder: 'rgba(16,185,129,0.22)', bookableHotBg: 'rgba(16,185,129,0.14)', bookableHotBorder: 'rgba(16,185,129,0.38)', text: '#6ee7b7' }

  const mainRoomTypes = [
    { key: 'piano',  label: '피아노',    color: '#a5b4fc', dimColor: 'rgba(165,180,252,0.45)', activeBg: 'rgba(99,102,241,0.18)',  activeBorder: 'rgba(99,102,241,0.35)',  dimBorder: 'rgba(99,102,241,0.15)',  filter: (r: Room) => r.name.startsWith('PIANO') },
    { key: 'midi',   label: 'MIDI',      color: '#67e8f9', dimColor: 'rgba(103,232,249,0.45)', activeBg: 'rgba(6,182,212,0.18)',   activeBorder: 'rgba(6,182,212,0.35)',   dimBorder: 'rgba(6,182,212,0.15)',   filter: (r: Room) => r.name.startsWith('MIDI') },
    { key: 'guitar', label: '기타&베이스', color: '#fdba74', dimColor: 'rgba(253,186,116,0.45)', activeBg: 'rgba(251,146,60,0.18)',  activeBorder: 'rgba(251,146,60,0.35)',  dimBorder: 'rgba(251,146,60,0.15)',  filter: (r: Room) => r.name.startsWith('GUITAR') },
    { key: 'etc',    label: '드럼&그외',  color: '#fda4af', dimColor: 'rgba(253,164,175,0.45)', activeBg: 'rgba(244,63,94,0.18)',   activeBorder: 'rgba(244,63,94,0.35)',   dimBorder: 'rgba(244,63,94,0.15)',   filter: (r: Room) => r.name.startsWith('DRUMS') || r.name === '소극장' || r.name === '녹음실' || r.name.startsWith('ENSEMBLE') },
  ] as const

  const filteredRooms = building === 'annex' ? rooms : rooms.filter(
    mainRoomTypes.find(t => t.key === roomType)?.filter ?? (() => true)
  )

  if (!account) return <div className="min-h-screen" style={{ background: '#0c0c12' }} />

  return (
    <div className="min-h-screen pb-28" style={{ background: '#0c0c12' }}>

      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-20" style={{ background: 'rgba(12,12,18,0.96)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* 상단: 브랜드 + 로그아웃 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3.5">
            {/* KH 로고 */}
            <div className="relative">
              <img src="/logo.png" alt="KH Music" className="w-11 h-11 rounded-2xl object-cover"
                style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} />
              {/* 온라인 도트 */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0c0c12]"
                style={{ background: '#22c55e' }} />
            </div>

            {/* 텍스트 */}
            <div>
              <p className="text-white font-black text-lg leading-none tracking-tight">연습실 예약</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{account.name}</p>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: account.student_type === 'exam' ? 'rgba(99,102,241,0.18)' : account.student_type === 'professional' ? 'rgba(16,185,129,0.18)' : 'rgba(168,85,247,0.18)',
                    color: account.student_type === 'exam' ? '#a5b4fc' : account.student_type === 'professional' ? '#6ee7b7' : '#d8b4fe',
                  }}>
                  {typeLabel(account.student_type)}
                </span>
              </div>
            </div>
          </div>

          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition"
            style={{ color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)' }}>
            로그아웃
          </button>
        </div>

        {/* 건물 탭 */}
        <div className="flex gap-6 px-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {(['main', 'annex'] as const).map(b => {
            const active = building === b
            const c = b === 'main' ? '#818cf8' : '#34d399'
            return (
              <button key={b} onClick={() => setBuilding(b)}
                className="pb-3 text-sm font-bold transition-all relative"
                style={{ color: active ? '#fff' : 'rgba(255,255,255,0.28)' }}>
                {b === 'main' ? '본관' : '별관'}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: c }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* 날짜 */}
        <input type="date" value={date} onChange={e => setDate(e.target.value)} min={todayStr()}
          className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            colorScheme: 'dark',
          }} />

        {/* 안내 */}
        {isExam && account.student_type !== 'admin' && date === todayStr() && (
          <div className="px-4 py-3 rounded-xl text-xs flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
            <span style={{ color: color.text, fontSize: 14 }}>●</span>
            {currentHour < 10 || (currentHour === 10 && now.getMinutes() < 50)
              ? '10:50 이후 예약 가능'
              : myBookings.some(b => b.date === date && b.start_hour === currentHour)
                ? `${currentHour + 1}:00 예약 가능 (:50 이후)`
                : `${currentHour}:00 ~ ${currentHour + 1}:00 예약 가능`}
          </div>
        )}
        {account.student_type === 'hobby' && (
          <div className="px-4 py-3 rounded-xl text-xs flex items-center gap-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' }}>
            <span style={{ color: '#a78bfa', fontSize: 14 }}>●</span>
            하루 1시간 · 언제든 미리 예약 가능
          </div>
        )}
        {building === 'annex' && account.student_type !== 'exam' && (
          <div className="px-4 py-3 rounded-xl text-xs text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}>
            별관은 입시반만 이용 가능해요
          </div>
        )}

        {/* 방 종류 탭 */}
        {building === 'main' && (
          <div className="flex gap-2">
            {mainRoomTypes.map(t => {
              const active = roomType === t.key
              return (
                <button key={t.key} onClick={() => setRoomType(t.key)}
                  className="flex-1 py-3.5 rounded-xl text-[12px] font-bold transition-all"
                  style={{
                    background: active ? t.activeBg : 'rgba(255,255,255,0.04)',
                    color: active ? t.color : t.dimColor,
                    border: `1px solid ${active ? t.activeBorder : t.dimBorder}`,
                  }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        )}

        {/* 내 예약 */}
        {myBookings.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
              내 예약
            </p>
            <div className="space-y-2">
              {myBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-[2px] h-8 rounded-full" style={{ background: color.primary }} />
                    <div>
                      <p className="text-white text-sm font-semibold leading-none">{(b.room as Room).name}</p>
                      <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {b.date} · {fmt(b.start_hour)} ~ {fmt(b.end_hour)}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleCancel(b.id)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition"
                    style={{ color: 'rgba(248,113,113,0.6)', background: 'transparent' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    취소
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 예약 그리드 */}
        {loading ? (
          <div className="text-center py-20 text-sm" style={{ color: 'rgba(255,255,255,0.12)' }}>불러오는 중...</div>
        ) : operatingHours === null ? (
          <div className="py-16 text-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-2xl mb-3">🔒</p>
            <p className="text-sm font-semibold text-white/50">
              {building === 'main' ? '본관' : '별관'} 휴무일이에요
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {new Date(date + 'T00:00:00').getDay() === 0 ? '일요일은 본관이 운영하지 않아요' : '해당일은 휴무예요'}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
              예약 현황
            </p>
            <div className="overflow-x-auto -mx-4 px-4">
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
                    <div key={`hdr-${r.id}`} className="flex items-center justify-center py-2.5 rounded-lg"
                      style={{ background: rc.bg, border: `1px solid ${rc.border}` }}>
                      <span className="text-[10px] font-bold" style={{ color: rc.text, letterSpacing: '0.02em' }}>
                        {shortName(r.name)}
                      </span>
                    </div>
                  )
                })}

                {/* 셀 */}
                {operatingHours.flatMap(h => {
                  const isCurrent = h === currentHour && date === todayStr()
                  return [
                    <div key={`t-${h}`} className="flex items-center justify-end pr-2">
                      <span className="text-[11px] font-bold" style={{ color: isCurrent ? color.text : 'rgba(255,255,255,0.55)' }}>
                        {h}
                      </span>
                    </div>,
                    ...filteredRooms.map(r => {
                      const cls = getClass(r.id, h)
                      const bk = getBooking(r.id, h)
                      const isMine = bk?.account_id === account.id
                      const bookable = canBook(r.id, h)
                      const restricted = building === 'annex' && account.student_type !== 'exam'

                      if (cls) return (
                        <div key={`${h}-${r.id}`} className="h-11 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(244,63,94,0.09)', border: '1px solid rgba(244,63,94,0.14)' }}>
                          <span className="text-[9px] font-semibold truncate px-1.5" style={{ color: 'rgba(251,113,133,0.7)' }}>
                            {cls.instructor}
                          </span>
                        </div>
                      )

                      if (isMine) return (
                        <button key={`${h}-${r.id}`} onClick={() => handleCancel(bk!.id)}
                          className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                          style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.28)' }}>
                          <span className="text-[9px] font-bold truncate px-1.5" style={{ color: '#6ee7b7' }}>
                            {account.student_type === 'admin' ? 'X' : account.name}
                          </span>
                        </button>
                      )

                      if (bk) return (
                        <div key={`${h}-${r.id}`} className="h-11 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }} />
                      )

                      if (restricted || !bookable) return (
                        <div key={`${h}-${r.id}`} className="h-11 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.02)' }} />
                      )

                      return (
                        <button key={`${h}-${r.id}`} onClick={() => handleBook(r.id, h)} disabled={booking}
                          className="h-11 rounded-lg flex items-center justify-center transition active:scale-95 disabled:opacity-30"
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

            {/* 범례 */}
            <div className="flex gap-3 mt-5 flex-wrap px-1">
              {[
                { bg: color.bookableBg, border: color.bookableBorder, label: '예약 가능' },
                { bg: 'rgba(16,185,129,0.14)', border: 'rgba(16,185,129,0.28)', label: '내 예약' },
                { bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.12)', label: '예약됨' },
                { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.25)', label: '수업' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-3 h-3 rounded-[3px]" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                  <span className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
