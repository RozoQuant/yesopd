'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── ORGANIZATIONS ─────────────────────────────────────────────

export async function getOrgsAdminAction(status?: string) {
  const supabase = await createClient()
  let q = supabase
    .from('organizations')
    .select('*, users!admin_id(full_name, email)')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return { error: error.message }
  return { data }
}

export async function setOrgStatusAction(org_id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations').update({ status }).eq('id', org_id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// ── DOCTORS ───────────────────────────────────────────────────

export async function getDoctorsAdminAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      id, full_name, qualification, status, is_approved, created_at,
      doctor_organizations ( organizations ( name, city ) )
    `)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message }
  return { data }
}

export async function approveDoctorAction(doctor_id: string, approve: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('doctors')
    .update({ is_approved: approve })
    .eq('id', doctor_id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/admin')
  return { success: true }
}

// ── STATS ─────────────────────────────────────────────────────

export async function getAdminStatsAction() {
  const supabase = await createClient()

  const [orgs, doctors, patients, appointments] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('doctors').select('*', { count: 'exact', head: true }),
    supabase.from('patients').select('*', { count: 'exact', head: true }),
    supabase.from('appointments').select('*', { count: 'exact', head: true }),
  ])

  return {
    orgs: orgs.count ?? 0,
    doctors: doctors.count ?? 0,
    patients: patients.count ?? 0,
    appointments: appointments.count ?? 0,
  }
}