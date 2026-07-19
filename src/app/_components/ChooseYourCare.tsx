import Link from 'next/link'
import { CalendarIcon, VideoIcon, BuildingIcon, PillIcon, ArrowRightIcon } from '@/components/site/icons'

const CARDS = [
  {
    icon: CalendarIcon,
    title: 'Book Appointment',
    desc: 'Find and book an appointment easily',
    href: '#doctors',
  },
  {
    icon: VideoIcon,
    title: 'Teleconsultation',
    desc: 'Consult doctors online from your home',
    href: '#teleconsult',
  },
  {
    icon: BuildingIcon,
    title: 'Find Nearby Clinics',
    desc: 'Discover clinics near you with ease',
    href: '#clinics',
  },
  {
    icon: PillIcon,
    title: 'Order Medicines',
    desc: 'Upload prescription & order medicines online',
    href: '#',
    comingSoon: true,
  },
]

export default function ChooseYourCare() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <h2 className="text-2xl font-bold text-[#1A1A2E] text-center mb-8">Choose your care</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map(card => (
          <Link
            key={card.title}
            href={card.href}
            className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-[#006EFF] hover:shadow-md transition group"
          >
            {card.comingSoon && (
              <span className="absolute top-4 right-4 text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                Coming soon
              </span>
            )}
            <span className="w-11 h-11 rounded-xl bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF] mb-4">
              <card.icon className="w-5 h-5" />
            </span>
            <p className="font-semibold text-[#1A1A2E]">{card.title}</p>
            <p className="text-sm text-gray-400 mt-1">{card.desc}</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#006EFF] mt-3 opacity-0 group-hover:opacity-100 transition">
              Explore <ArrowRightIcon className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}