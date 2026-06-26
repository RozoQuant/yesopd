'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { assignQueueNumberAction } from './queue'

// ─── PATIENT SEARCH ───────────────────────────────────────────
export async function searchPatientsAction(query: string, _org_id: string) {
  const supabase = await createClient()
  const q = query.trim()
  if (!q) return { data: [] }

  const { data, error } = await supabase
    .from('users')
    .select(`id, full_name, phone, email, patients!inner(id, gender, dob)`)
    .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
    .eq('role', 'PATIENT')
    .limit(10)

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

// ─── TODAY'S QUEUE ────────────────────────────────────────────
export async function getQueueAction(org_id: string, date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, appt_date, slot_start, slot_end, status, source,
      patient_notes, queue_number, checked_in_at, arrived_at,
      patients!inner(
        id, gender, dob,
        users!inner(full_name, phone, email)
      ),
      doctor_organizations!inner(
        id, consultation_fee,
        doctors(full_name)
      )
    `)
    .eq('doctor_organizations.org_id', org_id)
    .eq('appt_date', date)
    .order('queue_number', { ascending: true, nullsFirst: false })
    .order('slot_start', { ascending: true })

  if (error) return { error: error.message }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    patients: Array.isArray(row.patients) ? row.patients[0] ?? null : row.patients,
    doctor_organizations: Array.isArray(row.doctor_organizations)
      ? row.doctor_organizations[0] ?? null
      : row.doctor_organizations,
  }))

  return { data: normalized }
}

// ─── CHECK-IN ─────────────────────────────────────────────────
export async function checkInPatientAction(appointment_id: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('appointments')
    .update({ arrived_at: now, checked_in_at: now, status: 'CHECKED_IN' })
    .eq('id', appointment_id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ─── ADVANCE QUEUE ────────────────────────────────────────────
export async function advanceQueueAction(appointment_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'IN_PROGRESS' })
    .eq('id', appointment_id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ─── SET STATUS ───────────────────────────────────────────────
export async function receptionistSetStatusAction(
  appointment_id: string,
  status: 'CANCELLED' | 'NO_SHOW' | 'COMPLETED',
  reason?: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update({ status, cancel_reason: reason ?? null })
    .eq('id', appointment_id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ─── REGISTER WALK-IN ─────────────────────────────────────────
// Uses the admin client (service role) to bypass RLS when creating
// a new patient user, since walk-in patients have no auth account.
// Flow:
//   1. Check by phone/email — if patient already exists, reuse them
//   2. If new: create a stub auth user via admin API → triggers insert
//      into public.users → then insert into public.patients
//   3. Insert appointment as CHECKED_IN
//   4. Assign queue number via the same RPC used by online bookings
//      (FIX: previously used a manual count which caused collisions
//       with online-booked queue numbers)

export interface WalkInInput {
  full_name: string
  phone: string
  email?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  age?: number          // converted to approximate dob server-side
  doctor_org_id: string
  appt_date: string
  slot_start: string
  slot_end: string
  patient_notes?: string
}

export async function registerWalkInAction(input: WalkInInput) {
  const admin = createAdminClient()
  const supabase = await createClient()

  let userId: string | null = null

  // ── 1. Check if patient already exists by phone ──────────────
  if (input.phone) {
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('phone', input.phone.trim())
      .eq('role', 'PATIENT')
      .maybeSingle()
    if (existing) userId = existing.id
  }

  // ── 2. Check by email if still not found ─────────────────────
  if (!userId && input.email?.trim()) {
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('email', input.email.trim().toLowerCase())
      .eq('role', 'PATIENT')
      .maybeSingle()
    if (existing) userId = existing.id
  }

  // ── 3. Create new patient if not found ───────────────────────
  if (!userId) {
    const cleanPhone = input.phone.replace(/\D/g, '')
    const placeholderEmail = input.email?.trim().toLowerCase()
      || `walkin_${cleanPhone}@walkin.yesopd`

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name.trim(),
        role: 'PATIENT',
      },
    })

    if (authErr) {
      if (authErr.message.toLowerCase().includes('already')) {
        const { data: found } = await admin
          .from('users')
          .select('id')
          .eq('email', placeholderEmail)
          .maybeSingle()
        if (found) {
          userId = found.id
        } else {
          return { error: `Could not create patient account: ${authErr.message}` }
        }
      } else {
        return { error: `Could not create patient account: ${authErr.message}` }
      }
    } else {
      userId = authData.user.id
    }

    if (userId) {
      await admin
        .from('users')
        .update({
          full_name: input.full_name.trim(),
          phone: input.phone.trim(),
          role: 'PATIENT',
          is_active: true,
        })
        .eq('id', userId)

      let dob: string | null = null
      if (input.age && input.age > 0) {
        const year = new Date().getFullYear() - input.age
        dob = `${year}-01-01`
      }

      const { error: patErr } = await admin
        .from('patients')
        .insert({
          id: userId,
          gender: input.gender ?? null,
          dob: dob,
        })

      if (patErr && !patErr.message.includes('duplicate')) {
        return { error: `Could not create patient record: ${patErr.message}` }
      }
    }
  }

  if (!userId) return { error: 'Failed to resolve patient.' }

  // ── 4. Insert appointment as CHECKED_IN (walk-ins arrive in person) ──
  const now = new Date().toISOString()
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      patient_id: userId,
      doctor_org_id: input.doctor_org_id,
      appt_date: input.appt_date,
      slot_start: input.slot_start,
      slot_end: input.slot_end,
      status: 'CHECKED_IN',
      source: 'WALK_IN',
      payment_mode: 'PAY_AT_CLINIC',
      patient_notes: input.patient_notes ?? null,
      arrived_at: now,
      checked_in_at: now,
    })
    .select('id')
    .single()

  if (apptErr) return { error: apptErr.message }

  // ── 5. Assign queue number via RPC (same as online bookings) ──
  // FIX: Previously computed queue_number as a manual count of all
  // appointments for the org+date, which caused collisions with
  // numbers already assigned by the assign_queue_number RPC for
  // online bookings. Now both paths use the same RPC so numbering
  // is always consistent and sequential.
  const { queue_code, error: queueErr } = await assignQueueNumberAction(
    appt.id,
    input.doctor_org_id,
    input.appt_date,
    input.slot_start
  )

  if (queueErr) {
    // Queue number assignment failed — appointment is saved, just warn.
    // The receptionist can manually note the queue position.
    console.error('Walk-in queue assignment failed:', queueErr)
  }

  // Re-fetch the queue_number that the RPC wrote back
  const { data: apptWithQueue } = await supabase
    .from('appointments')
    .select('queue_number')
    .eq('id', appt.id)
    .single()

  revalidatePath('/dashboard/staff')
  return {
    success: true,
    appointment_id: appt.id,
    queue_number: apptWithQueue?.queue_number ?? null,
    queue_code,
  }
}

// ─── CREATE APPOINTMENT (existing patient, phone/whatsapp) ────
export interface CreateApptInput {
  patient_id: string
  doctor_org_id: string
  appt_date: string
  slot_start: string
  slot_end: string
  patient_notes?: string
  source?: 'YESOPD' | 'PHONE' | 'WHATSAPP' | 'WALK_IN'
}

export async function createAppointmentAction(input: CreateApptInput) {
  const supabase = await createClient()

  // Duplicate check
  const { data: dup } = await supabase
    .from('appointments')
    .select('id')
    .eq('patient_id', input.patient_id)
    .eq('doctor_org_id', input.doctor_org_id)
    .eq('appt_date', input.appt_date)
    .eq('slot_start', input.slot_start)
    .in('status', ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'])
    .maybeSingle()

  if (dup) return { error: 'Patient already has a booking for this slot.' }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: input.patient_id,
      doctor_org_id: input.doctor_org_id,
      appt_date: input.appt_date,
      slot_start: input.slot_start,
      slot_end: input.slot_end,
      status: 'BOOKED',
      source: input.source ?? 'PHONE',
      payment_mode: 'PAY_AT_CLINIC',
      patient_notes: input.patient_notes ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // FIX: receptionist-created appointments for existing patients were
  // never assigned a queue number. Now uses the same RPC.
  await assignQueueNumberAction(
    data.id,
    input.doctor_org_id,
    input.appt_date,
    input.slot_start
  )

  revalidatePath('/dashboard/staff')
  return { success: true, appointment_id: data.id }
}

// ─── EDIT APPOINTMENT ─────────────────────────────────────────
export async function editAppointmentAction(
  appointment_id: string,
  updates: { slot_start?: string; slot_end?: string; appt_date?: string; patient_notes?: string }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', appointment_id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ─── GET DOCTORS FOR ORG ──────────────────────────────────────
export async function getDoctorsForOrgAction(org_id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('doctor_organizations')
    .select(`id, consultation_fee, doctors(id, full_name, qualification)`)
    .eq('org_id', org_id)
    .eq('is_active', true)

  if (error) return { error: error.message }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    doctors: Array.isArray(row.doctors) ? row.doctors[0] ?? null : row.doctors,
  }))

  return { data: normalized }
}

// ─── DAILY REPORT ─────────────────────────────────────────────
export async function getDailyReportAction(org_id: string, date: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, status, source, slot_start, slot_end,
      patients!inner(id, users!inner(full_name, phone)),
      doctor_organizations!inner(id, consultation_fee, doctors(full_name))
    `)
    .eq('doctor_organizations.org_id', org_id)
    .eq('appt_date', date)
    .in('status', ['COMPLETED', 'CHECKED_IN', 'IN_PROGRESS', 'BOOKED'])
    .order('slot_start')

  if (error) return { error: error.message }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    patients: Array.isArray(row.patients) ? row.patients[0] ?? null : row.patients,
    doctor_organizations: Array.isArray(row.doctor_organizations)
      ? row.doctor_organizations[0] ?? null
      : row.doctor_organizations,
  }))

  return { data: normalized }
}

// ─── FOLLOW-UP CHECK ──────────────────────────────────────────
export async function checkFollowUpAction(patient_id: string, doctor_org_id: string) {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    .from('appointments')
    .select('id, appt_date, status')
    .eq('patient_id', patient_id)
    .eq('doctor_org_id', doctor_org_id)
    .eq('status', 'COMPLETED')
    .gte('appt_date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('appt_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { isFollowUp: !!data, lastVisit: data?.appt_date ?? null }
}