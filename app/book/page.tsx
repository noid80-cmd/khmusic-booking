'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, Room, Booking } from '@/lib/supabase'

const HOURS = Array.from({ length: 11 }, (_, i) => i + 11)

function fmt(h: number) { return `${h}:00` }
function todayStr() { return new Date().toISOString().slice(0, 10) }

function shortName(name: string) {
  return name
    .replace('GUITAR & BASS', 'G&B')
    .replace('ENSEMBLE ROOM', 'ENS')
    .replace('PIANO', 'P')
    .replace('MIDI', 'M')
    .replace('DRUMS', 'DR')
}

function typeLabel(t: string | null) {
  if (t === 'exam') return '입시반'
  if (t === 'professional') return '전문반'
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

  function canBook(hour: number): boolean {
    if (!account) return false
    const isToday = date === todayStr()

    if (account.student_type === 'hobby') {
      const todayBooked = myBookings.filter(b => b.date === date)
      if (todayBooked.length > 0) return false
      return true
    }

    if (!isToday) return false
    const currentHour = now.getHours()
    const currentMin = now.getMinutes()
    // :50분 이후엔 다음 시간대로 창 이동
    const base = currentMin >= 50 ? currentHour + 1 : currentHour
    return hour === base || hour === base + 1
  }

  function getBooking(roomId: string, hour: number) {
    return bookings.find(b => b.room_id === roomId && b.start_hour === hour)
  }

  function getClass(roomId: string, hour: number) {
    return classes.find(c => c.room_id === roomId && c.start_hour <= hour && hour < c.end_hour)
  }

  async function handleBook(roomId: string, hour: number) {
    if (!account || !canBook(hour)) return
    const bk = getBooking(roomId, hour)
    if (bk) return

    if (account.student_type !== 'hobby') {
      const currentBlock = myBookings.filter(b => b.date === date && b.room_id === roomId)
      if (currentBlock.length >= 2) {
        alert('해당 방에 이미 2시간 예약이 있어요.')
        return
      }
    }

    setBooking(true)
    const { error } = await supabase.from('bookings').insert({
      account_id: account.id,
      room_id: roomId,
      date,
      start_hour: hour,
      end_hour: hour + 1,
      booking_type: 'student',
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

  const isExam = account?.student_type === 'exam' || account?.student_type === 'professional'
  const currentHour = now.getHours()

  // 본관: indigo/purple, 별관: emerald/teal
  const theme = building === 'main'
    ? { active: 'linear-gradient(135deg, #6366f1, #8b5cf6)', tab: 'shadow-indigo-500/20', bookable: 'bg-indigo-500/10 border-indigo-500/15 hover:bg-indigo-500/20', bookableCurrent: 'bg-indigo-500/20 border-indigo-500/35 hover:bg-indigo-500/30', bookableText: 'text-indigo-300/60', currentRowBorder: 'border-indigo-500/20', currentHourText: 'text-indigo-400', bannerBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' }
    : { active: 'linear-gradient(135deg, #10b981, #0d9488)', tab: 'shadow-emerald-500/20', bookable: 'bg-emerald-500/10 border-emerald-500/15 hover:bg-emerald-500/20', bookableCurrent: 'bg-emerald-500/20 border-emerald-500/35 hover:bg-emerald-500/30', bookableText: 'text-emerald-300/60', currentRowBorder: 'border-emerald-500/20', currentHourText: 'text-emerald-400', bannerBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' }

  const mainRoomTypes = [
    { key: 'piano', label: '피아노', filter: (r: Room) => r.name.startsWith('PIANO') },
    { key: 'midi', label: 'MIDI', filter: (r: Room) => r.name.startsWith('MIDI') },
    { key: 'guitar', label: '기타&베이스', filter: (r: Room) => r.name.startsWith('GUITAR') },
    { key: 'etc', label: '드럼&그외', filter: (r: Room) => r.name.startsWith('DRUMS') || r.name === '소극장' || r.name === '녹음실' || r.name.startsWith('ENSEMBLE') },
  ] as const

  const filteredRooms = building === 'annex' ? rooms : rooms.filter(
    mainRoomTypes.find(t => t.key === roomType)?.filter ?? (() => true)
  )

  if (!account) return <div className="min-h-screen bg-[#0a0a0a]" />

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">

      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/8">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-black">
              {account.name[0]}
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">{account.name}</p>
              <p className="text-white/40 text-[11px] mt-0.5">{typeLabel(account.student_type)}</p>
            </div>
          </div>
          <p className="text-white font-black text-base tracking-tight">KH 연습실</p>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="text-white/25 text-xs hover:text-white/50 transition">로그아웃</button>
        </div>

        {/* 건물 탭 */}
        <div className="px-4 pb-3 flex gap-2">
          {(['main', 'annex'] as const).map(b => (
            <button key={b} onClick={() => setBuilding(b)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                building === b
                  ? 'text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-white/35 hover:bg-white/8'
              }`}
              style={building === b ? { background: theme.active } : {}}>
              {b === 'main' ? '본관' : '별관'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">

        {/* 날짜 */}
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          min={todayStr()}
          className="w-full bg-white/5 border border-white/8 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition"
          style={{ colorScheme: 'dark' }} />

        {/* 안내 배너 */}
        {isExam && (
          <div className={`px-4 py-3 rounded-2xl border text-xs flex items-center gap-2 ${theme.bannerBg}`}>
            <span className="text-base">⏰</span>
            <span>{now.getMinutes() >= 50 ? `${currentHour + 1}:00 ~ ${currentHour + 3}:00 예약 가능 (:50 넘어서 다음 창으로)` : `${currentHour}:00 ~ ${currentHour + 2}:00 예약 가능`}</span>
          </div>
        )}
        {account.student_type === 'hobby' && (
          <div className="px-4 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
            <span className="text-base">🎵</span>
            <span>하루 1시간 · 언제든 미리 예약 가능해요</span>
          </div>
        )}
        {building === 'annex' && account.student_type !== 'exam' && (
          <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/8 text-white/35 text-xs text-center">
            별관은 입시반만 이용 가능해요
          </div>
        )}

        {/* 본관 방 종류 탭 */}
        {building === 'main' && (
          <div className="flex gap-1.5">
            {mainRoomTypes.map(t => (
              <button key={t.key} onClick={() => setRoomType(t.key)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-medium transition ${
                  roomType === t.key ? 'text-white' : 'bg-white/5 text-white/35'
                }`}
                style={roomType === t.key ? { background: theme.active } : {}}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* 내 예약 */}
        {myBookings.length > 0 && (
          <div>
            <p className="text-white/30 text-xs font-medium mb-2 px-1">내 예약</p>
            <div className="space-y-2">
              {myBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/15">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                    <div>
                      <p className="text-white text-sm font-semibold">{(b.room as Room).name}</p>
                      <p className="text-white/40 text-xs">{b.date} · {fmt(b.start_hour)} ~ {fmt(b.end_hour)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleCancel(b.id)}
                    className="text-xs text-red-400/70 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-500/10">
                    취소
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 시간표 — 시간(행) × 방(열) */}
        {loading ? (
          <div className="text-center text-white/20 py-16 text-sm">불러오는 중...</div>
        ) : (
          <div>
            <p className="text-white/30 text-xs font-medium mb-2 px-1">예약 현황</p>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs border-collapse" style={{ minWidth: `${filteredRooms.length * 58 + 46}px` }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-[#0a0a0a] text-white/25 text-left py-2 pr-2 w-11 text-[11px]">시간</th>
                    {filteredRooms.map(r => (
                      <th key={r.id} className="text-white/40 text-center py-2 px-1 font-medium text-[11px]" style={{ minWidth: 50 }}>
                        {shortName(r.name)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map(h => {
                    const isCurrentHour = h === currentHour && date === todayStr()
                    return (
                      <tr key={h} className={`border-t ${isCurrentHour ? theme.currentRowBorder : 'border-white/5'}`}>
                        <td className="sticky left-0 bg-[#0a0a0a] py-1 pr-2 whitespace-nowrap">
                          <span className={`text-[11px] font-semibold ${isCurrentHour ? theme.currentHourText : 'text-white/25'}`}>
                            {fmt(h)}
                          </span>
                        </td>
                        {filteredRooms.map(r => {
                          const cls = getClass(r.id, h)
                          const bk = getBooking(r.id, h)
                          const isMine = bk?.account_id === account.id
                          const isBookableHour = canBook(h)
                          const annexRestricted = building === 'annex' && account.student_type !== 'exam'

                          return (
                            <td key={r.id} className="py-1 px-0.5 text-center">
                              {cls ? (
                                <div className="rounded-lg h-10 bg-pink-500/15 border border-pink-500/10 flex items-center justify-center">
                                  <span className="text-[9px] text-pink-300/70 truncate px-1">{cls.instructor}</span>
                                </div>
                              ) : isMine ? (
                                <button onClick={() => handleCancel(bk!.id)}
                                  className="w-full rounded-lg h-10 text-[9px] font-bold truncate px-1 transition active:scale-95 border"
                                  style={{ background: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
                                  {account.name}
                                </button>
                              ) : bk ? (
                                <div className="rounded-lg h-10 bg-white/6 border border-white/5" />
                              ) : annexRestricted ? (
                                <div className="rounded-lg h-7" />
                              ) : isBookableHour ? (
                                <button onClick={() => handleBook(r.id, h)}
                                  disabled={booking}
                                  className={`w-full rounded-lg h-10 transition-all active:scale-95 border disabled:opacity-40 ${
                                    isCurrentHour ? theme.bookableCurrent : theme.bookable
                                  }`}>
                                  <span className={`text-[9px] ${theme.bookableText}`}>예약</span>
                                </button>
                              ) : (
                                <div className="rounded-lg h-10 bg-white/2" />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 범례 */}
            <div className="flex gap-3 mt-4 px-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-500/15 border border-indigo-500/20" />
                <span className="text-[10px] text-white/30">예약 가능</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }} />
                <span className="text-[10px] text-white/30">내 예약</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-white/6 border border-white/5" />
                <span className="text-[10px] text-white/30">예약됨</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-pink-500/15 border border-pink-500/10" />
                <span className="text-[10px] text-white/30">수업</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
