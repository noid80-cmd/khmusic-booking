'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, Room, Booking } from '@/lib/supabase'
import Link from 'next/link'

const HOURS = Array.from({ length: 11 }, (_, i) => i + 11) // 11~21

function fmt(h: number) { return `${h}:00` }

function todayStr() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function BookPage() {
  const [account, setAccount] = useState<Account | null>(null)
  const [building, setBuilding] = useState<'main' | 'annex'>('main')
  const [date, setDate] = useState(todayStr())
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [classes, setClasses] = useState<{ room_id: string, start_hour: number, end_hour: number, instructor: string }[]>([])
  const [myBookings, setMyBookings] = useState<(Booking & { room: Room })[]>([])
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

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
    const now = new Date()
    const isToday = date === todayStr()

    // 취미반: 시간 제한 없이 예약 가능
    if (account.student_type === 'hobby') {
      // 하루 1시간만
      const todayBooked = myBookings.filter(b => b.date === date)
      if (todayBooked.length > 0) return false
      return true
    }

    // 입시반/전문반: 오늘만, 현재 시간 또는 다음 시간만 예약 가능
    if (!isToday) return false
    const currentHour = now.getHours()
    return hour === currentHour || hour === currentHour + 1
  }

  function isBlocked(roomId: string, hour: number): boolean {
    // 수업 있는지
    const hasClass = classes.some(c => c.room_id === roomId && c.start_hour <= hour && hour < c.end_hour)
    if (hasClass) return true
    // 이미 예약된지
    const hasBooking = bookings.some(b => b.room_id === roomId && b.start_hour === hour)
    if (hasBooking) return true
    return false
  }

  function getBooking(roomId: string, hour: number) {
    return bookings.find(b => b.room_id === roomId && b.start_hour === hour)
  }

  function getClass(roomId: string, hour: number) {
    return classes.find(c => c.room_id === roomId && c.start_hour <= hour && hour < c.end_hour)
  }

  async function handleBook(roomId: string, hour: number) {
    if (!account || !canBook(hour) || isBlocked(roomId, hour)) return

    // 입시/전문반 연속 2시간 체크
    if (account.student_type !== 'hobby') {
      const currentBlock = myBookings.filter(b => b.date === date && b.room_id === roomId)
      if (currentBlock.length >= 2) {
        alert('현재 해당 방에 2시간 예약이 이미 있어요.\n2시간 후에 다시 예약해주세요.')
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
    if (error) {
      alert('예약에 실패했어요. 다른 분이 먼저 예약했을 수 있어요.')
    }
    await loadData()
    setBooking(false)
  }

  async function handleCancel(bookingId: string) {
    if (!confirm('예약을 취소할까요?')) return
    await supabase.from('bookings').delete().eq('id', bookingId)
    await loadData()
  }

  const isExam = account?.student_type === 'exam' || account?.student_type === 'professional'
  const isToday = date === todayStr()
  const now = new Date()
  const canBookNow = account?.student_type === 'hobby' || isToday

  if (!account) return <div className="min-h-screen bg-[#0a0a0a]" />

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* 헤더 */}
      <nav className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">{account.name}</p>
          <p className="text-white/30 text-xs">{account.student_type === 'exam' ? '입시반' : account.student_type === 'professional' ? '전문반' : '취미반'}</p>
        </div>
        <h1 className="text-white font-black text-base">KH 연습실 예약</h1>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
          className="text-white/30 text-xs hover:text-white/60">로그아웃</button>
      </nav>

      <div className="px-4 pt-4">
        {/* 예약 안내 */}
        {isExam && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-xs ${canBookNow ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300' : 'bg-white/5 border border-white/10 text-white/40'}`}>
            {'⏰ 현재 시간과 다음 1시간만 예약할 수 있어요'}
          </div>
        )}
        {account.student_type === 'hobby' && (
          <div className="mb-4 px-4 py-3 rounded-xl text-xs bg-purple-500/20 border border-purple-500/40 text-purple-300">
            하루 1시간 예약 가능 · 언제든 미리 예약할 수 있어요
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          {(['main', 'annex'] as const).map(b => (
            <button key={b} onClick={() => setBuilding(b)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${building === b ? 'text-white' : 'bg-white/5 text-white/40'}`}
              style={building === b ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
              {b === 'main' ? '본관' : '별관'}
            </button>
          ))}
        </div>

        {/* 별관 입시반 전용 안내 */}
        {building === 'annex' && account.student_type !== 'exam' && (
          <div className="mb-4 px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-center text-white/40 text-sm">
            별관은 입시반만 이용 가능해요
          </div>
        )}

        {/* 날짜 선택 */}
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          min={todayStr()}
          className="w-full mb-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
          style={{ colorScheme: 'dark' }} />

        {/* 내 예약 */}
        {myBookings.length > 0 && (
          <div className="mb-4">
            <p className="text-white/40 text-xs mb-2">내 예약</p>
            <div className="flex flex-col gap-2">
              {myBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <div>
                    <p className="text-white text-sm font-medium">{(b.room as Room).name}</p>
                    <p className="text-white/40 text-xs">{b.date} · {fmt(b.start_hour)}~{fmt(b.end_hour)}</p>
                  </div>
                  <button onClick={() => handleCancel(b.id)} className="text-red-400 text-xs hover:text-red-300">취소</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 시간표 */}
        {loading ? (
          <div className="text-center text-white/30 py-10">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${rooms.length * 60 + 50}px` }}>
              <thead>
                <tr>
                  <th className="sticky left-0 bg-[#0a0a0a] text-white/30 text-left py-2 pr-2 w-12">시간</th>
                  {rooms.map(r => (
                    <th key={r.id} className="text-white/50 text-center py-2 px-1 font-medium" style={{ minWidth: 52 }}>
                      {r.name.replace('GUITAR & BASS', 'G&B').replace('ENSEMBLE ROOM', 'ENS').replace('PIANO', 'P').replace('MIDI', 'M').replace('DRUMS', 'DR')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(h => (
                  <tr key={h} className="border-t border-white/5">
                    <td className="sticky left-0 bg-[#0a0a0a] text-white/30 py-1.5 pr-2 whitespace-nowrap">{fmt(h)}</td>
                    {rooms.map(r => {
                      const cls = getClass(r.id, h)
                      const bk = getBooking(r.id, h)
                      const isMine = bk?.account_id === account.id
                      const blocked = !!cls || (!!bk && !isMine)
                      const annexRestricted = building === 'annex' && account.student_type !== 'exam'

                      return (
                        <td key={r.id} className="py-1 px-0.5 text-center">
                          {cls ? (
                            <div className="rounded text-[10px] py-1 bg-pink-500/20 text-pink-300 truncate px-0.5">{cls.instructor}</div>
                          ) : isMine ? (
                            <button onClick={() => handleCancel(bk!.id)}
                              className="w-full rounded text-[10px] py-1 bg-indigo-500/30 text-indigo-300">나</button>
                          ) : bk ? (
                            <div className="rounded text-[10px] py-1 bg-white/10 text-white/20">예약됨</div>
                          ) : annexRestricted ? (
                            <div className="rounded py-1 bg-white/3 text-white/10">-</div>
                          ) : (
                            <button onClick={() => handleBook(r.id, h)}
                              disabled={booking || (!canBook(h) && account.student_type !== 'hobby')}
                              className="w-full rounded text-[10px] py-1 bg-white/5 text-white/30 hover:bg-indigo-500/20 hover:text-indigo-300 disabled:opacity-30 transition">
                              예약
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
