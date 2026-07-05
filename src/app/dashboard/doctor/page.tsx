import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDoctorProfileAction } from '@/app/actions/doctor-queue'
import DoctorDashboardClient from './DoctorDashboardClient'

export default async function DoctorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const profileResult = await getDoctorProfileAction()

  if ('error' in profileResult || !profileResult.data) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <p className="text-sm text-gray-400">
          {('error' in profileResult && profileResult.error) || 'No clinic assignment found. Contact your clinic admin.'}
        </p>
      </main>
    )
  }

  const { doctor, orgs } = profileResult.data

  if (orgs.length === 0) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <p className="text-sm text-gray-400">You are not yet linked to an active clinic. Contact your clinic admin.</p>
      </main>
    )
  }

  return <DoctorDashboardClient doctor={doctor} orgs={orgs} />
}