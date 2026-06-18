import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'
import ClinicDashboardClient from './ClinicDashboardClient'
import { getMyOrgAction, getDoctorsForOrgAction, getSpecializationsAction } from '@/app/actions/doctor'
import { getStaffForOrgAction } from '@/app/actions/staff'


export default async function ClinicDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: org } = await getMyOrgAction()
  const { data: doctors } = org ? await getDoctorsForOrgAction(org.id) : { data: [] }
  const { data: staff } = org ? await getStaffForOrgAction(org.id) : { data: [] }
  const { data: specializations } = await getSpecializationsAction()

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[#006EFF]">YES</span>
            <span className="text-xl font-bold text-[#1A1A2E]">OPD</span>
            {org && (
              <span className="ml-3 text-sm text-gray-400">{org.name}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{profile?.full_name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {!org ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-lg font-semibold text-[#1A1A2E]">No organisation found</p>
            <p className="text-sm text-gray-500 mt-1">
              Your account has not been linked to a clinic or hospital yet. Contact support.
            </p>
          </div>
        ) : (
          <ClinicDashboardClient
            org={org}
            initialDoctors={doctors ?? []}
            initialStaff={staff ?? []}
            specializations={specializations ?? []}
          />
        )}
      </div>
    </main>
  )
}