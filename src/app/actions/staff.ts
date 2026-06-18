'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface AddStaffInput {
  org_id: string
  full_name: string
  phone: string
  email?: string
  designation:
    | 'RECEPTIONIST'
    | 'CABIN_ATTENDANT'
    | 'NURSE'
    | 'OTHER'
}

export async function addStaffAction(input: AddStaffInput) {
  const supabase = await createClient()
  const admin = createAdminClient()

  return {
    success: false,
    message: 'Implementation pending',
  }
}

export async function getStaffForOrgAction(org_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staff')
    .select(`
      id,
      designation,
      is_active,
      users (
        id,
        full_name,
        phone,
        email,
        is_active
      )
    `)
    .eq('org_id', org_id)
    .order('created_at')

  if (error) {
    return { error: error.message }
  }

  const normalized = (data ?? []).map((row: any) => ({
    ...row,
    users: Array.isArray(row.users)
      ? row.users[0] ?? null
      : row.users,
  }))

  return { data: normalized }
}