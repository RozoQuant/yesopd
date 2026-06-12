'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Specialization {
  id: number
  name: string
}

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
}

interface Props {
  specializations: Specialization[]
}

export default function SearchResults({ specializations }: Props) {
  const [query, setQuery] = useState('')
  const [selectedSpec, setSelectedSpec] = useState<number | null>(null)
  const [results, setResults] = useState<DoctorResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchResults(q: string, specId: number | null) {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (specId) params.set('specialization_id', String(specId))
    const res = await fetch(`/api/doctors/search?${params.toString()}`)
    const json = await res.json()
    setResults(json.data ?? [])
    setSearched(true)
    setLoading(false)
  }

  // Debounced search on query change
  useEffect(() => {
    if (!query && !selectedSpec) {
      setResults([])
      setSearched(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResults(query, selectedSpec)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selectedSpec])

  function handleSpecClick(id: number) {
    setSelectedSpec(prev => (prev === id ? null : id))
  }

  return (
    <div className="space-y-5">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Doctor name, clinic or city…"
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Specialization chips */}
      <div className="flex gap-2 flex-wrap">
        {specializations.map(s => (
          <button
            key={s.id}
            onClick={() => handleSpecClick(s.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              selectedSpec === s.id
                ? 'bg-[#006EFF] text-white border-[#006EFF]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#006EFF] hover:text-[#006EFF]'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading && (
        <div className="py-12 text-center text-sm text-gray-400">Searching…</div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400">
          No doctors found. Try a different name or specialization.
        </div>
      )}

      {!loading && !searched && (
        <div className="py-12 text-center text-sm text-gray-400">
          Start typing or select a specialization to find doctors.
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{results.length} doctor{results.length !== 1 ? 's' : ''} found</p>
          {results.map(doc => (
            <DoctorCard key={doc.doctor_org_id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}

function DoctorCard({ doc }: { doc: DoctorResult }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-[#006EFF]/10 flex items-center justify-center shrink-0 text-[#006EFF] font-bold text-lg">
          {doc.doctor_name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1A1A2E]">{doc.doctor_name}</p>
          {doc.qualification && (
            <p className="text-xs text-gray-500 mt-0.5">{doc.qualification}</p>
          )}
          {doc.experience_yrs > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{doc.experience_yrs} yrs experience</p>
          )}
          {doc.specializations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {doc.specializations.map(s => (
                <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{doc.org_name}</p>
          <p className="text-xs text-gray-400">{doc.org_city}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-[#1A1A2E]">₹{doc.consultation_fee}</p>
          <Link
            href={`/auth/login?next=/dashboard/patient/book?doctor_org_id=${doc.doctor_org_id}`}
            className="bg-[#006EFF] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#0058CC] transition"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  )
}