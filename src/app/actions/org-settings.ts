'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface UpdateOrgInput {
  name: string
  address_line1?: string
  address_line2?: string
  city: string
  state: string
  pincode?: string
  phone?: string
  email?: string
  google_maps_url?: string
  logo_url?: string
}

export async function updateOrgAction(org_id: string, input: UpdateOrgInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Only the org's own CLINIC_ADMIN can edit it.
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('admin_id')
    .eq('id', org_id)
    .single()

  if (orgErr || !org) return { error: 'Organisation not found.' }
  if (org.admin_id !== user.id) return { error: 'Not authorised.' }

  if (!input.name.trim()) return { error: 'Clinic name is required.' }
  if (!input.city.trim() || !input.state.trim()) return { error: 'City and state are required.' }

  const { error } = await supabase
    .from('organizations')
    .update({
      name: input.name.trim(),
      address_line1: input.address_line1?.trim() || null,
      address_line2: input.address_line2?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      google_maps_url: input.google_maps_url?.trim() || null,
      logo_url: input.logo_url?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', org_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/clinic')
  return { success: true }
}