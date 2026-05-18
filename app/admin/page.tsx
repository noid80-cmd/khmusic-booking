'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, Room } from '@/lib/supabase'

const ADMIN_EMAIL = 'noid80@hanmail.net'
const HOURS = Array.from({ length: 11 }, (_, i) => i + 11)

function todayStr() { return new Date().toISOString().slice(0, 10) }

type PendingAccount = Account & { email?: string }

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'schedule' | 'annex'>('users')
  const [pending, setPending] = useState<PendingAccount[]>([])
  const [approved, setApproved] = useState<Account[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [date, setDate] = useState(todayStr())
  const [classes, setClasses] = useState<{ id: string, room_id: string, start_hour: number, end_hour: number, instructor: string }[]>([])
  const [annexBookings, setAnnexBookings] = useState<{ id: string, room_id: string, date: string, start_hour: number, end_hour: number, booking_type: string, external_name: string | null, note: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  // 수업 추가 폼
  const [selRoom, setSelRoom] = useState('')
  const [selStart, setSelStart] = useState(11)
  const [selEnd, setSelEnd] = useState(12)
  const [instructor, setInstructor] = useState('')

  // 별관 예약 폼
  const [annexRoom, setAnnexRoom] = useState('')
  const [annexDate, setAnnexDate] = useState(todayStr())
  const [annexStart, setAnnexStart] = useState(11)
  const [annexEnd, setAnnexEnd] = useState(12)
  const [annexType, setAnnexType] = useState<'external' | 'monthly'>('external')
  const [annexName, setAnnexName] = useState('')
  const [annexNote, setAnnexNote] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.email !== ADMIN_EMAIL) { window.location.href = '/'; return }
      loadAll()
    })
  }, [])

  useEffect(() => { if (rooms.length) loadSchedule() }, [date, rooms])

  async function loadAll() {
    setLoading(true)
    const [pendingRes, approvedRes, roomsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('accounts').select('*').eq('status', 'approved').order('name'),
      supabase.from('rooms').select('*').order('building').order('display_order'),
    ])
    setPending(pendingRes.data || [])
    setApproved(approvedRes.data || [])
    setRooms(roomsRes.data || [])
    setLoading(false)
  }

  async function loadSchedule() {
    const mainRoomIds = rooms.filter(r => r.building === 'main').map(r => r.id)
    const annexRoomIds = rooms.filter(r => r.building === 'annex').map(r => r.id)
    const [clsRes, annexRes] = await Promise.all([
      supabase.from('class_schedules').select('*').eq('date', date).in('room_id', mainRoomIds),
      supabase.from('bookings').select('*').eq('date', date).in('room_id', annexRoomIds).in('booking_type', ['external', 'monthly']),
    ])
    setClasses(clsRes.data || [])
    setAnnexBookings(annexRes.data || [])
  }

  async function approveUser(id: string, type: Account['student_type']) {
    await supabase.from('accounts').update({ status: 'approved', student_type: type }).eq('id', id)
    await loadAll()
  }

  async function rejectUser(id: string) {
    if (!confirm('거절하시겠어요?')) return
    await supabase.from('accounts').update({ status: 'rejected' }).eq('id', id)
    await loadAll()
  }

  async function addClass() {
    if (!selRoom || !instructor) return
    await supabase.from('class_schedules').insert({ room_id: selRoom, date, start_hour: selStart, end_hour: selEnd, instructor })
    setInstructor('')
    await loadSchedule()
  }

  async function deleteClass(id: string) {
    await supabase.from('class_schedules').delete().eq('id', id)
    await loadSchedule()
  }

  async function addAnnexBooking() {
    if (!annexRoom || !annexName) return
    await supabase.from('bookings').insert({
      room_id: annexRoom, date: annexDate,
      start_hour: annexStart, end_hour: annexEnd,
      booking_type: annexType, external_name: annexName, note: annexNote || null,
    })
    setAnnexName(''); setAnnexNote('')
    await loadSchedule()
  }

  async function deleteAnnexBooking(id: string) {
    await supabase.from('bookings').delete().eq('id', id)
    await loadSchedule()
  }

  const mainRooms = rooms.filter(r => r.building === 'main')
  const annexRooms = rooms.filter(r => r.building === 'annex')

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/30">로딩 중...</div>

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      <nav className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-white font-black">관리자</h1>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} className="text-white/30 text-xs">로그아웃</button>
      </nav>

      {/* 탭 */}
      <div className="flex gap-2 px-4 pt-4 mb-4">
        {([['users', '회원 관리'], ['schedule', '본관 수업'], ['annex', '별관 예약']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${tab === t ? 'text-white' : 'bg-white/5 text-white/40'}`}
            style={tab === t ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
            {label} {t === 'users' && pending.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{pending.length}</span>}
          </button>
        ))}
      </div>

      <div className="px-4">
        {/* 회원 관리 */}
        {tab === 'users' && (
          <div>
            {pending.length > 0 && (
              <div className="mb-6">
                <p className="text-white/40 text-xs mb-2">승인 대기 ({pending.length})</p>
                {pending.map(u => (
                  <div key={u.id} className="mb-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white font-medium">{u.name}</p>
                    <p className="text-white/40 text-xs mt-0.5">{u.phone}</p>
                    <p className="text-white/30 text-xs">{new Date(u.created_at).toLocaleDateString('ko')}</p>
                    <div className="flex gap-2 mt-3">
                      <select onChange={e => approveUser(u.id, e.target.value as Account['student_type'])}
                        className="flex-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg px-2 py-2 text-indigo-300 text-sm focus:outline-none"
                        style={{ colorScheme: 'dark' }} defaultValue="">
                        <option value="" disabled>반 선택 후 승인</option>
                        <option value="exam">입시반</option>
                        <option value="professional">전문반</option>
                        <option value="hobby">취미반</option>
                      </select>
                      <button onClick={() => rejectUser(u.id)} className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm">거절</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-white/40 text-xs mb-2">승인된 회원 ({approved.length})</p>
            {approved.map(u => (
              <div key={u.id} className="mb-2 px-4 py-3 rounded-xl bg-white/5 flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">{u.name}</p>
                  <p className="text-white/30 text-xs">{u.phone}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  u.student_type === 'exam' ? 'bg-blue-500/20 text-blue-300' :
                  u.student_type === 'professional' ? 'bg-green-500/20 text-green-300' :
                  'bg-purple-500/20 text-purple-300'
                }`}>
                  {u.student_type === 'exam' ? '입시반' : u.student_type === 'professional' ? '전문반' : '취미반'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 본관 수업 스케줄 */}
        {tab === 'schedule' && (
          <div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mb-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              style={{ colorScheme: 'dark' }} />

            <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/60 text-xs mb-3">수업 추가</p>
              <select value={selRoom} onChange={e => setSelRoom(e.target.value)}
                className="w-full mb-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                style={{ colorScheme: 'dark' }}>
                <option value="">연습실 선택</option>
                {mainRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="flex gap-2 mb-2">
                <select value={selStart} onChange={e => setSelStart(Number(e.target.value))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
                  style={{ colorScheme: 'dark' }}>
                  {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
                <span className="text-white/30 self-center">~</span>
                <select value={selEnd} onChange={e => setSelEnd(Number(e.target.value))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
                  style={{ colorScheme: 'dark' }}>
                  {HOURS.filter(h => h > selStart).concat([22]).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
              <input value={instructor} onChange={e => setInstructor(e.target.value)}
                placeholder="강사명" className="w-full mb-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none" />
              <button onClick={addClass}
                className="w-full py-2 rounded-lg text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>추가</button>
            </div>

            {classes.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-6">등록된 수업이 없어요</p>
            ) : classes.map(c => {
              const room = rooms.find(r => r.id === c.room_id)
              return (
                <div key={c.id} className="mb-2 px-4 py-3 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{room?.name} · {c.instructor}</p>
                    <p className="text-white/40 text-xs">{c.start_hour}:00 ~ {c.end_hour}:00</p>
                  </div>
                  <button onClick={() => deleteClass(c.id)} className="text-red-400 text-xs">삭제</button>
                </div>
              )
            })}
          </div>
        )}

        {/* 별관 예약 */}
        {tab === 'annex' && (
          <div>
            <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/60 text-xs mb-3">외부 예약 추가</p>
              <input type="date" value={annexDate} onChange={e => setAnnexDate(e.target.value)}
                className="w-full mb-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                style={{ colorScheme: 'dark' }} />
              <select value={annexRoom} onChange={e => setAnnexRoom(e.target.value)}
                className="w-full mb-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                style={{ colorScheme: 'dark' }}>
                <option value="">연습실 선택</option>
                {annexRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="flex gap-2 mb-2">
                <select value={annexStart} onChange={e => setAnnexStart(Number(e.target.value))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
                  style={{ colorScheme: 'dark' }}>
                  {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
                <span className="text-white/30 self-center">~</span>
                <select value={annexEnd} onChange={e => setAnnexEnd(Number(e.target.value))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
                  style={{ colorScheme: 'dark' }}>
                  {HOURS.filter(h => h > annexStart).concat([22]).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
              <div className="flex gap-2 mb-2">
                <button onClick={() => setAnnexType('external')}
                  className={`flex-1 py-2 rounded-lg text-sm transition ${annexType === 'external' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/5 text-white/40'}`}>
                  시간제
                </button>
                <button onClick={() => setAnnexType('monthly')}
                  className={`flex-1 py-2 rounded-lg text-sm transition ${annexType === 'monthly' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/5 text-white/40'}`}>
                  월렌탈
                </button>
              </div>
              <input value={annexName} onChange={e => setAnnexName(e.target.value)}
                placeholder="예약자명" className="w-full mb-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none" />
              <input value={annexNote} onChange={e => setAnnexNote(e.target.value)}
                placeholder="메모 (선택)" className="w-full mb-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none" />
              <button onClick={addAnnexBooking}
                className="w-full py-2 rounded-lg text-white text-sm font-medium"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>추가</button>
            </div>

            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              style={{ colorScheme: 'dark' }} />

            {annexBookings.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-6">해당 날짜 별관 예약 없음</p>
            ) : annexBookings.map(b => {
              const room = rooms.find(r => r.id === b.room_id)
              return (
                <div key={b.id} className="mb-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{room?.name} · {b.external_name}</p>
                    <p className="text-white/40 text-xs">{b.start_hour}:00~{b.end_hour}:00 · {b.booking_type === 'monthly' ? '월렌탈' : '시간제'}</p>
                    {b.note && <p className="text-white/30 text-xs">{b.note}</p>}
                  </div>
                  <button onClick={() => deleteAnnexBooking(b.id)} className="text-red-400 text-xs">삭제</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
