'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, Room } from '@/lib/supabase'

const SUPER_ADMIN = 'noid80@hanmail.net'
const HOURS = Array.from({ length: 11 }, (_, i) => i + 11)

function todayStr() { return new Date().toISOString().slice(0, 10) }

type PendingAccount = Account & { email?: string }

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'schedule' | 'annex' | 'admins' | 'locks'>('users')
  const [myEmail, setMyEmail] = useState('')
  const [pending, setPending] = useState<PendingAccount[]>([])
  const [approved, setApproved] = useState<Account[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [date, setDate] = useState(todayStr())
  const [classes, setClasses] = useState<{ id: string, room_id: string, start_hour: number, end_hour: number, instructor: string }[]>([])
  const [annexBookings, setAnnexBookings] = useState<{ id: string, room_id: string, date: string, start_hour: number, end_hour: number, booking_type: string, external_name: string | null, note: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState<{ id: string, email: string | null, user_id: string | null }[]>([])
  const [newAdminEmail, setNewAdminEmail] = useState('')


  const [annexRoom, setAnnexRoom] = useState('')
  const [annexDate, setAnnexDate] = useState(todayStr())
  const [annexStart, setAnnexStart] = useState(11)
  const [annexEnd, setAnnexEnd] = useState(12)
  const [annexType, setAnnexType] = useState<'external' | 'monthly'>('external')
  const [annexName, setAnnexName] = useState('')
  const [annexNote, setAnnexNote] = useState('')
  const [monthlyStart, setMonthlyStart] = useState(todayStr())
  const [monthlyEnd, setMonthlyEnd] = useState(todayStr())
  const [monthlyRentals, setMonthlyRentals] = useState<{ id: string, room_id: string, date: string, end_date: string, external_name: string | null, note: string | null }[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/'; return }
      const email = session.user.email ?? ''
      const uid = session.user.id
      const { data } = await supabase.from('admins').select('id')
        .or(`email.eq.${email},user_id.eq.${uid}`).maybeSingle()
      if (!data) { window.location.href = '/'; return }
      setMyEmail(email)
      loadAll()
    })
  }, [])

  useEffect(() => { if (rooms.length) loadSchedule() }, [date, rooms])

  async function loadAll() {
    setLoading(true)
    const [pendingRes, approvedRes, roomsRes, adminsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('accounts').select('*').eq('status', 'approved').order('name'),
      supabase.from('rooms').select('*').order('building').order('display_order'),
      supabase.from('admins').select('*').order('created_at'),
    ])
    if (roomsRes.error) alert('rooms 오류: ' + roomsRes.error.message)
    setPending(pendingRes.data || [])
    setApproved(approvedRes.data || [])
    setRooms(roomsRes.data || [])
    setAdmins(adminsRes.data || [])
    setLoading(false)
  }

  async function loadSchedule() {
    const mainRoomIds = rooms.filter(r => r.building === 'main').map(r => r.id)
    const annexRoomIds = rooms.filter(r => r.building === 'annex').map(r => r.id)
    const [clsRes, annexRes, monthlyRes] = await Promise.all([
      supabase.from('class_schedules').select('*').eq('date', date).in('room_id', mainRoomIds),
      supabase.from('bookings').select('*').eq('date', date).in('room_id', annexRoomIds).eq('booking_type', 'external'),
      supabase.from('bookings').select('*').in('room_id', annexRoomIds).eq('booking_type', 'monthly').order('date'),
    ])
    setClasses(clsRes.data || [])
    setAnnexBookings(annexRes.data || [])
    setMonthlyRentals(monthlyRes.data || [])
  }

  async function approveUser(id: string, type: Account['student_type']) {
    const { error } = await supabase.from('accounts').update({ status: 'approved', student_type: type }).eq('id', id)
    if (error) { alert('승인 오류: ' + error.message); return }
    await loadAll()
  }

  async function rejectUser(id: string) {
    if (!confirm('거절하시겠어요?')) return
    await supabase.from('accounts').update({ status: 'rejected' }).eq('id', id)
    await loadAll()
  }

  async function addClassFromGrid(roomId: string, hour: number) {
    const inst = window.prompt('강사명')
    if (!inst?.trim()) return
    const endInput = window.prompt('몇 시까지?', String(hour + 1))
    const endHour = parseInt(endInput || '')
    if (isNaN(endHour) || endHour <= hour || endHour > 22) { alert('올바른 종료 시간을 입력해주세요.'); return }
    const { error } = await supabase.from('class_schedules').insert({
      room_id: roomId, date, start_hour: hour, end_hour: endHour, instructor: inst.trim()
    })
    if (error) { alert('오류: ' + error.message); return }
    await loadSchedule()
  }

  async function deleteClass(id: string) {
    if (!confirm('수업을 삭제할까요?')) return
    await supabase.from('class_schedules').delete().eq('id', id)
    await loadSchedule()
  }

  async function addAnnexBooking() {
    if (!annexRoom || !annexName) return
    if (annexType === 'monthly') {
      const { error } = await supabase.from('bookings').insert({
        room_id: annexRoom, date: monthlyStart, end_date: monthlyEnd,
        start_hour: 11, end_hour: 22,
        booking_type: 'monthly', external_name: annexName, note: annexNote || null,
      })
      if (error) { alert('오류: ' + error.message); return }
    } else {
      await supabase.from('bookings').insert({
        room_id: annexRoom, date: annexDate,
        start_hour: annexStart, end_hour: annexEnd,
        booking_type: 'external', external_name: annexName, note: annexNote || null,
      })
    }
    setAnnexName(''); setAnnexNote('')
    await loadSchedule()
  }

  async function deleteAnnexBooking(id: string) {
    await supabase.from('bookings').delete().eq('id', id)
    await loadSchedule()
  }

  async function addAdmin() {
    const email = newAdminEmail.trim()
    if (!email) return
    const { error } = await supabase.from('admins').insert({ email })
    if (error) { alert('오류: ' + error.message); return }
    setNewAdminEmail('')
    await loadAll()
  }

  async function changeStudentType(id: string, type: Account['student_type']) {
    const { error } = await supabase.from('accounts').update({ student_type: type }).eq('id', id)
    if (error) { alert('오류: ' + error.message); return }
    await loadAll()
  }

  async function promoteToAdmin(account: Account) {
    if (!confirm(`${account.name}을 관리자로 지정할까요?`)) return
    const { error } = await supabase.from('admins').insert({ user_id: account.user_id })
    if (error) { alert('오류: ' + error.message); return }
    await loadAll()
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`${name} 회원을 삭제할까요? 이 작업은 되돌릴 수 없어요.`)) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) { alert('삭제 오류: ' + error.message); return }
    await loadAll()
  }

  async function toggleRoomLock(room: Room) {
    const { error } = await supabase.from('rooms').update({ is_locked: !room.is_locked }).eq('id', room.id)
    if (error) { alert('잠금 오류: ' + error.message); return }
    await loadAll()
  }

  async function removeAdmin(id: string, email: string | null) {
    if (email === SUPER_ADMIN) { alert('최고 관리자는 삭제할 수 없어요.'); return }
    if (!confirm('관리자에서 제거할까요?')) return
    await supabase.from('admins').delete().eq('id', id)
    await loadAll()
  }

  const mainRooms = rooms.filter(r => r.building === 'main')
  const annexRooms = rooms.filter(r => r.building === 'annex')
  const adminUserIds = new Set(admins.map(a => a.user_id).filter(Boolean))

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-6 text-white text-[17px] focus:outline-none focus:border-indigo-500/50 transition'
  const selectCls = inputCls + ' cursor-pointer'

  if (loading) return <div className="min-h-screen bg-[#0c0c12] flex items-center justify-center text-white/30">로딩 중...</div>

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0c0c12' }}>
      <style>{`select option { color: #111111 !important; background: #ffffff !important; }`}</style>

      {/* 헤더 */}
      <div className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between border-b border-white/[0.07]"
        style={{ background: 'rgba(12,12,18,0.95)', backdropFilter: 'blur(20px)' }}>
        <div>
          <h1 className="text-white font-black text-lg leading-none">관리자</h1>
          <p className="text-white/30 text-xs mt-0.5">{myEmail}</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
          className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
          style={{ color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)' }}>
          로그아웃
        </button>
      </div>

      {/* 탭 */}
      <div className="flex px-4 pt-5 mb-6 gap-2">
        {([['users', '회원'], ['schedule', '본관 수업'], ['annex', '별관'], ['locks', '방 잠금'], ['admins', '관리자']] as const).map(([t, label]) => {
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-4 rounded-2xl text-base font-bold transition-all relative"
              style={{
                background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                color: active ? '#fff' : 'rgba(255,255,255,0.35)',
              }}>
              {label}
              {t === 'users' && pending.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {pending.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="px-4 space-y-3">

        {/* ── 회원 관리 ── */}
        {tab === 'users' && (
          <div className="space-y-3">
            {pending.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-3">승인 대기 {pending.length}명</p>
                {pending.map(u => (
                  <div key={u.id} className="mb-4 p-6 rounded-2xl border"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-white font-bold text-base">{u.name}</p>
                    <p className="text-white/40 text-sm mt-0.5">{u.phone}</p>
                    <p className="text-white/25 text-xs mt-0.5">{new Date(u.created_at).toLocaleDateString('ko')}</p>
                    <div className="flex gap-2 mt-4">
                      <select onChange={e => approveUser(u.id, e.target.value as Account['student_type'])}
                        className="flex-1 rounded-2xl px-5 py-5 text-base font-semibold focus:outline-none"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', colorScheme: 'dark' }}
                        defaultValue="">
                        <option value="" disabled>반 선택 후 승인</option>
                        <option value="exam">입시반</option>
                        <option value="audition">오디션반</option>
                        <option value="professional">전문반</option>
                        <option value="hobby">취미반</option>
                        <option value="admin">관리자</option>
                      </select>
                      <button onClick={() => rejectUser(u.id)}
                        className="px-5 py-5 rounded-2xl text-base font-semibold"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-3">승인된 회원 {approved.length}명</p>
            {approved.map(u => {
              const isAdmin = adminUserIds.has(u.user_id)
              const adminRecord = admins.find(a => a.user_id === u.user_id)
              return (
                <div key={u.id} className="px-6 py-5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${isAdmin ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">{u.name}</p>
                        {isAdmin && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>관리자</span>
                        )}
                      </div>
                      <p className="text-white/35 text-sm mt-0.5">{u.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={u.student_type ?? ''} onChange={e => changeStudentType(u.id, e.target.value as Account['student_type'])}
                        className="text-sm font-bold px-4 py-3 rounded-2xl focus:outline-none"
                        style={{
                          background: u.student_type === 'exam' ? 'rgba(99,102,241,0.15)' : u.student_type === 'audition' ? 'rgba(245,158,11,0.15)' : u.student_type === 'professional' ? 'rgba(16,185,129,0.15)' : u.student_type === 'admin' ? 'rgba(251,146,60,0.15)' : 'rgba(168,85,247,0.15)',
                          color: u.student_type === 'exam' ? '#a5b4fc' : u.student_type === 'audition' ? '#fde68a' : u.student_type === 'professional' ? '#6ee7b7' : u.student_type === 'admin' ? '#fed7aa' : '#d8b4fe',
                          border: 'none', colorScheme: 'dark', minWidth: '80px',
                        }}>
                        <option value="exam">입시반</option>
                        <option value="audition">오디션반</option>
                        <option value="professional">전문반</option>
                        <option value="hobby">취미반</option>
                        <option value="admin">관리자</option>
                      </select>
                      {isAdmin
                        ? <button onClick={() => adminRecord && removeAdmin(adminRecord.id, adminRecord.email ?? null)}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>해제</button>
                        : <button onClick={() => promoteToAdmin(u)}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl"
                            style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>관리자</button>
                      }
                      <button onClick={() => deleteUser(u.id, u.name)}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(248,113,113,0.6)' }}>삭제</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── 본관 수업 ── */}
        {tab === 'schedule' && (
          <div className="space-y-4">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className={inputCls} style={{ colorScheme: 'dark' }} />
            <p className="text-white/25 text-xs px-1">빈 칸 탭 → 수업 등록 · 등록된 수업 탭 → 삭제</p>
            <div className="overflow-x-auto -mx-4 px-4">
              <div style={{
                display: 'grid',
                gridTemplateColumns: `36px repeat(${mainRooms.length}, minmax(48px, 1fr))`,
                gap: '3px',
                minWidth: `${mainRooms.length * 51 + 39}px`,
              }}>
                <div />
                {mainRooms.map(r => (
                  <div key={`hdr-${r.id}`} className="flex items-center justify-center py-2.5 rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)' }}>
                    <span className="text-[10px] font-bold" style={{ color: '#a5b4fc' }}>
                      {r.name.replace('PIANO','P').replace('MIDI','M').replace('GUITAR & BASS','G&B').replace('ENSEMBLE ROOM','ENS').replace('DRUMS','DR')}
                    </span>
                  </div>
                ))}
                {HOURS.flatMap(h => [
                  <div key={`t-${h}`} className="flex items-center justify-end pr-2">
                    <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{h}</span>
                  </div>,
                  ...mainRooms.map(r => {
                    const cls = classes.find(c => c.room_id === r.id && c.start_hour <= h && h < c.end_hour)
                    if (cls) return (
                      <button key={`${h}-${r.id}`} onClick={() => deleteClass(cls.id)}
                        className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                        style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.28)' }}>
                        <span className="text-[9px] font-semibold truncate px-1" style={{ color: '#fda4af' }}>
                          {cls.instructor}
                        </span>
                      </button>
                    )
                    return (
                      <button key={`${h}-${r.id}`} onClick={() => addClassFromGrid(r.id, h)}
                        className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span className="text-[14px] font-light" style={{ color: 'rgba(255,255,255,0.1)' }}>+</span>
                      </button>
                    )
                  })
                ])}
              </div>
            </div>
          </div>
        )}

        {/* ── 별관 예약 ── */}
        {tab === 'annex' && (
          <div className="space-y-3">
            {/* 타입 선택 */}
            <div className="flex gap-2">
              {(['external', 'monthly'] as const).map(type => (
                <button key={type} onClick={() => setAnnexType(type)}
                  className="flex-1 py-5 rounded-2xl text-base font-bold transition"
                  style={{
                    background: annexType === type ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                    color: annexType === type ? '#6ee7b7' : 'rgba(255,255,255,0.35)',
                    border: annexType === type ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                  }}>
                  {type === 'external' ? '시간제' : '월렌탈'}
                </button>
              ))}
            </div>

            <div className="p-6 rounded-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white/50 text-sm font-semibold">{annexType === 'monthly' ? '월렌탈 추가' : '시간제 예약 추가'}</p>

              <select value={annexRoom} onChange={e => setAnnexRoom(e.target.value)}
                className={selectCls} style={{ colorScheme: 'dark' }}>
                <option value="">연습실 선택</option>
                {annexRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>

              {annexType === 'monthly' ? (
                <div className="flex gap-3 items-center">
                  <input type="date" value={monthlyStart} onChange={e => setMonthlyStart(e.target.value)}
                    className={inputCls + ' flex-1'} style={{ colorScheme: 'dark' }} />
                  <span className="text-white/30 text-lg">~</span>
                  <input type="date" value={monthlyEnd} onChange={e => setMonthlyEnd(e.target.value)}
                    className={inputCls + ' flex-1'} style={{ colorScheme: 'dark' }} />
                </div>
              ) : (
                <>
                  <input type="date" value={annexDate} onChange={e => setAnnexDate(e.target.value)}
                    className={inputCls} style={{ colorScheme: 'dark' }} />
                  <div className="flex gap-3">
                    <select value={annexStart} onChange={e => setAnnexStart(Number(e.target.value))}
                      className={selectCls} style={{ colorScheme: 'dark' }}>
                      {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                    <span className="text-white/30 self-center text-lg">~</span>
                    <select value={annexEnd} onChange={e => setAnnexEnd(Number(e.target.value))}
                      className={selectCls} style={{ colorScheme: 'dark' }}>
                      {HOURS.filter(h => h > annexStart).concat([22]).map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                </>
              )}

              <input value={annexName} onChange={e => setAnnexName(e.target.value)}
                placeholder="예약자명" className={inputCls} />
              <input value={annexNote} onChange={e => setAnnexNote(e.target.value)}
                placeholder="메모 (선택)" className={inputCls} />
              <button onClick={addAnnexBooking}
                className="w-full py-6 rounded-2xl text-white font-bold text-[17px]"
                style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)' }}>
                추가
              </button>
            </div>

            {/* 월렌탈 목록 */}
            {monthlyRentals.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-2">월렌탈</p>
                {monthlyRentals.map(b => {
                  const room = rooms.find(r => r.id === b.room_id)
                  const fmt = (d: string) => { const [y,m,day] = d.split('-'); return `${y}.${m}.${day}` }
                  return (
                    <div key={b.id} className="mb-2 flex items-center justify-between px-5 py-4 rounded-2xl"
                      style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
                      <div>
                        <p className="text-white font-semibold">{room?.name} · {b.external_name}</p>
                        <p className="text-sm mt-0.5" style={{ color: '#6ee7b7' }}>{fmt(b.date)} ~ {fmt(b.end_date)}</p>
                        {b.note && <p className="text-white/25 text-xs mt-0.5">{b.note}</p>}
                      </div>
                      <button onClick={() => deleteAnnexBooking(b.id)} className="text-red-400 text-sm font-medium px-4 py-2.5 rounded-xl"
                        style={{ background: 'rgba(239,68,68,0.1)' }}>삭제</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 시간제 예약 목록 */}
            <div>
              <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-2">시간제 예약 조회</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className={inputCls} style={{ colorScheme: 'dark' }} />
              {annexBookings.length === 0
                ? <p className="text-white/20 text-sm text-center py-6">해당 날짜 시간제 예약 없음</p>
                : annexBookings.map(b => {
                  const room = rooms.find(r => r.id === b.room_id)
                  return (
                    <div key={b.id} className="mt-2 flex items-center justify-between px-5 py-4 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div>
                        <p className="text-white font-semibold">{room?.name} · {b.external_name}</p>
                        <p className="text-white/40 text-sm">{b.start_hour}:00 ~ {b.end_hour}:00</p>
                        {b.note && <p className="text-white/25 text-xs mt-0.5">{b.note}</p>}
                      </div>
                      <button onClick={() => deleteAnnexBooking(b.id)} className="text-red-400 text-sm font-medium px-4 py-2.5 rounded-xl"
                        style={{ background: 'rgba(239,68,68,0.1)' }}>삭제</button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ── 방 잠금 ── */}
        {tab === 'locks' && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest">본관</p>
            {mainRooms.map(r => (
              <div key={r.id} className="flex items-center justify-between px-6 py-5 rounded-2xl"
                style={{ background: r.is_locked ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${r.is_locked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{r.is_locked ? '🔒' : '🟢'}</span>
                  <p className="text-white font-semibold">{r.name}</p>
                </div>
                <button onClick={() => toggleRoomLock(r)}
                  className="text-sm font-bold px-5 py-2.5 rounded-2xl transition"
                  style={r.is_locked
                    ? { background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }
                    : { background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                  {r.is_locked ? '잠금 해제' : '잠금'}
                </button>
              </div>
            ))}
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest pt-2">별관</p>
            {annexRooms.map(r => (
              <div key={r.id} className="flex items-center justify-between px-6 py-5 rounded-2xl"
                style={{ background: r.is_locked ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${r.is_locked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{r.is_locked ? '🔒' : '🟢'}</span>
                  <p className="text-white font-semibold">{r.name}</p>
                </div>
                <button onClick={() => toggleRoomLock(r)}
                  className="text-sm font-bold px-5 py-2.5 rounded-2xl transition"
                  style={r.is_locked
                    ? { background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }
                    : { background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                  {r.is_locked ? '잠금 해제' : '잠금'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── 관리자 관리 ── */}
        {tab === 'admins' && (
          <div className="space-y-3">
            <div className="p-6 rounded-2xl space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-white/50 text-sm font-semibold">관리자 추가</p>
              <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                placeholder="이메일 주소" type="email" className={inputCls} />
              <button onClick={addAdmin}
                className="w-full py-6 rounded-2xl text-white font-bold text-[17px]"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                추가
              </button>
            </div>

            {admins.map(a => {
              const memberName = approved.find(u => u.user_id === a.user_id)?.name
              return (
              <div key={a.id} className="flex items-center justify-between px-6 py-5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-white font-medium">{memberName ?? a.email ?? '알 수 없음'}</p>
                  {a.email && <p className="text-white/30 text-xs mt-0.5">{a.email}</p>}
                </div>
                {a.email === SUPER_ADMIN
                  ? <span className="text-[11px] font-bold text-white/20">최고 관리자</span>
                  : <button onClick={() => removeAdmin(a.id, a.email ?? null)}
                      className="text-red-400 text-sm font-medium px-4 py-2.5 rounded-xl"
                      style={{ background: 'rgba(239,68,68,0.1)' }}>삭제</button>
                }
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  )
}
