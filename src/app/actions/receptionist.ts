'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── PATIENT SEARCH ───────────────────────────────────────────
export async function searchPatientsAction(query: string, org_id: string) {
  const supabase = await createClient()
  const q = query.trim()
  if (!q) return { data: [] }

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      full_name,
      phone,
      email,
      patients!inner(id)
    `)
    .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
    .eq('role', 'PATIENT')
    .limit(10)

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

// ─── TODAY'S QUEUE (sorted by slot_start) ────────────────────
export async function getQueueAction(org_id: string, date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appt_date,
      slot_start,
      slot_end,
      status,
      source,
      patient_notes,
      queue_number,
      checked_in_at,
      arrived_at,
      patients!inner(
        id,
        users!inner(full_name, phone, email)
      ),
      doctor_organizations!inner(
        id,
        consultation_fee,
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

// ─── CHECK-IN PATIENT (mark arrived) ─────────────────────────
export async function checkInPatientAction(appointment_id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({
      arrived_at: new Date().toISOString(),
      status: 'CHECKED_IN',
    })
    .eq('id', appointment_id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/staff')
  return { success: true }
}

// ─── ADVANCE QUEUE (mark patient as being seen) ───────────────
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

// ─── SET STATUS (cancel, no-show, completed) ─────────────────
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

// ─── REGISTER WALK-IN PATIENT ─────────────────────────────────
export interface WalkInInput {
  full_name: string
  phone: string
  email?: string
  doctor_org_id: string
  appt_date: string
  slot_start: string
  slot_end: string
  patient_notes?: string
}

export async function registerWalkInAction(input: WalkInInput) {
  const supabase = await createClient()

  // 1. Check if user exists by phone
  let userId: string | null = null

  if (input.phone) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', input.phone)
      .eq('role', 'PATIENT')
      .maybeSingle()

    if (existing) userId = existing.id
  }

  // 2. If not found and email provided, check by email
  if (!userId && input.email) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', input.email)
      .eq('role', 'PATIENT')
      .maybeSingle()

    if (existing) userId = existing.id
  }

  // 3. Create a placeholder user if still not found
  if (!userId) {
    // Generate a placeholder email if not provided
    const placeholderEmail = input.email || `walkin_${Date.now()}@yesopd.placeholder`

    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert({
        email: placeholderEmail,
        full_name: input.full_name,
        phone: input.phone,
        role: 'PATIENT',
        is_active: true,
      })
      .select('id')
      .single()

    if (userErr) return { error: userErr.message }
    userId = newUser.id

    // Create patient record
    await supabase.from('patients').insert({ id: userId })
  }

  // 4. Get next queue number for today
  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_organizations.org_id', input.doctor_org_id)
    .eq('appt_date', input.appt_date)

  const queueNumber = (count ?? 0) + 1

  // 5. Insert appointment
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

// ─── CREATE APPOINTMENT (for existing patient) ────────────────
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

  // Check for duplicate
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
    .select(`
      id,
      consultation_fee,
      doctors(id, full_name, qualification)
    `)
    .eq('org_id', org_id)
    .eq('is_active', true)

  if (error) return { error: error.message }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    doctors: Array.isArray(row.doctors) ? row.doctors[0] ?? null : row.doctors,
  }))

  return { data: normalized }
}

// ─── DAILY INVOICE REPORT ─────────────────────────────────────
export async function getDailyReportAction(org_id: string, date: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      status,
      source,
      slot_start,
      slot_end,
      patients!inner(
        id,
        users!inner(full_name, phone)
      ),
      doctor_organizations!inner(
        id,
        consultation_fee,
        doctors(full_name)
      )
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

// ─── FOLLOW-UP VALIDATION ─────────────────────────────────────
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