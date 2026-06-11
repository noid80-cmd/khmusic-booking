import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'implicit' },
})

export type StudentType = 'exam' | 'audition' | 'professional' | 'hobby' | 'admin'
export type AccountStatus = 'pending' | 'approved' | 'rejected'
export type Building = 'main' | 'annex'
export type BookingType = 'student' | 'external' | 'monthly' | 'blocked'

export interface Account {
  id: string
  user_id: string
  name: string
  phone: string
  student_type: StudentType | null
  status: AccountStatus
  created_at: string
}

export interface Room {
  id: string
  building: Building
  name: string
  display_order: number
  is_active: boolean
  is_locked: boolean
  lock_start_date: string | null
  lock_until: string | null
}

export interface ClassSchedule {
  id: string
  room_id: string
  date: string // YYYY-MM-DD
  start_hour: number // 11~21
  end_hour: number
  instructor: string
}

export interface Booking {
  id: string
  account_id: string | null
  room_id: string
  date: string
  start_hour: number
  end_hour: number
  booking_type: BookingType
  external_name: string | null
  note: string | null
  end_date: string | null
  created_at: string
  account?: Account
  room?: Room
}
