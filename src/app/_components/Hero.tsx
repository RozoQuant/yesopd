import SearchWidget from './SearchWidget'
import { ShieldCheckIcon, LockIcon, FileTextIcon, TruckIcon, UsersIcon, StethoscopeIcon } from '@/components/site/icons'

interface Specialization { id: number; name: string }

const TRUST_BADGES = [
  { icon: ShieldCheckIcon, label: 'Verified Doctors' },
  { icon: LockIcon, label: 'Secure Consultation' },
  { icon: FileTextIcon, label: 'Digital Prescription', comingSoon: true },
  { icon: TruckIcon, label: 'Medicine Delivery', comingSoon: true },
]

export default function Hero({
  specializations,
  cities,
  patientCount,
  doctorCount,
}: {
  specializations: Specialization[]
  cities: string[]
  patientCount: string
  doctorCount: string
}) {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: copy + search */}
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1A1A2E] leading-tight">
            Your Care,<br />One Click Away!
          </h1>
          <p className="mt-4 text-gray-500 text-base max-w-md">
            Book appointments, consult doctors online, find clinics &amp; hospitals near you —
            all from one place.
          </p>

          <div className="mt-7">
            <SearchWidget specializations={specializations} cities={cities} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href="#doctors"
              className="bg-[#006EFF] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#0058CC] transition"
            >
              Book Appointment
            </a>
            <a
              href="#teleconsult"
              className="flex items-center gap-2 bg-white text-[#1A1A2E] text-sm font-semibold px-5 py-3 rounded-xl border border-gray-200 hover:border-[#006EFF] hover:text-[#006EFF] transition"
            >
              Start Teleconsultation
            </a>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
            {TRUST_BADGES.map(b => (
              <span key={b.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <b.icon className="w-4 h-4 text-[#006EFF]" />
                {b.label}
                {b.comingSoon && (
                  <span className="text-[9px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Right: hero graphic — built from a real slice of the product (a live
            queue card) rather than a stock photo, since that's the thing that
            actually differentiates YesOPD. Stat badges use real counts from
            Supabase, not hardcoded marketing numbers. */}
        <div className="relative hidden lg:flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#006EFF]/10 via-[#006EFF]/5 to-transparent rounded-[3rem]" />

          <div className="relative w-full max-w-sm bg-white rounded-3xl border border-gray-100 shadow-xl p-5 rotate-[-2deg]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF]">
                  <StethoscopeIcon className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#1A1A2E]">Dr. Sharma · Cardiology</p>
                  <p className="text-[11px] text-gray-400">City Care Clinic</p>
                </div>
              </div>
              <span className="text-[10px] font-medium bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Live queue</span>
            </div>

            {[
              { code: 'DRS-M-004', name: 'Waiting patient', status: 'With doctor', dot: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' },
              { code: 'DRS-M-005', name: 'Next in line', status: 'Checked in', dot: 'bg-teal-400', text: 'text-teal-600', bg: 'bg-teal-50' },
              { code: 'DRS-M-006', name: 'Booked slot · 11:30 AM', status: 'Waiting', dot: 'bg-blue-400', text: 'text-blue-600', bg: 'bg-blue-50' },
            ].map(row => (
              <div key={row.code} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-xs font-semibold text-[#1A1A2E]">{row.code}</p>
                  <p className="text-[11px] text-gray-400">{row.name}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full ${row.bg} ${row.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />
                  {row.status}
                </span>
              </div>
            ))}
          </div>

          {/* Floating stat badges — real counts */}
          <div className="absolute -top-2 -left-2 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF]">
              <UsersIcon className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#1A1A2E] leading-none">{patientCount}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Happy Patients</p>
            </div>
          </div>

          <div className="absolute -bottom-3 -right-2 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF]">
              <ShieldCheckIcon className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#1A1A2E] leading-none">{doctorCount}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Expert Doctors</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}