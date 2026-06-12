import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SearchResults from './SearchResults'

export const metadata: Metadata = {
  title: 'Find Doctors — YESOPD',
  description: 'Search doctors by name, specialization or clinic and book OPD appointments.',
}

export default async function SearchPage() {
  const supabase = await createClient()

  const { data: specializations } = await supabase
    .from('specializations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-bold text-[#006EFF]">YES</span>
            <span className="text-xl font-bold text-[#1A1A2E]">OPD</span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-[#006EFF] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-1">Find a Doctor</h1>
        <p className="text-sm text-gray-500 mb-6">Search by name, specialization or clinic</p>
        <SearchResults specializations={specializations ?? []} />
      </div>
    </main>
  )
}