import Link from 'next/link'
import { specializationIcon } from '@/components/site/utils'

interface Specialization { id: number; name: string }

export default function PopularSpecialties({ specializations }: { specializations: Specialization[] }) {
  if (specializations.length === 0) return null
  const shown = specializations.slice(0, 8)

  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-bold text-[#1A1A2E] text-center mb-8">Popular Specialties</h2>
        <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-none justify-center flex-wrap">
          {shown.map(spec => {
            const Icon = specializationIcon(spec.name)
            return (
              <Link
                key={spec.id}
                href={`#doctors`}
                className="flex flex-col items-center gap-2 shrink-0 group w-20"
              >
                <span className="w-14 h-14 rounded-full bg-[#006EFF]/5 flex items-center justify-center text-[#006EFF] group-hover:bg-[#006EFF] group-hover:text-white transition">
                  <Icon className="w-6 h-6" />
                </span>
                <span className="text-xs text-gray-600 text-center leading-tight">{spec.name}</span>
              </Link>
            )
          })}

          {specializations.length > 8 && (
            <Link href="#doctors" className="flex flex-col items-center gap-2 shrink-0 group w-20">
              <span className="w-14 h-14 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-[#006EFF] group-hover:text-[#006EFF] transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <span className="text-xs text-gray-600 text-center leading-tight">View All</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}