'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, Room } from '@/lib/supabase'

const SUPER_ADMIN = 'noid80@hanmail.net'
const HOURS = Array.from({ length: 11 }, (_, i) => i + 11)

function todayStr() { return new Date().toISOString().slice(0, 10) }

type PendingAccount = Account & { email?: string }

function TypeBadge({ type }: { type: string | null }) {
  const map: Record<string, { bg: string, color: string, border: string, label: string }> = {
    exam:         { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe', label: '입시반' },
    audition:     { bg: '#fefce8', color: '#d97706', border: '#fde68a', label: '오디션반' },
    professional: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: '전문반' },
    hobby:        { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff', label: '취미반' },
    admin:        { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', label: '관리자' },
  }
  const s = map[type ?? ''] ?? { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: type ?? '?' }
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>{s.label}</span>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'schedule' | 'annex' | 'admins' | 'locks'>('users')
  const [memberSort, setMemberSort] = useState<'name' | 'type' | 'date'>(() => {
    if (typeof window === 'undefined') return 'name'
    return (localStorage.getItem('memberSort') as 'name' | 'type' | 'date') || 'name'
  })
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

  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [saveTemplateModal, setSaveTemplateModal] = useState(false)
  const [saveTemplateDay, setSaveTemplateDay] = useState(0)
  const [classModal, setClassModal] = useState<{ roomId: string, hour: number } | null>(null)
  const [classInstructor, setClassInstructor] = useState('')
  const [classEndHour, setClassEndHour] = useState(12)

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

  function addClassFromGrid(roomId: string, hour: number) {
    setClassInstructor('')
    setClassEndHour(hour + 1)
    setClassModal({ roomId, hour })
  }

  async function confirmAddClass() {
    if (!classModal || !classInstructor.trim()) return
    const { roomId, hour } = classModal
    setClassModal(null)
    const { error } = await supabase.from('class_schedules').insert({
      room_id: roomId, date, start_hour: hour, end_hour: classEndHour, instructor: classInstructor.trim()
    })
    if (error) { alert('오류: ' + error.message); return }
    await loadSchedule()
  }

  function openSaveTemplateModal() {
    if (classes.length === 0) { alert('저장할 수업이 없어요.'); return }
    const dow = new Date(date).getDay()
    setSaveTemplateDay(dow === 0 ? 1 : dow)
    setSaveTemplateModal(true)
  }

  async function confirmSaveTemplate() {
    const dayNames = ['일','월','화','수','목','금','토']
    const mainRoomIds = rooms.filter(r => r.building === 'main').map(r => r.id)
    setSaveTemplateModal(false)
    setSavingTemplate(true)
    await supabase.from('class_schedule_templates').delete().eq('day_of_week', saveTemplateDay).in('room_id', mainRoomIds)
    for (const c of classes) {
      await supabase.from('class_schedule_templates').insert({
        room_id: c.room_id, day_of_week: saveTemplateDay, start_hour: c.start_hour, end_hour: c.end_hour, instructor: c.instructor
      })
    }
    setSavingTemplate(false)
    alert(`${dayNames[saveTemplateDay]}요일 기본 스케줄로 저장됐어요.`)
  }

  async function resetTemplate() {
    const dayNames = ['일','월','화','수','목','금','토']
    const mainRoomIds = rooms.filter(r => r.building === 'main').map(r => r.id)
    setSaveTemplateModal(false)
    await supabase.from('class_schedule_templates').delete().eq('day_of_week', saveTemplateDay).in('room_id', mainRoomIds)
    alert(`${dayNames[saveTemplateDay]}요일 기본 스케줄을 초기화했어요.`)
  }

  async function applyTemplate() {
    const dow = new Date(date).getDay()
    const mainRoomIds = rooms.filter(r => r.building === 'main').map(r => r.id)
    const { data: tmpl } = await supabase.from('class_schedule_templates').select('*').eq('day_of_week', dow).in('room_id', mainRoomIds)
    if (!tmpl || tmpl.length === 0) { alert('이 요일의 기본 스케줄이 없어요.\n먼저 기본 스케줄 탭에서 설정해주세요.'); return }

    if (classes.length > 0) {
      if (!confirm(`이미 등록된 수업 ${classes.length}개가 있어요.\n모두 지우고 기본 스케줄로 덮어쓸까요?`)) return
      await supabase.from('class_schedules').delete().eq('date', date).in('room_id', mainRoomIds)
    }

    setApplyingTemplate(true)
    for (const t of tmpl) {
      await supabase.from('class_schedules').insert({ room_id: t.room_id, date, start_hour: t.start_hour, end_hour: t.end_hour, instructor: t.instructor })
    }
    await loadSchedule()
    setApplyingTemplate(false)
  }

  async function deleteClass(id: string) {
    if (!confirm('수업을 삭제할까요?')) return
    await supabase.from('class_schedules').delete().eq('id', id)
    await loadSchedule()
  }

  function getAnnexBooking(roomId: string, hour: number) {
    return annexBookings.find(b => b.room_id === roomId && b.start_hour <= hour && hour < b.end_hour)
  }

  async function addAnnexFromGrid(roomId: string, hour: number) {
    const name = window.prompt('예약자명')
    if (!name?.trim()) return
    const endInput = window.prompt('몇 시까지?', String(hour + 1))
    const endHour = parseInt(endInput || '')
    if (isNaN(endHour) || endHour <= hour || endHour > 22) { alert('올바른 종료 시간을 입력해주세요.'); return }
    const { error } = await supabase.from('bookings').insert({
      room_id: roomId, date, start_hour: hour, end_hour: endHour,
      booking_type: 'external', external_name: name.trim(), note: null,
    })
    if (error) { alert('오류: ' + error.message); return }
    await loadSchedule()
  }

  async function addAnnexBooking() {
    if (!annexRoom || !annexName) return
    if (annexType === 'monthly') {
      if (monthlyEnd < monthlyStart) { alert('종료일이 시작일보다 빠를 수 없어요.'); return }
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
    if (!confirm('예약을 삭제할까요?')) return
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

  const inputCls = 'w-full bg-white border border-[#e4e4ef] rounded-2xl px-5 py-4 text-[#1e1b4b] text-[15px] focus:outline-none focus:border-indigo-400 transition placeholder:text-[#c0c0d8]'
  const selectCls = inputCls + ' cursor-pointer'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f0f8' }}>
      <p className="text-sm" style={{ color: '#b0b0cc' }}>로딩 중...</p>
    </div>
  )

  return (
    <>
    <div className="min-h-screen pb-24" style={{ background: '#f0f0f8' }}>
      <style>{`select option { color: #1e1b4b !important; background: #ffffff !important; }`}</style>

      {/* 헤더 */}
      <div className="sticky top-0 z-20 px-5 py-4 flex items-center justify-between"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e8e8f2' }}>
        <div>
          <h1 className="font-black text-lg leading-none" style={{ color: '#1e1b4b' }}>관리자</h1>
          <p className="text-xs mt-0.5" style={{ color: '#a0a0c0' }}>{myEmail}</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
          className="text-[11px] font-medium px-3 py-1.5 rounded-lg border"
          style={{ color: '#a0a0c0', background: '#f5f5fb', borderColor: '#e8e8f2' }}>
          로그아웃
        </button>
      </div>

      {/* 탭 */}
      <div className="flex px-4 pt-5 mb-5 gap-2">
        {([['users', '회원'], ['schedule', '본관 수업'], ['annex', '별관'], ['locks', '방 잠금'], ['admins', '관리자']] as const).map(([t, label]) => {
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3.5 rounded-2xl text-[13px] font-bold transition-all relative"
              style={{
                background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#ffffff',
                color: active ? '#fff' : '#a0a0c0',
                border: active ? 'none' : '1px solid #e8e8f2',
                boxShadow: active ? '0 4px 14px rgba(99,102,241,0.28)' : '0 1px 3px rgba(0,0,0,0.04)',
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
                <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#b0b0cc' }}>승인 대기 {pending.length}명</p>
                {pending.map(u => (
                  <div key={u.id} className="mb-3 p-5 rounded-2xl bg-white"
                    style={{ border: '1px solid #e8e8f2', boxShadow: '0 2px 10px rgba(99,102,241,0.08)' }}>
                    <p className="font-bold text-base" style={{ color: '#1e1b4b' }}>{u.name}</p>
                    <p className="text-sm mt-0.5" style={{ color: '#9898b8' }}>{u.phone}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#c0c0d8' }}>{new Date(u.created_at).toLocaleDateString('ko')}</p>
                    <div className="flex gap-2 mt-4">
                      <select onChange={e => approveUser(u.id, e.target.value as Account['student_type'])}
                        className="flex-1 rounded-2xl px-4 py-4 text-sm font-semibold focus:outline-none border cursor-pointer"
                        style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#6366f1', colorScheme: 'light' }}
                        defaultValue="">
                        <option value="" disabled>반 선택 후 승인</option>
                        <option value="exam">입시반</option>
                        <option value="audition">오디션반</option>
                        <option value="professional">전문반</option>
                        <option value="hobby">취미반</option>
                        <option value="admin">관리자</option>
                      </select>
                      <button onClick={() => rejectUser(u.id)}
                        className="px-5 py-4 rounded-2xl text-sm font-semibold border"
                        style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#b0b0cc' }}>승인된 회원 {approved.length}명</p>
              <div className="flex gap-1">
                {([['name','이름순'],['type','반별'],['date','등록일']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => { setMemberSort(key); localStorage.setItem('memberSort', key) }}
                    className="text-[13px] font-bold px-3 py-1.5 rounded-lg border transition"
                    style={{
                      background: memberSort === key ? '#eef2ff' : '#ffffff',
                      color: memberSort === key ? '#6366f1' : '#a0a0c0',
                      borderColor: memberSort === key ? '#c7d2fe' : '#e8e8f2',
                    }}>{label}</button>
                ))}
              </div>
            </div>
            {[...approved].sort((a, b) => {
              if (memberSort === 'name') return a.name.localeCompare(b.name, 'ko')
              if (memberSort === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              const order = ['exam','audition','professional','hobby','admin']
              return order.indexOf(a.student_type ?? '') - order.indexOf(b.student_type ?? '')
            }).map(u => {
              const isAdmin = adminUserIds.has(u.user_id)
              const adminRecord = admins.find(a => a.user_id === u.user_id)
              const typeColors: Record<string, { bg: string, color: string, border: string }> = {
                exam:         { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' },
                audition:     { bg: '#fefce8', color: '#d97706', border: '#fde68a' },
                professional: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                hobby:        { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' },
                admin:        { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
              }
              const tc = typeColors[u.student_type ?? ''] ?? { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
              return (
                <div key={u.id} className="px-5 py-4 rounded-2xl bg-white"
                  style={{ border: `1px solid ${isAdmin ? '#c7d2fe' : '#e8e8f2'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{ color: '#1e1b4b' }}>{u.name}</p>
                        {isAdmin && <TypeBadge type="admin" />}
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: '#9898b8' }}>{u.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={u.student_type ?? ''} onChange={e => changeStudentType(u.id, e.target.value as Account['student_type'])}
                        className="text-[12px] font-bold px-3 py-2 rounded-xl focus:outline-none border cursor-pointer"
                        style={{ background: tc.bg, color: tc.color, borderColor: tc.border, colorScheme: 'light', minWidth: '80px' }}>
                        <option value="exam">입시반</option>
                        <option value="audition">오디션반</option>
                        <option value="professional">전문반</option>
                        <option value="hobby">취미반</option>
                        <option value="admin">관리자</option>
                      </select>
                      {isAdmin
                        ? <button onClick={() => adminRecord && removeAdmin(adminRecord.id, adminRecord.email ?? null)}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl border"
                            style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>해제</button>
                        : <button onClick={() => promoteToAdmin(u)}
                            className="text-xs font-medium px-3 py-1.5 rounded-xl border"
                            style={{ background: '#eef2ff', color: '#6366f1', borderColor: '#c7d2fe' }}>관리자</button>
                      }
                      <button onClick={() => deleteUser(u.id, u.name)}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl border"
                        style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca', opacity: 0.7 }}>삭제</button>
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
              className={inputCls} style={{ colorScheme: 'light' }} />
            <div className="flex items-center justify-between">
              <p className="text-xs px-1" style={{ color: '#c0c0d8' }}>빈 칸 탭 → 수업 등록 · 등록된 수업 탭 → 삭제</p>
              <div className="flex gap-2">
                <button onClick={openSaveTemplateModal} disabled={savingTemplate}
                  className="text-sm font-bold px-4 py-2 rounded-xl border transition"
                  style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#86efac', opacity: savingTemplate ? 0.5 : 1 }}>
                  {savingTemplate ? '저장 중...' : '기본으로 저장'}
                </button>
                <button onClick={applyTemplate} disabled={applyingTemplate}
                  className="text-sm font-bold px-4 py-2 rounded-xl border transition"
                  style={{ background: '#eef2ff', color: '#6366f1', borderColor: '#c7d2fe', opacity: applyingTemplate ? 0.5 : 1 }}>
                  {applyingTemplate ? '적용 중...' : '기본 불러오기'}
                </button>
              </div>
            </div>
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
                    style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                    <span className="text-[10px] font-bold" style={{ color: '#6366f1' }}>
                      {r.name.replace('PIANO','P').replace('MIDI','M').replace('GUITAR & BASS','G&B').replace('ENSEMBLE ROOM','ENS').replace('DRUMS','DR')}
                    </span>
                  </div>
                ))}
                {HOURS.flatMap(h => [
                  <div key={`t-${h}`} className="flex items-center justify-end pr-2">
                    <span className="text-[11px] font-bold" style={{ color: '#a0a0c0' }}>{h}</span>
                  </div>,
                  ...mainRooms.map(r => {
                    const cls = classes.find(c => c.room_id === r.id && c.start_hour <= h && h < c.end_hour)
                    if (cls) return (
                      <button key={`${h}-${r.id}`} onClick={() => deleteClass(cls.id)}
                        className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                        style={{ background: '#fde8ef', border: '1px solid #fca5b8' }}>
                        <span className="text-[9px] font-semibold truncate px-1" style={{ color: '#e11d48' }}>
                          {cls.instructor}
                        </span>
                      </button>
                    )
                    return (
                      <button key={`${h}-${r.id}`} onClick={() => addClassFromGrid(r.id, h)}
                        className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                        style={{ background: '#f8f8fc', border: '1px solid #ebebf5' }}>
                        <span className="text-[14px] font-light" style={{ color: '#d0d0e8' }}>+</span>
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
            <div className="flex gap-2">
              {(['external', 'monthly'] as const).map(type => (
                <button key={type} onClick={() => setAnnexType(type)}
                  className="flex-1 py-4 rounded-2xl text-sm font-bold transition border"
                  style={{
                    background: annexType === type ? '#f0fdf4' : '#ffffff',
                    color: annexType === type ? '#16a34a' : '#a0a0c0',
                    borderColor: annexType === type ? '#86efac' : '#e8e8f2',
                    boxShadow: annexType === type ? '0 2px 8px rgba(22,163,74,0.12)' : 'none',
                  }}>
                  {type === 'external' ? '시간제' : '월렌탈'}
                </button>
              ))}
            </div>

            {/* 시간제: 그리드 */}
            {annexType === 'external' && (
              <div className="space-y-3">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className={inputCls} style={{ colorScheme: 'light' }} />
                <p className="text-xs px-1" style={{ color: '#c0c0d8' }}>빈 칸 탭 → 예약 등록 · 등록된 칸 탭 → 삭제</p>
                <div className="overflow-x-auto -mx-4 px-4">
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `36px repeat(${annexRooms.length}, minmax(56px, 1fr))`,
                    gap: '3px',
                    minWidth: `${annexRooms.length * 59 + 39}px`,
                  }}>
                    <div />
                    {annexRooms.map(r => (
                      <div key={`hdr-${r.id}`} className="flex items-center justify-center py-2.5 rounded-lg"
                        style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                        <span className="text-[10px] font-bold" style={{ color: '#16a34a' }}>
                          {r.name.replace('PIANO','P').replace('GUITAR & BASS','G&B')}
                        </span>
                      </div>
                    ))}
                    {HOURS.flatMap(h => [
                      <div key={`t-${h}`} className="flex items-center justify-end pr-2">
                        <span className="text-[11px] font-bold" style={{ color: '#a0a0c0' }}>{h}</span>
                      </div>,
                      ...annexRooms.map(r => {
                        const bk = getAnnexBooking(r.id, h)
                        if (bk) return (
                          <button key={`${h}-${r.id}`} onClick={() => deleteAnnexBooking(bk.id)}
                            className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                            style={{ background: '#bbf7d0', border: '1px solid #4ade80' }}>
                            <span className="text-[9px] font-semibold truncate px-1" style={{ color: '#15803d' }}>
                              {bk.external_name ?? '?'}
                            </span>
                          </button>
                        )
                        return (
                          <button key={`${h}-${r.id}`} onClick={() => addAnnexFromGrid(r.id, h)}
                            className="h-11 rounded-lg flex items-center justify-center transition active:scale-95"
                            style={{ background: '#f8f8fc', border: '1px solid #ebebf5' }}>
                            <span className="text-[14px] font-light" style={{ color: '#d0d0e8' }}>+</span>
                          </button>
                        )
                      })
                    ])}
                  </div>
                </div>
              </div>
            )}

            {/* 월렌탈: 기존 폼 유지 */}
            {annexType === 'monthly' && (
            <div className="p-5 rounded-2xl bg-white space-y-3" style={{ border: '1px solid #e8e8f2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p className="text-sm font-semibold" style={{ color: '#6b6b9a' }}>월렌탈 추가</p>
              <select value={annexRoom} onChange={e => setAnnexRoom(e.target.value)}
                className={selectCls} style={{ colorScheme: 'light' }}>
                <option value="">연습실 선택</option>
                {annexRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className="flex gap-3 items-center">
                <input type="date" value={monthlyStart} onChange={e => setMonthlyStart(e.target.value)}
                  className={inputCls + ' flex-1'} style={{ colorScheme: 'light' }} />
                <span className="text-lg" style={{ color: '#c0c0d8' }}>~</span>
                <input type="date" value={monthlyEnd} onChange={e => setMonthlyEnd(e.target.value)}
                  className={inputCls + ' flex-1'} style={{ colorScheme: 'light' }} />
              </div>
              <input value={annexName} onChange={e => setAnnexName(e.target.value)}
                placeholder="예약자명" className={inputCls} />
              <input value={annexNote} onChange={e => setAnnexNote(e.target.value)}
                placeholder="메모 (선택)" className={inputCls} />
              <button onClick={addAnnexBooking}
                className="w-full py-5 rounded-2xl text-white font-bold text-[16px]"
                style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)', boxShadow: '0 4px 14px rgba(16,185,129,0.28)' }}>
                추가
              </button>
            </div>
            )}

            {monthlyRentals.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: '#b0b0cc' }}>월렌탈</p>
                {monthlyRentals.map(b => {
                  const room = rooms.find(r => r.id === b.room_id)
                  const fmt = (d: string) => { const [y,m,day] = d.split('-'); return `${y}.${m}.${day}` }
                  return (
                    <div key={b.id} className="mb-2 flex items-center justify-between px-5 py-4 rounded-2xl bg-white"
                      style={{ border: '1px solid #bbf7d0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div>
                        <p className="font-semibold" style={{ color: '#1e1b4b' }}>{room?.name} · {b.external_name}</p>
                        <p className="text-sm mt-0.5" style={{ color: '#16a34a' }}>{fmt(b.date)} ~ {fmt(b.end_date)}</p>
                        {b.note && <p className="text-xs mt-0.5" style={{ color: '#c0c0d8' }}>{b.note}</p>}
                      </div>
                      <button onClick={() => deleteAnnexBooking(b.id)} className="text-sm font-medium px-4 py-2 rounded-xl border"
                        style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>삭제</button>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}

        {/* ── 방 잠금 ── */}
        {tab === 'locks' && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#b0b0cc' }}>본관</p>
            {mainRooms.map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-4 rounded-2xl"
                style={{ background: r.is_locked ? '#fef2f2' : '#ffffff', border: `1px solid ${r.is_locked ? '#fecaca' : '#e8e8f2'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{r.is_locked ? '🔒' : '🟢'}</span>
                  <p className="font-semibold" style={{ color: '#1e1b4b' }}>{r.name}</p>
                </div>
                <button onClick={() => toggleRoomLock(r)}
                  className="text-sm font-bold px-5 py-2.5 rounded-2xl border transition"
                  style={r.is_locked
                    ? { background: '#f0fdf4', color: '#16a34a', borderColor: '#86efac' }
                    : { background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>
                  {r.is_locked ? '잠금 해제' : '잠금'}
                </button>
              </div>
            ))}
            <p className="text-[11px] font-bold uppercase tracking-widest pt-2" style={{ color: '#b0b0cc' }}>별관</p>
            {annexRooms.map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-4 rounded-2xl"
                style={{ background: r.is_locked ? '#fef2f2' : '#ffffff', border: `1px solid ${r.is_locked ? '#fecaca' : '#e8e8f2'}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{r.is_locked ? '🔒' : '🟢'}</span>
                  <p className="font-semibold" style={{ color: '#1e1b4b' }}>{r.name}</p>
                </div>
                <button onClick={() => toggleRoomLock(r)}
                  className="text-sm font-bold px-5 py-2.5 rounded-2xl border transition"
                  style={r.is_locked
                    ? { background: '#f0fdf4', color: '#16a34a', borderColor: '#86efac' }
                    : { background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>
                  {r.is_locked ? '잠금 해제' : '잠금'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── 관리자 관리 ── */}
        {tab === 'admins' && (
          <div className="space-y-3">
            <div className="p-5 rounded-2xl bg-white space-y-3" style={{ border: '1px solid #e8e8f2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p className="text-sm font-semibold" style={{ color: '#6b6b9a' }}>관리자 추가</p>
              <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                placeholder="이메일 주소" type="email" className={inputCls} />
              <button onClick={addAdmin}
                className="w-full py-5 rounded-2xl text-white font-bold text-[16px]"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.28)' }}>
                추가
              </button>
            </div>

            {admins.map(a => {
              const memberName = approved.find(u => u.user_id === a.user_id)?.name
              return (
                <div key={a.id} className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white"
                  style={{ border: '1px solid #e8e8f2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div>
                    <p className="font-medium" style={{ color: '#1e1b4b' }}>{memberName ?? a.email ?? '알 수 없음'}</p>
                    {a.email && <p className="text-xs mt-0.5" style={{ color: '#c0c0d8' }}>{a.email}</p>}
                  </div>
                  {a.email === SUPER_ADMIN
                    ? <span className="text-[11px] font-bold" style={{ color: '#c0c0d8' }}>최고 관리자</span>
                    : <button onClick={() => removeAdmin(a.id, a.email ?? null)}
                        className="text-sm font-medium px-4 py-2 rounded-xl border"
                        style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>삭제</button>
                  }
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>

    {saveTemplateModal && (
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(30,27,75,0.25)', backdropFilter: 'blur(6px)' }}
        onClick={e => { if (e.target === e.currentTarget) setSaveTemplateModal(false) }}>
        <div style={{ background: 'white', borderRadius: 24, padding: 20, width: '100%', maxWidth: 320, boxShadow: '0 25px 50px rgba(0,0,0,0.12)', border: '1px solid #e8e8f2' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#b0b0cc' }}>요일 선택</p>
          <p style={{ fontSize: 12, marginBottom: 14, color: '#c0c0d8' }}>저장: 현재 수업을 해당 요일 기본으로 덮어씌움 · 초기화: 해당 요일 기본 삭제</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['월','화','수','목','금','토'].map((label, i) => (
              <button key={i+1} onClick={() => setSaveTemplateDay(i+1)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: saveTemplateDay === i+1 ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f3f4f6',
                  color: saveTemplateDay === i+1 ? 'white' : '#9ca3af',
                }}>{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSaveTemplateModal(false)}
              style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 600, fontSize: 14, border: '1px solid #e8e8f2', background: '#f5f5fb', color: '#a0a0c0', cursor: 'pointer' }}>취소</button>
            <button onClick={resetTemplate}
              style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 700, fontSize: 14, color: '#ef4444', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer' }}>
              초기화
            </button>
            <button onClick={confirmSaveTemplate}
              style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 700, fontSize: 14, color: 'white', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              저장
            </button>
          </div>
        </div>
      </div>
    )}

    {classModal && (
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(30,27,75,0.25)', backdropFilter: 'blur(6px)' }}
        onClick={e => { if (e.target === e.currentTarget) setClassModal(null) }}>
        <div style={{ background: 'white', borderRadius: 24, padding: 20, width: '100%', maxWidth: 320, boxShadow: '0 25px 50px rgba(0,0,0,0.12)', border: '1px solid #e8e8f2' }}>
          <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#b0b0cc' }}>{classModal.hour}:00 수업 등록</p>
          <input
            value={classInstructor} onChange={e => setClassInstructor(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmAddClass()}
            placeholder="강사명" autoFocus
            style={{ width: '100%', border: '1px solid #fca5b8', borderRadius: 16, padding: '12px 16px', fontSize: 15, outline: 'none', marginBottom: 12, color: '#1e1b4b', boxSizing: 'border-box' }} />
          <select value={classEndHour} onChange={e => setClassEndHour(Number(e.target.value))}
            style={{ width: '100%', border: '1px solid #fca5b8', borderRadius: 16, padding: '12px 16px', fontSize: 14, outline: 'none', marginBottom: 12, color: '#e11d48', background: '#fde8ef', colorScheme: 'light', cursor: 'pointer', boxSizing: 'border-box' }}>
            {Array.from({ length: 22 - classModal.hour }, (_, i) => classModal.hour + i + 1).map(h => (
              <option key={h} value={h}>{h}:00 까지</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setClassModal(null)}
              style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 600, fontSize: 14, border: '1px solid #e8e8f2', background: '#f5f5fb', color: '#a0a0c0', cursor: 'pointer' }}>취소</button>
            <button onClick={confirmAddClass} disabled={!classInstructor.trim()}
              style={{ flex: 1, padding: '12px 0', borderRadius: 16, fontWeight: 700, fontSize: 14, color: 'white', border: 'none', cursor: 'pointer', opacity: classInstructor.trim() ? 1 : 0.4, background: 'linear-gradient(135deg,#f43f5e,#e11d48)' }}>
              등록
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
