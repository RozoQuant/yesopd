'use server'

import { createAdminClient } from '@/lib/supabase/admin'
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

// ── ASSIGN QUEUE NUMBER ───────────────────────────────────────
// Uses the admin client (service role) throughout so that RLS on
// `appointments`, `queue_counters`, and `doctor_organizations`
// never silently blocks reads or writes.
// Previously used createClient() (anon key) which caused the
// queue_number / queue_code write-back to silently fail when the
// authenticated user (staff/receptionist) did not own the
// appointment row.

export async function assignQueueNumberAction(
  appointment_id: string,
  doctor_org_id: string,
  appt_date: string,
  slot_start: string
): Promise<{ queue_code?: string; error?: string }> {
  // Always use admin client — bypasses RLS for all queue ops
  const supabase = createAdminClient()

  // ── 1. Determine session from slot time ──────────────────
  const { data: schedules } = await supabase
    .from('doctor_schedules')
    .select('session_type, start_time, end_time')
    .eq('doctor_org_id', doctor_org_id)
    .eq('is_active', true)

  const slotTime = slot_start.slice(0, 5) // "13:00:00" → "13:00"
  let session_type: 'MORNING' | 'EVENING' = 'MORNING'

  if (schedules && schedules.length > 0) {
    const match = schedules.find(s => {
      const start = s.start_time.slice(0, 5)
      const end   = s.end_time.slice(0, 5)
      return slotTime >= start && slotTime < end
    })
    if (match?.session_type) {
      session_type = match.session_type as 'MORNING' | 'EVENING'
    }
  }

  // ── 2. Get doctor short code for token prefix ────────────
  const { data: doctorOrg } = await supabase
    .from('doctor_organizations')
    .select('doctors(full_name, short_code)')
    .eq('id', doctor_org_id)
    .single()

  const doc = Array.isArray(doctorOrg?.doctors)
    ? doctorOrg.doctors[0]
    : doctorOrg?.doctors

  const rawCode = doc?.short_code || doc?.full_name || 'DOC'
  const docPrefix = rawCode.replace(/\s+/g, '').slice(0, 3).toUpperCase()
  const sessionPrefix = session_type === 'MORNING' ? 'M' : 'E'

  // ── 3. Atomically increment counter ─────────────────────
  const { data: existing } = await supabase
    .from('queue_counters')
    .select('id, last_number')
    .eq('doctor_org_id', doctor_org_id)
    .eq('queue_date', appt_date)
    .eq('session_type', session_type)
    .maybeSingle()

  let queue_number: number

  if (existing) {
    queue_number = existing.last_number + 1
    const { error: updateErr } = await supabase
      .from('queue_counters')
      .update({ last_number: queue_number })
      .eq('id', existing.id)

    if (updateErr) return { error: updateErr.message }
  } else {
    queue_number = 1
    const { error: insertErr } = await supabase
      .from('queue_counters')
      .insert({
        doctor_org_id,
        queue_date: appt_date,
        session_type,
        last_number: 1,
      })

    if (insertErr) {
      // Race condition: another request inserted first — re-fetch and increment
      const { data: raceRow } = await supabase
        .from('queue_counters')
        .select('id, last_number')
        .eq('doctor_org_id', doctor_org_id)
        .eq('queue_date', appt_date)
        .eq('session_type', session_type)
        .single()

      if (!raceRow) return { error: 'Failed to create queue counter' }

      queue_number = raceRow.last_number + 1
      await supabase
        .from('queue_counters')
        .update({ last_number: queue_number })
        .eq('id', raceRow.id)
    }
  }

  // ── 4. Build queue code ──────────────────────────────────
  // Format: TWO-M-001
  const queue_code = `${docPrefix}-${sessionPrefix}-${String(queue_number).padStart(3, '0')}`

  // ── 5. Write back to appointment (admin client bypasses RLS) ──
  const { error: apptErr } = await supabase
    .from('appointments')
    .update({ queue_number, queue_code })
    .eq('id', appointment_id)

  if (apptErr) return { error: apptErr.message }

  return { queue_code }
}

// ── GET SESSION QUEUE (staff dashboard) ───────────────────────

export async function getSessionQueueAction(
  doctor_org_id: string,
  date?: string
): Promise<{ data?: SessionQueueResult; error?: string }> {
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()

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

// ── MARK IN PROGRESS ──────────────────────────────────────────

export async function markInProgressAction(
  appointment_id: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'NO_SHOW', updated_at: new Date().toISOString() })
    .eq('id', appointment_id)
    .in('status', ['BOOKED', 'CHECKED_IN'])

  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ── GET DOCTORS FOR ORG ───────────────────────────────────────

export async function getOrgDoctorsAction(
  org_id: string
): Promise<{ data?: { doctor_org_id: string; doctor_name: string; short_code: string }[]; error?: string }> {
  const supabase = createAdminClient()

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