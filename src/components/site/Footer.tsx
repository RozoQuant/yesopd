import Link from 'next/link'
import {
  ShieldCheckIcon, PhoneIcon, MailIcon, ClockIcon,
  FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon,
} from './icons'

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'For Patients',
    links: [
      { label: 'Find Doctors', href: '#doctors' },
      { label: 'Find Clinics', href: '#clinics' },
      { label: 'Find Hospitals', href: '#hospitals' },
      { label: 'Teleconsultation', href: '#teleconsult' },
    ],
  },
  {
    title: 'For Providers',
    links: [
      { label: 'YesOPD Prime', href: '#prime' },
      { label: 'Clinic Registration', href: '/auth/signup' },
      { label: 'Provider Login', href: '/auth/login' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact Us', href: 'mailto:support@yesopd.com' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#006EFF] text-white flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4" />
            </span>
            <span className="text-lg font-bold text-white">
              <span className="text-[#4C9BFF]">Yes</span>OPD
            </span>
          </div>
          <p className="text-sm mt-4 max-w-xs">
            Find and book OPD appointments with doctors, clinics, and hospitals near you.
          </p>
          <div className="flex items-center gap-3 mt-5">
            {[FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social link"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#006EFF] hover:text-white transition"
              >
                <Icon />
              </a>
            ))}
          </div>
        </div>

        {COLUMNS.map(col => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-white mb-3">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map(link => (
                <li key={link.label}>
                  {link.href.startsWith('/') ? (
                    <Link href={link.href} className="text-sm hover:text-white transition">{link.label}</Link>
                  ) : (
                    <a href={link.href} className="text-sm hover:text-white transition">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <p className="text-sm font-semibold text-white mb-3">Help &amp; Support</p>
          <ul className="space-y-2.5">
            <li className="flex items-center gap-2 text-sm">
              <PhoneIcon className="w-3.5 h-3.5 shrink-0" /> +91 123 456 7890
            </li>
            <li className="flex items-center gap-2 text-sm">
              <MailIcon className="w-3.5 h-3.5 shrink-0" /> support@yesopd.com
            </li>
            <li className="flex items-center gap-2 text-sm">
              <ClockIcon className="w-3.5 h-3.5 shrink-0" /> Mon – Sat: 9:00 AM – 8:00 PM
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} YesOPD. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}