'use client'

import { useState, useEffect } from 'react'
import React from 'react'
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

  const isMain = building === 'main'
  const accent = isMain
    ? { grad: 'linear-gradient(135deg, #6366f1, #8b5cf6)', glow: 'rgba(99,102,241,0.3)', cell: 'rgba(99,102,241,0.10)', cellHot: 'rgba(99,102,241,0.20)', border: 'rgba(99,102,241,0.18)', borderHot: 'rgba(99,102,241,0.40)', text: 'rgba(165,180,252,0.85)', hourText: '#818cf8', banner: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', color: '#a5b4fc' } }
    : { grad: 'linear-gradient(135deg, #10b981, #0d9488)', glow: 'rgba(16,185,129,0.3)', cell: 'rgba(16,185,129,0.10)', cellHot: 'rgba(16,185,129,0.20)', border: 'rgba(16,185,129,0.18)', borderHot: 'rgba(16,185,129,0.40)', text: 'rgba(110,231,183,0.85)', hourText: '#34d399', banner: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', color: '#6ee7b7' } }

  const mainRoomTypes = [
    { key: 'piano', label: '피아노', filter: (r: Room) => r.name.startsWith('PIANO') },
    { key: 'midi', label: 'MIDI', filter: (r: Room) => r.name.startsWith('MIDI') },
    { key: 'guitar', label: '기타&베이스', filter: (r: Room) => r.name.startsWith('GUITAR') },
    { key: 'etc', label: '드럼&그외', filter: (r: Room) => r.name.startsWith('DRUMS') || r.name === '소극장' || r.name === '녹음실' || r.name.startsWith('ENSEMBLE') },
  ] as const

  const filteredRooms = building === 'annex' ? rooms : rooms.filter(
    mainRoomTypes.find(t => t.key === roomType)?.filter ?? (() => true)
  )

  if (!account) return <div className="min-h-screen" style={{ background: '#0a0a0f' }} />

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0f' }}>

      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-20 border-b border-white/[0.07]" style={{ background: 'rgba(10,10,15,0.96)', backdropFilter: 'blur(24px)' }}>
        <div className="px-5 pt-4 pb-4 space-y-3">

          {/* 브랜드 + 유저 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[22px] leading-none"
                style={{ background: accent.grad, boxShadow: `0 6px 20px ${accent.glow}` }}>
                ♪
              </div>
              <div>
                <p className="text-white font-black text-[15px] leading-none tracking-tight">KH Music</p>
                <p className="text-white/40 text-[11px] mt-[3px]">{account.name} · {typeLabel(account.student_type)}</p>
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
              className="text-white/20 text-xs hover:text-white/50 transition">
              로그아웃
            </button>
          </div>

          {/* 건물 탭 */}
          <div className="flex p-1 rounded-2xl gap-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['main', 'annex'] as const).map(b => {
              const on = building === b
              const g = b === 'main' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#10b981,#0d9488)'
              const gl = b === 'main' ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.3)'
              return (
                <button key={b} onClick={() => setBuilding(b)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${on ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                  style={on ? { background: g, boxShadow: `0 4px 14px ${gl}` } : {}}>
                  {b === 'main' ? '본관' : '별관'}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* 날짜 */}
        <input type="date" value={date} onChange={e => setDate(e.target.value)} min={todayStr()}
          className="w-full rounded-2xl px-4 py-3.5 text-white text-sm font-medium focus:outline-none transition"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }} />

        {/* 안내 배너 */}
        {isExam && (
          <div className="px-4 py-3 rounded-2xl border text-xs flex items-center gap-2.5"
            style={{ background: accent.banner.bg, borderColor: accent.banner.border, color: accent.banner.color }}>
            <span className="text-[15px]">⏰</span>
            <span className="font-medium">
              {now.getMinutes() >= 50
                ? `${currentHour + 1}:00 ~ ${currentHour + 3}:00 예약 가능 (:50 넘어서 다음 창으로)`
                : `${currentHour}:00 ~ ${currentHour + 2}:00 예약 가능`}
            </span>
          </div>
        )}
        {account.student_type === 'hobby' && (
          <div className="px-4 py-3 rounded-2xl border text-xs flex items-center gap-2.5"
            style={{ background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.2)', color: '#d8b4fe' }}>
            <span className="text-[15px]">🎵</span>
            <span className="font-medium">하루 1시간 · 언제든 미리 예약 가능해요</span>
          </div>
        )}
        {building === 'annex' && account.student_type !== 'exam' && (
          <div className="px-4 py-3 rounded-2xl border text-xs text-center font-medium"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)' }}>
            별관은 입시반만 이용 가능해요
          </div>
        )}

        {/* 방 종류 탭 */}
        {building === 'main' && (
          <div className="flex gap-2">
            {mainRoomTypes.map(t => (
              <button key={t.key} onClick={() => setRoomType(t.key)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${roomType === t.key ? 'text-white' : 'text-white/30'}`}
                style={roomType === t.key ? { background: accent.grad } : { background: 'rgba(255,255,255,0.05)' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* 내 예약 */}
        {myBookings.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-2.5 px-0.5">내 예약</p>
            <div className="space-y-2">
              {myBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3.5 rounded-2xl border"
                  style={{ background: 'rgba(99,102,241,0.07)', borderColor: 'rgba(99,102,241,0.15)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-[3px] h-9 rounded-full" style={{ background: accent.grad }} />
                    <div>
                      <p className="text-white text-sm font-bold leading-none">{(b.room as Room).name}</p>
                      <p className="text-white/40 text-[11px] mt-1">{b.date} · {fmt(b.start_hour)} ~ {fmt(b.end_hour)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleCancel(b.id)}
                    className="text-[11px] text-red-400/50 hover:text-red-400 transition px-2 py-1 rounded-lg hover:bg-red-500/10 font-medium">
                    취소
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 예약 현황 그리드 */}
        {loading ? (
          <div className="text-center py-16 text-sm" style={{ color: 'rgba(255,255,255,0.15)' }}>불러오는 중...</div>
        ) : (
          <div>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-3 px-0.5">예약 현황</p>
            <div className="overflow-x-auto -mx-4 px-4">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `38px repeat(${filteredRooms.length}, minmax(50px, 1fr))`,
                  gap: '4px',
                  minWidth: `${filteredRooms.length * 54 + 42}px`,
                }}>

                {/* 헤더 행 */}
                <div />
                {filteredRooms.map(r => (
                  <div key={`hdr-${r.id}`} className="flex items-center justify-center py-2 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-[11px] font-bold text-white/55">{shortName(r.name)}</span>
                  </div>
                ))}

                {/* 시간 × 방 셀 */}
                {HOURS.flatMap(h => {
                  const isCurrentHour = h === currentHour && date === todayStr()
                  return [
                    <div key={`t-${h}`} className="flex items-center justify-end pr-2">
                      <span className="text-[12px] font-black" style={{ color: isCurrentHour ? accent.hourText : 'rgba(255,255,255,0.18)' }}>
                        {h}
                      </span>
                    </div>,
                    ...filteredRooms.map(r => {
                      const cls = getClass(r.id, h)
                      const bk = getBooking(r.id, h)
                      const isMine = bk?.account_id === account.id
                      const isBookableHour = canBook(h)
                      const annexRestricted = building === 'annex' && account.student_type !== 'exam'

                      if (cls) return (
                        <div key={`${h}-${r.id}`} className="h-12 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(244,63,94,0.11)', border: '1px solid rgba(244,63,94,0.18)' }}>
                          <span className="text-[9px] font-semibold truncate px-1" style={{ color: 'rgba(251,113,133,0.8)' }}>{cls.instructor}</span>
                        </div>
                      )

                      if (isMine) return (
                        <button key={`${h}-${r.id}`} onClick={() => handleCancel(bk!.id)}
                          className="h-12 rounded-xl flex items-center justify-center transition active:scale-95"
                          style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)' }}>
                          <span className="text-[9px] font-black truncate px-1" style={{ color: '#6ee7b7' }}>{account.name}</span>
                        </button>
                      )

                      if (bk) return (
                        <div key={`${h}-${r.id}`} className="h-12 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
                      )

                      if (annexRestricted) return (
                        <div key={`${h}-${r.id}`} className="h-12 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.02)' }} />
                      )

                      if (isBookableHour) return (
                        <button key={`${h}-${r.id}`} onClick={() => handleBook(r.id, h)} disabled={booking}
                          className="h-12 rounded-xl flex items-center justify-center transition active:scale-95 disabled:opacity-40"
                          style={{
                            background: isCurrentHour ? accent.cellHot : accent.cell,
                            border: `1px solid ${isCurrentHour ? accent.borderHot : accent.border}`,
                          }}>
                          <span className="text-[13px] font-black" style={{ color: accent.text }}>+</span>
                        </button>
                      )

                      return (
                        <div key={`${h}-${r.id}`} className="h-12 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.015)' }} />
                      )
                    }),
                  ]
                })}
              </div>
            </div>

            {/* 범례 */}
            <div className="flex gap-4 mt-5 px-0.5 flex-wrap">
              {[
                { bg: accent.cell, border: accent.border, label: '예약 가능' },
                { bg: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.35)', label: '내 예약' },
                { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', label: '예약됨' },
                { bg: 'rgba(244,63,94,0.11)', border: 'rgba(244,63,94,0.2)', label: '수업' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-[4px]" style={{ background: item.bg, border: `1px solid ${item.border}` }} />
                  <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.22)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
