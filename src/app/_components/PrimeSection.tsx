import Link from 'next/link'
import { CheckIcon } from '@/components/site/icons'

const FEATURES = [
  'Appointment & Queue Management',
  'Digital Records & Patient History',
  'Billing, Invoicing & Reports',
  'Teleconsultation & Patient Management',
  'Analytics & Insights',
]

export default function PrimeSection() {
  return (
    <section id="prime" className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="bg-[#1A1A2E] rounded-3xl overflow-hidden grid lg:grid-cols-2">
        {/* Copy */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <p className="text-sm font-medium text-[#006EFF]">Power your clinic with</p>
          <h2 className="text-3xl font-bold text-white mt-1">YesOPD Prime</h2>
          <p className="text-gray-400 mt-3 max-w-sm">
            The all-in-one clinic management solution for modern healthcare providers.
          </p>

          <ul className="mt-6 space-y-2.5">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-200">
                <span className="w-5 h-5 rounded-full bg-[#006EFF]/20 text-[#4C9BFF] flex items-center justify-center shrink-0">
                  <CheckIcon className="w-3 h-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/auth/signup"
              className="bg-[#006EFF] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#0058CC] transition"
            >
              Explore YesOPD Prime
            </Link>
            <a
              href="mailto:support@yesopd.com?subject=YesOPD%20Prime%20Demo%20Request"
              className="bg-white/5 text-white text-sm font-semibold px-5 py-3 rounded-xl border border-white/15 hover:bg-white/10 transition"
            >
              Request Demo
            </a>
          </div>
        </div>

        {/* Product mockup — built from the app's real queue/appointments UI
            rather than a stock "dashboard" photo, so it doesn't misrepresent
            the product. Swap for an actual product screenshot when you have
            one you like. */}
        <div className="relative p-8 sm:p-12 flex items-center justify-center bg-gradient-to-br from-[#006EFF]/10 to-transparent">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 bg-[#F7F8FA]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
              <span className="ml-2 text-[10px] text-gray-400">yesopd.com/dashboard/clinic</span>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#1A1A2E]">Today's Queue</p>
                <span className="text-[10px] bg-[#006EFF]/10 text-[#006EFF] px-2 py-0.5 rounded-full font-medium">12 waiting</span>
              </div>
              {['Booked', 'Checked In', 'With Doctor'].map((label, i) => (
                <div key={label} className="flex items-center justify-between bg-[#F7F8FA] rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-[#006EFF]">
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-600">{label}</span>
                  </div>
                  <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-[#006EFF]" style={{ width: `${70 - i * 20}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}