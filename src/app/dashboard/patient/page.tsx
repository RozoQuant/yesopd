import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import PatientAppointments from './PatientAppointments'
import ChangePasswordLink from '@/components/ChangePasswordLink'

export default async function PatientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[#006EFF]">YES</span>
            <span className="text-xl font-bold text-[#1A1A2E]">OPD</span>
          </div>
          <div className="flex items-center gap-2">
            <ChangePasswordLink />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-semibold text-[#1A1A2E]">
            Hello, {profile?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Book or manage your OPD appointments</p>
        </div>

        {/* Book CTA */}
        <Link
          href="/dashboard/patient/book"
          className="flex items-center justify-between bg-[#006EFF] text-white rounded-2xl px-5 py-4 shadow-md shadow-blue-100"
        >
          <div>
            <p className="font-semibold text-base">Find a Doctor</p>
            <p className="text-sm text-blue-100 mt-0.5">Search by name, specialization or clinic</p>
          </div>
          <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Appointments */}
        <PatientAppointments />
      </div>
    </main>
  )
}