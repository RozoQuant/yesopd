'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPinIcon, ChevronDownIcon, MenuIcon, CloseIcon } from './icons'

const NAV_LINKS = [
  { label: 'Find Doctors', href: '#doctors' },
  { label: 'Find Clinics', href: '#clinics' },
  { label: 'Find Hospitals', href: '#hospitals' },
  { label: 'Teleconsultation', href: '#teleconsult' },
  { label: 'Medicines', href: '#medicines', comingSoon: true },
]

export default function Header({
  cities,
  isAuthenticated = false,
}: {
  cities: string[]
  isAuthenticated?: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [providersOpen, setProvidersOpen] = useState(false)
  const [city, setCity] = useState(cities[0] ?? 'All cities')

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-[#006EFF] text-white flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5.5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4.5" />
            </svg>
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-bold text-[#1A1A2E]">
              <span className="text-[#006EFF]">Yes</span>OPD
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="relative text-sm font-medium text-gray-600 hover:text-[#006EFF] transition"
            >
              {link.label}
              {link.comingSoon && (
                <span className="absolute -top-2.5 -right-6 text-[9px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1 py-0.5 rounded-full leading-none whitespace-nowrap">
                  Soon
                </span>
              )}
            </a>
          ))}

          <div className="relative">
            <button
              onClick={() => setProvidersOpen(o => !o)}
              onBlur={() => setTimeout(() => setProvidersOpen(false), 150)}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-[#006EFF] transition"
            >
              For Providers
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${providersOpen ? 'rotate-180' : ''}`} />
            </button>
            {providersOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-50">
                <Link href="/auth/signup" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#006EFF]">
                  Register your clinic
                </Link>
                <Link href="/auth/login" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#006EFF]">
                  Provider login
                </Link>
                <a href="#prime" className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#006EFF]">
                  YesOPD Prime
                </a>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          {/* Location selector — real distinct cities pulled from active organizations */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setLocationOpen(o => !o)}
              onBlur={() => setTimeout(() => setLocationOpen(false), 150)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#006EFF] transition px-2 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <MapPinIcon className="w-4 h-4" />
              {city}
              <ChevronDownIcon className={`transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
            </button>
            {locationOpen && cities.length > 0 && (
              <div className="absolute top-full right-0 mt-2 w-44 max-h-64 overflow-y-auto bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-50">
                {cities.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCity(c); setLocationOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      c === city ? 'text-[#006EFF] font-medium' : 'text-gray-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="bg-[#006EFF] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0058CC] transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden sm:block text-sm font-medium text-gray-700 hover:text-[#006EFF] px-3 py-2 transition"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="hidden sm:block bg-[#006EFF] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0058CC] transition"
              >
                Register
              </Link>
            </>
          )}

          <button
            onClick={() => setMobileOpen(o => !o)}
            className="lg:hidden p-2 text-gray-600 hover:text-[#006EFF] transition"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 px-4 py-4 space-y-1 bg-white">
          {NAV_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between px-2 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {link.label}
              {link.comingSoon && (
                <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </a>
          ))}
          {!isAuthenticated && (
            <Link href="/auth/signup" onClick={() => setMobileOpen(false)} className="block px-2 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
              For Providers
            </Link>
          )}
          <div className="flex gap-2 pt-3 border-t border-gray-100 mt-2">
            {isAuthenticated ? (
              <Link href="/dashboard" className="flex-1 text-center bg-[#006EFF] text-white text-sm font-semibold rounded-lg py-2.5">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="flex-1 text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-lg py-2.5">
                  Login
                </Link>
                <Link href="/auth/signup" className="flex-1 text-center bg-[#006EFF] text-white text-sm font-semibold rounded-lg py-2.5">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}