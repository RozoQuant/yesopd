'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface CreateOrgInput {
  name: string
  org_type: 'CLINIC' | 'HOSPITAL'
  address_line1: string
  city: string
  state: string
  pincode?: string
  phone?: string
  email?: string
  google_maps_url?: string
}

export async function createOrgAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Guard: only CLINIC_ADMIN
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'CLINIC_ADMIN') return { error: 'Not authorised.' }

  // Guard: don't create duplicate org
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_id', user.id)
    .maybeSingle()

  if (existing) redirect('/dashboard/clinic')

  const { error } = await supabase
    .from('organizations')
    .insert({
      admin_id: user.id,
      name: formData.get('name') as string,
      org_type: formData.get('org_type') as 'CLINIC' | 'HOSPITAL',
      address_line1: formData.get('address_line1') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      pincode: (formData.get('pincode') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      google_maps_url: (formData.get('google_maps_url') as string) || null,
      status: 'PENDING', // SUPER_ADMIN approves
    })

  if (error) return { error: error.message }

  redirect('/dashboard/clinic')
}