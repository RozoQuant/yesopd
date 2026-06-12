import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/components/LogoutButton'

export default async function StaffDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users').select('full_name').eq('id', user!.id).single()

  return (
    <main className="min-h-screen bg-[#F7F8FA] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-2xl font-bold text-[#006EFF]">YES</span>
            <span className="text-2xl font-bold text-[#1A1A2E]">OPD</span>
          </div>
          <LogoutButton />
        </div>
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">Hello, {profile?.full_name} 👋</h1>
        <p className="text-gray-500 mt-1">Staff Dashboard — Phase 3 coming next.</p>
      </div>
    </main>
  )
}