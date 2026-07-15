'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface UpdateDoctorInput {
  doctor_id: string
  doctor_org_id: string
  full_name: string
  qualification?: string
  experience_yrs?: number
  bio?: string
  languages?: string[]
  photo_url?: string
  consultation_fee: number
  specialization_ids?: number[]
}

export async function updateDoctorAction(input: UpdateDoctorInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!input.full_name.trim()) return { error: 'Full name is required.' }

  // Ownership guard — only the clinic admin who owns this doctor's org
  // link can edit it. (addDoctorAction doesn't check this on create; adding
  // it here since edit touches an existing doctor that could, in theory,
  // be shared across orgs via doctor_organizations.)
  const { data: link } = await supabase
    .from('doctor_organizations')
    .select('id, organizations!inner ( admin_id )')
    .eq('id', input.doctor_org_id)
    .eq('doctor_id', input.doctor_id)
    .maybeSingle()

  const org = Array.isArray(link?.organizations) ? link?.organizations[0] : link?.organizations
  if (!link || org?.admin_id !== user.id) {
    return { error: 'Not authorised.' }
  }

  // 1. Update the doctor's own profile fields
  const { error: doctorErr } = await supabase
    .from('doctors')
    .update({
      full_name: input.full_name.trim(),
      qualification: input.qualification ?? null,
      experience_yrs: input.experience_yrs ?? 0,
      bio: input.bio ?? null,
      languages: input.languages ?? [],
      photo_url: input.photo_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.doctor_id)

  if (doctorErr) return { error: doctorErr.message }

  // 2. Update the consultation fee on this clinic's link to the doctor
  //    (fee lives on doctor_organizations, not doctors — same place
  //    addDoctorAction writes it on create)
  const { error: linkErr } = await supabase
    .from('doctor_organizations')
    .update({ consultation_fee: input.consultation_fee })
    .eq('id', input.doctor_org_id)

  if (linkErr) return { error: linkErr.message }

  // 3. Replace specializations — simplest correct approach: delete then
  //    reinsert, mirroring the insert addDoctorAction does on create.
  const { error: deleteErr } = await supabase
    .from('doctor_specializations')
    .delete()
    .eq('doctor_id', input.doctor_id)

  if (deleteErr) return { error: deleteErr.message }

  if (input.specialization_ids?.length) {
    const specs = input.specialization_ids.map(sid => ({
      doctor_id: input.doctor_id,
      specialization_id: sid,
    }))
    const { error: specErr } = await supabase
      .from('doctor_specializations')
      .insert(specs)
    if (specErr) return { error: specErr.message }
  }

  revalidatePath('/dashboard/clinic')
  return { success: true }
}