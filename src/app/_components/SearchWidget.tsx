'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SearchIcon, MapPinIcon } from '@/components/site/icons'

interface Specialization { id: number; name: string }

interface DoctorResult {
  doctor_org_id: string
  doctor_id: string
  doctor_name: string
  qualification: string | null
  experience_yrs: number
  photo_url: string | null
  specializations: string[]
  org_name: string
  org_city: string
  org_address: string | null
  consultation_fee: number
  consultation_mode: 'IN_PERSON' | 'TELECONSULT' | 'BOTH'
}

type Tab = 'DOCTORS' | 'CLINICS' | 'HOSPITALS' | 'SPECIALTIES'

const TABS: { key: Tab; label: string; placeholder: string }[] = [
  { key: 'DOCTORS', label: 'Doctors', placeholder: 'Search doctors, name, specialty…' },
  { key: 'CLINICS', label: 'Clinics', placeholder: 'Search clinics by name or area…' },
  { key: 'HOSPITALS', label: 'Hospitals', placeholder: 'Search hospitals by name or area…' },
  { key: 'SPECIALTIES', label: 'Specialties', placeholder: 'e.g. Cardiology, Dermatology…' },
]

export default function SearchWidget({
  specializations,
  cities,
}: {
  specializations: Specialization[]
  cities: string[]
}) {
  const [tab, setTab] = useState<Tab>('DOCTORS')
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [results, setResults] = useState<DoctorResult[] | null>(null)
  const [loading, setLoading] = useState(false)

  // Every tab searches the same underlying doctor/clinic index — the
  // existing /api/doctors/search route already matches against doctor name,
  // organization name, city, and specialization. Clinics/Hospitals/Specialties
  // just steer the query text and copy; a dedicated org-type filter on that
  // route (org_type isn't selected there today) would sharpen this further.
  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim() && !city.trim()) { setResults(null); return }
    setLoading(true)
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (city.trim()) params.set('city', city.trim())
    const res = await fetch(`/api/doctors/search?${params.toString()}`)
    const json = await res.json()
    setResults(json.data ?? [])
    setLoading(false)
  }

  function pickSpecialty(name: string) {
    setTab('SPECIALTIES')
    setQuery(name)
    setTimeout(() => runSearch(), 0)
  }

  function clearSearch() {
    setResults(null)
    setQuery('')
  }

  return (
    <div id="doctors" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2.5 max-w-xl">
      {/* Tabs */}
      <div className="flex gap-1 px-1.5 pt-1">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setResults(null) }}
            className={`text-sm font-medium px-3 py-2 rounded-t-lg border-b-2 transition ${
              tab === t.key
                ? 'text-[#006EFF] border-[#006EFF]'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={runSearch} className="flex flex-col sm:flex-row gap-2 p-1.5 pt-2">
        <div className="flex-1 flex items-center gap-2 bg-[#F7F8FA] rounded-xl px-3.5 py-3 border border-gray-100 focus-within:border-[#006EFF] transition">
          <SearchIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={TABS.find(t => t.key === tab)?.placeholder}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
          />
        </div>

        <div className="flex items-center gap-2 bg-[#F7F8FA] rounded-xl px-3.5 py-3 border border-gray-100 focus-within:border-[#006EFF] transition sm:w-44">
          <MapPinIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            list="yesopd-cities"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Select location"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
          />
          <datalist id="yesopd-cities">
            {cities.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-[#006EFF] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#0058CC] disabled:opacity-60 transition shrink-0"
        >
          <SearchIcon className="w-4 h-4" />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Quick specialty chips, only shown on the Specialties tab */}
      {tab === 'SPECIALTIES' && (
        <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5 pt-1">
          {specializations.slice(0, 8).map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => pickSpecialty(s.name)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-[#006EFF] hover:text-[#006EFF] transition"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Inline results panel */}
      {results !== null && (
        <div className="mt-1 border-t border-gray-100 px-2.5 pt-3 pb-2.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400">
              {loading ? 'Searching…' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
            </p>
            <button type="button" onClick={clearSearch} className="text-xs text-[#006EFF] hover:underline">
              Clear
            </button>
          </div>

          {!loading && results.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No matches yet — try a different name, specialty, or city.</p>
          )}

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {results.map(doc => (
              <Link
                key={doc.doctor_org_id}
                href={`/auth/login?next=${encodeURIComponent(`/dashboard/patient/book?doctor_org_id=${doc.doctor_org_id}`)}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 hover:border-[#006EFF] px-3 py-2.5 transition"
              >
                <div className="w-9 h-9 rounded-full bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF] font-bold text-sm shrink-0">
                  {doc.doctor_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A2E] truncate">{doc.doctor_name}</p>
                  <p className="text-xs text-gray-400 truncate">{doc.org_name} · {doc.org_city}</p>
                </div>
                <p className="text-sm font-semibold text-[#006EFF] shrink-0">₹{doc.consultation_fee}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}