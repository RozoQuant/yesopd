import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'
import AdminDashboardClient from './Admindashboardclient'

import {
  getAdminStatsAction,
  getOrgsAdminAction,
  getDoctorsAdminAction,
} from '@/app/actions/admin'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const [stats, orgsResult, doctorsResult] = await Promise.all([
    getAdminStatsAction(),
    getOrgsAdminAction(),
    getDoctorsAdminAction(),
  ])

  const orgs =
    orgsResult && 'data' in orgsResult
      ? orgsResult.data ?? []
      : []

  const doctors =
    doctorsResult && 'data' in doctorsResult
      ? doctorsResult.data ?? []
      : []

  return (
    <main className="min-h-screen bg-[#F7F8FA] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-2xl font-bold text-[#006EFF]">
              YES
            </span>
            <span className="text-2xl font-bold text-[#1A1A2E]">
              OPD
            </span>
          </div>

          <LogoutButton />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1A1A2E]">
            Hello, {profile?.full_name} 👋
          </h1>

          <p className="text-gray-500 mt-1">
            Super Admin Dashboard
          </p>
        </div>

        <AdminDashboardClient
          stats={stats}
          initialOrgs={orgs}
          initialDoctors={doctors}
        />
      </div>
    </main>
  )
}