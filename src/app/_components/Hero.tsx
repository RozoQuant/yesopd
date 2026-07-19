import Image from 'next/image'
import SearchWidget from './SearchWidget'
import { ShieldCheckIcon, LockIcon, FileTextIcon, TruckIcon, UsersIcon } from '@/components/site/icons'

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

        {/* Right: hero photo + real stat badges (not hardcoded numbers) */}
        <div className="relative hidden lg:flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#006EFF]/10 via-[#006EFF]/5 to-transparent rounded-[3rem]" />

          <div className="relative w-full max-w-sm aspect-[4/5]">
            <Image
              src="/images/doctor-hero.png"
              alt="YesOPD doctor"
              fill
              priority
              className="object-contain object-bottom drop-shadow-2xl"
            />
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