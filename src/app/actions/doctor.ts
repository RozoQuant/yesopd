'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// ── ADD DOCTOR TO ORG ─────────────────────────────────────────

export interface AddDoctorInput {
  org_id: string
  full_name: string
  qualification?: string
  experience_yrs?: number
  bio?: string
  languages?: string[]
  photo_url?: string
  consultation_fee: number
  specialization_ids?: number[]
}

export async function addDoctorAction(input: AddDoctorInput) {
  const supabase = await createClient()

  console.log('================ ADD DOCTOR START ================')
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('ACTION USER:', user?.id)

  console.log('INPUT:', JSON.stringify(input, null, 2))

  // 1. Insert doctor
  const { data: doctor, error: doctorErr } = await supabase
    .from('doctors')
    .insert({
      full_name: input.full_name,
      qualification: input.qualification ?? null,
      experience_yrs: input.experience_yrs ?? 0,
      bio: input.bio ?? null,
      languages: input.languages ?? [],
      photo_url: input.photo_url ?? null,
      status: 'ACTIVE',
      is_approved: true,
    })
    .select('id')
    .single()

  console.log('DOCTOR INSERT RESULT:')
  console.log('doctor =', doctor)
  console.log('doctorErr =', doctorErr)

  if (doctorErr) {
    console.error('DOCTOR INSERT FAILED:', doctorErr)
    return { error: doctorErr.message }
  }

  // 2. Link doctor to org
  const { data: doctorOrg, error: linkErr } = await supabase
    .from('doctor_organizations')
    .insert({
      doctor_id: doctor.id,
      org_id: input.org_id,
      consultation_fee: input.consultation_fee,
      is_active: true,
    })
    .select('id')
    .single()

  console.log('DOCTOR ORG INSERT RESULT:')
  console.log('doctorOrg =', doctorOrg)
  console.log('linkErr =', linkErr)

  if (linkErr) {
    console.error('DOCTOR ORG LINK FAILED:', linkErr)
    return { error: linkErr.message }
  }

  // 3. Add specializations
  if (input.specialization_ids?.length) {
    const specs = input.specialization_ids.map(sid => ({
      doctor_id: doctor.id,
      specialization_id: sid,
    }))

    console.log('INSERTING SPECIALIZATIONS:', specs)

    const { error: specErr } = await supabase
      .from('doctor_specializations')
      .insert(specs)

    console.log('SPECIALIZATION ERROR =', specErr)

    if (specErr) {
      console.error('SPECIALIZATION INSERT FAILED:', specErr)
      return { error: specErr.message }
    }
  }

  // 4. Create default booking rules for this doctor+org
  const { error: bookingErr } = await supabase
    .from('booking_rules')
    .insert({
      doctor_org_id: doctorOrg.id,
      same_day_booking: true,
      online_booking_enabled: true,
      advance_booking_days: 7,
    })

  console.log('BOOKING RULE ERROR =', bookingErr)

  if (bookingErr) {
    console.error('BOOKING RULE INSERT FAILED:', bookingErr)
    return { error: bookingErr.message }
  }

  console.log('SUCCESS!')
  console.log('doctor_id =', doctor.id)
  console.log('doctor_org_id =', doctorOrg.id)
  console.log('================ ADD DOCTOR END ================')

  revalidatePath('/dashboard/clinic')

  return {
    success: true,
    doctor_id: doctor.id,
    doctor_org_id: doctorOrg.id,
  }
}

// ── LIST DOCTORS FOR ORG ──────────────────────────────────────

export async function getDoctorsForOrgAction(org_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('doctor_organizations')
    .select(`
      id,
      consultation_fee,
      is_active,
      doctors (
        id,
        full_name,
        email,
        account_status,
        qualification,
        experience_yrs,
        status,
        is_approved,
        photo_url,
        languages,
        doctor_specializations (
          specializations ( id, name )
        )
      )
    `)
    .eq('org_id', org_id)
    .order('created_at')

  if (error) return { error: error.message }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    doctors: Array.isArray(row.doctors)
      ? row.doctors[0] ?? null
      : row.doctors,
  }))

  return { data: normalized }
}

// ── UPDATE DOCTOR STATUS ──────────────────────────────────────

export async function setDoctorActiveAction(doctor_org_id: string, is_active: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('doctor_organizations')
    .update({ is_active })
    .eq('id', doctor_org_id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clinic')
  return { success: true }
}

// ── GET SPECIALIZATIONS (for add doctor form) ─────────────────

export async function getSpecializationsAction() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('specializations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) return { error: error.message }
  return { data }
}

// ── GET CLINIC ADMIN'S OWN ORG ────────────────────────────────

export async function getMyOrgAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('admin_id', user.id)
    .single()

    console.log('AUTH USER ID:', user.id)
    console.log('ORG RESULT:', data)
    console.log('ORG ERROR:', error)


    if (error) return { error: error.message }
  return { data }
}

// ── INVITE DOCTOR TO PORTAL ───────────────────────────────────────

export async function inviteDoctorAction(doctor_id: string, email: string) {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { success: false, message: 'Not authenticated' }

  const { data: callerProfile } = await supabase
    .from('users').select('role').eq('id', caller.id).single()
  if (callerProfile?.role !== 'CLINIC_ADMIN') {
    return { success: false, message: 'Not authorised.' }
  }

  const admin = createAdminClient()
  const cleanEmail = email.trim().toLowerCase()

  const { data: doctor } = await admin
    .from('doctors')
    .select('id, full_name, account_status')
    .eq('id', doctor_id)
    .single()

  if (!doctor) return { success: false, message: 'Doctor not found.' }
  if (doctor.account_status !== 'NOT_INVITED') {
    return { success: false, message: 'Doctor already has portal access or a pending invite.' }
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
    redirectTo:
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/auth/confirm'
        : 'https://www.yesopd.com/auth/confirm',
    data: {
      full_name: doctor.full_name,
      role: 'DOCTOR',
    },
  })

  if (inviteError) return { success: false, message: inviteError.message }

  const userId = invited.user?.id
  if (!userId) return { success: false, message: 'Failed to create doctor account.' }

  const { error: updateErr } = await admin
    .from('doctors')
    .update({ user_id: userId, email: cleanEmail, account_status: 'INVITED' })
    .eq('id', doctor_id)

  if (updateErr) return { success: false, message: updateErr.message }

  revalidatePath('/dashboard/clinic')
  return { success: true, message: 'Invite sent successfully.' }
}