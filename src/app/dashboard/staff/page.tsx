import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffDashboardClient from './StaffDashboardClient'

export default async function StaffDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const { data: staffRow } = await supabase
    .from('staff')
    .select('org_id, designation')
    .eq('user_id', user.id)
    .single()

  if (!staffRow) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <p className="text-sm text-gray-400">Staff record not found. Contact your clinic admin.</p>
      </main>
    )
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, city')
    .eq('id', staffRow.org_id)
    .single()

  return (
    <StaffDashboardClient
      profile={{ full_name: profile?.full_name ?? '', email: profile?.email ?? user.email ?? '' }}
      designation={staffRow.designation}
      org={{ id: org?.id ?? staffRow.org_id, name: org?.name ?? '', city: org?.city ?? '' }}
    />
  )
}