'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_REDIRECTS, UserRole } from '@/types'

// ── SIGNUP ────────────────────────────────────────────────────

export async function signupAction(formData: FormData) {
  const supabase = await createClient()

  const full_name = formData.get('full_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = (formData.get('role') as UserRole) ?? 'PATIENT'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Picked up by handle_new_user trigger
      data: { full_name, role },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Trigger auto-inserted the user row.
  // Redirect to their dashboard.
  redirect(ROLE_REDIRECTS[role])
}

// ── LOGIN ─────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  // Fetch role from public.users
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const role = profile?.role as UserRole | undefined
  redirect(role ? ROLE_REDIRECTS[role] : '/auth/login')
}

// ── LOGOUT ────────────────────────────────────────────────────

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}