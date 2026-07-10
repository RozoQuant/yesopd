'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ── AUTH HELPERS ───────────────────────────────────────────────

async function getAuthedDoctor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: doctor } = await supabase
    .from('doctors')
    .select('id, full_name')
    .eq('user_id', user.id)
    .single()

  if (!doctor) return { error: 'No doctor profile linked to this account.' as const }
  return { doctor }
}

async function assertOwnsDoctorOrg(doctor_id: string, doctor_org_id: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('doctor_organizations')
    .select('id')
    .eq('id', doctor_org_id)
    .eq('doctor_id', doctor_id)
    .maybeSingle()
  return !!data
}

// ── PROFILE ────────────────────────────────────────────────────

export async function getDoctorProfileAction() {
  const auth = await getAuthedDoctor()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('doctor_organizations')
    .select(`
      id, consultation_fee, consultation_mode, auto_advance_queue, is_active,
      organizations ( id, name, city )
    `)
    .eq('doctor_id', auth.doctor.id)
    .eq('is_active', true)

  if (error) return { error: error.message }

  const orgs = (data ?? []).map((row: any) => ({
    ...row,
    organizations: Array.isArray(row.organizations) ? row.organizations[0] ?? null : row.organizations,
  }))

  return { data: { doctor: auth.doctor, orgs } }
}

// ── TODAY'S QUEUE ──────────────────────────────────────────────

export async function getDoctorQueueAction(doctor_org_id: string, date: string) {
  const auth = await getAuthedDoctor()
  if ('error' in auth) return { error: auth.error }
  if (!(await assertOwnsDoctorOrg(auth.doctor.id, doctor_org_id))) {
    return { error: 'Not authorised for this clinic.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('appointments')
    .select(`
      id, appt_date, slot_start, slot_end, status, source, consultation_type,
      patient_notes, queue_number, queue_code,
      patients!inner ( id, users!inner ( full_name, phone ) )
    `)
    .eq('doctor_org_id', doctor_org_id)
    .eq('appt_date', date)
    .order('queue_number', { ascending: true, nullsFirst: false })
    .order('slot_start', { ascending: true })

  if (error) return { error: error.message }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    patients: Array.isArray(row.patients) ? row.patients[0] ?? null : row.patients,
  }))

  return { data: normalized }
}

// ── QUEUE ACTIONS ──────────────────────────────────────────────

async function callNextInternal(admin: ReturnType<typeof createAdminClient>, doctor_org_id: string, date: string) {
  const { data: alreadyActive } = await admin
    .from('appointments')
    .select('id')
    .eq('doctor_org_id', doctor_org_id)
    .eq('appt_date', date)
    .eq('status', 'IN_PROGRESS')
    .maybeSingle()

  if (alreadyActive) return { error: 'A consultation is already in progress.' }

  const { data: next } = await admin
    .from('appointments')
    .select('id')
    .eq('doctor_org_id', doctor_org_id)
    .eq('appt_date', date)
    .eq('status', 'CHECKED_IN')
    .order('queue_number', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (!next) return { error: 'No patients waiting.' }

  const { error } = await admin
    .from('appointments')
    .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
    .eq('id', next.id)

  if (error) return { error: error.message }
  return { success: true, appointment_id: next.id }
}

export async function doctorCallNextAction(doctor_org_id: string, date: string) {
  const auth = await getAuthedDoctor()
  if ('error' in auth) return { error: auth.error }
  if (!(await assertOwnsDoctorOrg(auth.doctor.id, doctor_org_id))) {
    return { error: 'Not authorised for this clinic.' }
  }
  const result = await callNextInternal(createAdminClient(), doctor_org_id, date)
  revalidatePath('/dashboard/doctor')
  return result
}

export async function doctorStartAppointmentAction(appointment_id: string, doctor_org_id: string) {
  const auth = await getAuthedDoctor()
  if ('error' in auth) return { error: auth.error }
  if (!(await assertOwnsDoctorOrg(auth.doctor.id, doctor_org_id))) {
    return { error: 'Not authorised for this clinic.' }
  }

  const admin = createAdminClient()
  const { data: alreadyActive } = await admin
    .from('appointments')
    .select('id')
    .eq('doctor_org_id', doctor_org_id)
    .eq('status', 'IN_PROGRESS')
    .maybeSingle()

  if (alreadyActive) return { error: 'A consultation is already in progress. Complete it first.' }

  const { error } = await admin
    .from('appointments')
    .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
    .eq('id', appointment_id)
    .eq('doctor_org_id', doctor_org_id)
    .eq('status', 'CHECKED_IN')

  if (error) return { error: error.message }
  revalidatePath('/dashboard/doctor')
  return { success: true }
}

export async function doctorCompleteConsultAction(appointment_id: string, doctor_org_id: string, date: string) {
  const auth = await getAuthedDoctor()
  if ('error' in auth) return { error: auth.error }
  if (!(await assertOwnsDoctorOrg(auth.doctor.id, doctor_org_id))) {
    return { error: 'Not authorised for this clinic.' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('appointments')
    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
    .eq('id', appointment_id)
    .eq('doctor_org_id', doctor_org_id)
    .in('status', ['IN_PROGRESS', 'CHECKED_IN'])

  if (error) return { error: error.message }

  const { data: orgSettings } = await admin
    .from('doctor_organizations')
    .select('auto_advance_queue')
    .eq('id', doctor_org_id)
    .single()

  let autoAdvanced = false
  if (orgSettings?.auto_advance_queue) {
    const r = await callNextInternal(admin, doctor_org_id, date)
    autoAdvanced = !!r.success
  }

  revalidatePath('/dashboard/doctor')
  return { success: true, autoAdvanced }
}

export async function doctorNoShowAction(appointment_id: string, doctor_org_id: string) {
  const auth = await getAuthedDoctor()
  if ('error' in auth) return { error: auth.error }
  if (!(await assertOwnsDoctorOrg(auth.doctor.id, doctor_org_id))) {
    return { error: 'Not authorised for this clinic.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('appointments')
    .update({ status: 'NO_SHOW', updated_at: new Date().toISOString() })
    .eq('id', appointment_id)
    .eq('doctor_org_id', doctor_org_id)
    .in('status', ['BOOKED', 'CHECKED_IN'])

  if (error) return { error: error.message }
  revalidatePath('/dashboard/doctor')
  return { success: true }
}

export async function toggleAutoAdvanceAction(doctor_org_id: string, enabled: boolean) {
  const auth = await getAuthedDoctor()
  if ('error' in auth) return { error: auth.error }
  if (!(await assertOwnsDoctorOrg(auth.doctor.id, doctor_org_id))) {
    return { error: 'Not authorised for this clinic.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('doctor_organizations')
    .update({ auto_advance_queue: enabled })
    .eq('id', doctor_org_id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/doctor')
  return { success: true }
}