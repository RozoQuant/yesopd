import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  switch (profile?.role) {
    case 'SUPER_ADMIN':
      redirect('/dashboard/admin')

    case 'CLINIC_ADMIN':
      redirect('/dashboard/clinic')

    case 'STAFF':
      redirect('/dashboard/staff')

    case 'PATIENT':
      redirect('/dashboard/patient')

    default:
      redirect('/auth/login')
  }
}