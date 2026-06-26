'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── TYPES ─────────────────────────────────────────────────────

export interface QueueEntry {
  appointment_id: string
  queue_number: number | null
  queue_code: string | null
  patient_name: string
  patient_phone: string | null
  slot_start: string
  slot_end: string
  status: string
  arrived_at: string | null
  checked_in_at: string | null
  source: string
  patient_notes: string | null
}

export interface SessionQueueResult {
  morning: QueueEntry[]
  evening: QueueEntry[]
}

// ── ASSIGN QUEUE NUMBER (called internally after booking) ─────

export async function assignQueueNumberAction(
  appointment_id: string,
  doctor_org_id: string,
  appt_date: string,
  slot_start: string
): Promise<{ queue_code?: string; error?: string }> {
  const supabase = await createClient()

  // Determine session from schedules
  const { data: schedules } = await supabase
    .from('doctor_schedules')
    .select('session_type, start_time, end_time')
    .eq('doctor_org_id', doctor_org_id)
    .eq('is_active', true)

  const slotTime = slot_start // "09:00"
  let session_type: 'MORNING' | 'EVENING' = 'MORNING'

  if (schedules && schedules.length > 0) {
    const match = schedules.find(
      (s) => slotTime >= s.start_time && slotTime < s.end_time
    )
    if (match?.session_type) {
      session_type = match.session_type as 'MORNING' | 'EVENING'
    }
  }

  const { data, error } = await supabase.rpc('assign_queue_number', {
    p_appointment_id: appointment_id,
    p_doctor_org_id: doctor_org_id,
    p_appt_date: appt_date,
    p_session_type: session_type,
  })

  if (error) return { error: error.message }
  return { queue_code: data as string }
}

// ── GET SESSION QUEUE (staff dashboard) ───────────────────────

export async function getSessionQueueAction(
  doctor_org_id: string,
  date?: string
): Promise<{ data?: SessionQueueResult; error?: string }> {
  const supabase = await createClient()
  const targetDate = date ?? new Date().toISOString().split('T')[0]

  const [morningRes, eveningRes] = await Promise.all([
    supabase.rpc('get_session_queue', {
      p_doctor_org_id: doctor_org_id,
      p_date: targetDate,
      p_session_type: 'MORNING',
    }),
    supabase.rpc('get_session_queue', {
      p_doctor_org_id: doctor_org_id,
      p_date: targetDate,
      p_session_type: 'EVENING',
    }),
  ])

  if (morningRes.error) return { error: morningRes.error.message }
  if (eveningRes.error) return { error: eveningRes.error.message }

  return {
    data: {
      morning: (morningRes.data ?? []) as QueueEntry[],
      evening: (eveningRes.data ?? []) as QueueEntry[],
    },
  }
}

// ── MARK ARRIVED ──────────────────────────────────────────────

export async function markArrivedAction(
  appointment_id: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({ arrived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', appointment_id)
    .in('status', ['BOOKED'])

  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ── MARK CHECKED IN ───────────────────────────────────────────

export async function markCheckedInAction(
  appointment_id: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'CHECKED_IN',
      checked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointment_id)
    .in('status', ['BOOKED'])

  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ── MARK IN PROGRESS (doctor called patient) ──────────────────

export async function markInProgressAction(
  appointment_id: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
    .eq('id', appointment_id)
    .in('status', ['CHECKED_IN'])

  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ── MARK COMPLETED ────────────────────────────────────────────

export async function markCompletedAction(
  appointment_id: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
    .eq('id', appointment_id)
    .in('status', ['IN_PROGRESS', 'CHECKED_IN'])

  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ── MARK NO SHOW ──────────────────────────────────────────────

export async function markNoShowAction(
  appointment_id: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'NO_SHOW', updated_at: new Date().toISOString() })
    .eq('id', appointment_id)
    .in('status', ['BOOKED', 'CHECKED_IN'])

  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ── GET DOCTORS FOR ORG (staff needs to switch between doctors) ─

export async function getOrgDoctorsAction(
  org_id: string
): Promise<{ data?: { doctor_org_id: string; doctor_name: string; short_code: string }[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('doctor_organizations')
    .select(`
      id,
      doctors (
        full_name,
        short_code
      )
    `)
    .eq('org_id', org_id)
    .eq('is_active', true)

  if (error) return { error: error.message }

  const mapped = (data ?? []).map((row: any) => {
    const doc = Array.isArray(row.doctors) ? row.doctors[0] : row.doctors
    return {
      doctor_org_id: row.id,
      doctor_name: doc?.full_name ?? 'Unknown',
      short_code: doc?.short_code ?? doc?.full_name?.substring(0, 3).toUpperCase() ?? 'DOC',
    }
  })

  return { data: mapped }
}