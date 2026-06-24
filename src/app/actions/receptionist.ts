'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

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
  const { error } = await supabase
    .from('appointments')
    .update({ arrived_at: new Date().toISOString(), status: 'CHECKED_IN' })
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
//   3. Insert appointment as CHECKED_IN with queue number

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
    // Use a placeholder email — walk-in patients don't need to sign in
    // Format: walkin_<phone>@walkin.yesopd so it's identifiable
    const cleanPhone = input.phone.replace(/\D/g, '')
    const placeholderEmail = input.email?.trim().toLowerCase()
      || `walkin_${cleanPhone}@walkin.yesopd`

    // Step A: create a stub in auth.users via admin API
    // This also fires the trigger that inserts into public.users
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,          // skip email confirmation
      user_metadata: {
        full_name: input.full_name.trim(),
        role: 'PATIENT',
      },
    })

    if (authErr) {
      // If email already taken in auth (edge case), find the user
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
      // Step B: update public.users with phone + full_name
      // (the trigger may set full_name from metadata already, but we ensure it)
      await admin
        .from('users')
        .update({
          full_name: input.full_name.trim(),
          phone: input.phone.trim(),
          role: 'PATIENT',
          is_active: true,
        })
        .eq('id', userId)

      // Step C: compute approximate dob from age
      let dob: string | null = null
      if (input.age && input.age > 0) {
        const year = new Date().getFullYear() - input.age
        dob = `${year}-01-01`
      }

      // Step D: insert into patients table
      const { error: patErr } = await admin
        .from('patients')
        .insert({
          id: userId,
          gender: input.gender ?? null,
          dob: dob,
        })

      // Ignore if patients row already exists (upsert semantics)
      if (patErr && !patErr.message.includes('duplicate')) {
        return { error: `Could not create patient record: ${patErr.message}` }
      }
    }
  }

  if (!userId) return { error: 'Failed to resolve patient.' }

  // ── 4. Next queue number for this org+date ────────────────────
  // Count existing appointments for this org on this date
  const { data: existingAppts } = await admin
    .from('appointments')
    .select('id, doctor_organizations!inner(org_id)')
    .eq('doctor_organizations.org_id', input.doctor_org_id)
    .eq('appt_date', input.appt_date)

  const queueNumber = (existingAppts?.length ?? 0) + 1

  // ── 5. Insert appointment ─────────────────────────────────────
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
      queue_number: queueNumber,
      arrived_at: new Date().toISOString(),
      checked_in_at: new Date().toISOString(),
    })
    .select('id, queue_number')
    .single()

  if (apptErr) return { error: apptErr.message }

  revalidatePath('/dashboard/staff')
  return { success: true, appointment_id: appt.id, queue_number: appt.queue_number }
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