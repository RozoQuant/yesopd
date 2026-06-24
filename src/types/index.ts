export type UserRole = 'PATIENT' | 'CLINIC_ADMIN' | 'STAFF' | 'SUPER_ADMIN'
export type OrgType = 'CLINIC' | 'HOSPITAL'
export type OrgStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export type DoctorStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
export type AppointmentStatus = 'BOOKED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type AppointmentSource = 'YESOPD' | 'WALK_IN' | 'PHONE' | 'WHATSAPP'
export type PaymentMode = 'PAY_AT_CLINIC' | 'ADVANCE_PAYMENT' | 'PARTIAL_PAYMENT'
export type NotificationType = 'BOOKING_CONFIRMATION' | 'APPOINTMENT_REMINDER' | 'APPOINTMENT_CANCELLATION'
export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface User {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  admin_id: string
  name: string
  org_type: OrgType
  status: OrgStatus
  address_line1: string | null
  address_line2: string | null
  city: string
  state: string
  pincode: string | null
  phone: string | null
  email: string | null
  google_maps_url: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface Doctor {
  id: string
  user_id: string | null
  full_name: string
  photo_url: string | null
  qualification: string | null
  experience_yrs: number
  bio: string | null
  languages: string[]
  status: DoctorStatus
  is_approved: boolean
  specializations?: {
    id: number
    name: string
  }[]
  created_at: string
  updated_at: string
}

export interface DoctorOrganization {
  id: string
  doctor_id: string
  org_id: string
  consultation_fee: number
  is_active: boolean
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_org_id: string
  appt_date: string
  slot_start: string
  slot_end: string
  status: AppointmentStatus
  source: AppointmentSource
  payment_mode: PaymentMode
  patient_notes: string | null
  cancel_reason: string | null
  queue_number: number | null
  checked_in_at: string | null
  arrived_at: string | null
  booked_at: string
  updated_at: string
}

// Role → default redirect map
export const ROLE_REDIRECTS: Record<UserRole, string> = {
  PATIENT: '/dashboard/patient',
  CLINIC_ADMIN: '/dashboard/clinic',
  STAFF: '/dashboard/staff',
  SUPER_ADMIN: '/dashboard/admin',
}

// Protected route prefixes per role
export const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/dashboard/patient': ['PATIENT'],
  '/dashboard/clinic': ['CLINIC_ADMIN'],
  '/dashboard/staff': ['STAFF', 'CLINIC_ADMIN'],
  '/dashboard/admin': ['SUPER_ADMIN'],
}