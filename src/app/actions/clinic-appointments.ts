'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClinicAppointmentsAction(
  org_id: string,
  date?: string
) {
  const supabase = await createClient()
  const target = date ?? new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appt_date,
      slot_start,
      slot_end,
      status,
      patient_notes,
      booked_at,
      patients!inner (
        id,
        users!inner (
          full_name,
          phone,
          email
        )
      ),
      doctor_organizations!inner (
        id,
        doctors (
          full_name
        )
      )
    `)
    .eq('doctor_organizations.org_id', org_id)
    .eq('appt_date', target)
    .order('slot_start')

  if (error) {
    return { error: error.message }
  }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    patients: Array.isArray(row.patients)
      ? row.patients[0] ?? null
      : row.patients,
    doctor_organizations: Array.isArray(row.doctor_organizations)
      ? row.doctor_organizations[0] ?? null
      : row.doctor_organizations,
  }))

  return { data: normalized }
}

export async function setAppointmentStatusAction(
  appointment_id: string,
  status: 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointment_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/clinic')

  return { success: true }
}