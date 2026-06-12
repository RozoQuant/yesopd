'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import SlotPicker from '@/components/SlotPicker'
import { bookAppointmentAction } from '@/app/actions/appointment'

interface DoctorResult {
  doctor_org_id: string
  doctor_id: string
  doctor_name: string
  qualification: string | null
  experience_yrs: number
  specializations: string[]
  org_name: string
  org_city: string
  org_address: string | null
  consultation_fee: number
}

type Step = 'search' | 'slots' | 'confirm'

export default function BookPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DoctorResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<DoctorResult | null>(null)
  const [pickedDate, setPickedDate] = useState('')
  const [pickedSlot, setPickedSlot] = useState<{ start: string; end: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [bookError, setBookError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    const res = await fetch(`/api/doctors/search?q=${encodeURIComponent(query)}`)
    const json = await res.json()
    setResults(json.data ?? [])
    setSearching(false)
  }

  function handleSelectDoctor(doc: DoctorResult) {
    setSelected(doc)
    setPickedDate('')
    setPickedSlot(null)
    setStep('slots')
  }

  function handleSlotSelect(date: string, slot: { start: string; end: string }) {
    setPickedDate(date)
    setPickedSlot(slot)
    setStep('confirm')
  }

  function handleBook() {
    if (!selected || !pickedDate || !pickedSlot) return
    setBookError(null)
    startTransition(async () => {
      const result = await bookAppointmentAction({
        doctor_org_id: selected.doctor_org_id,
        appt_date: pickedDate,
        slot_start: pickedSlot.start,
        slot_end: pickedSlot.end,
        patient_notes: notes || undefined,
      })
      if (result?.error) {
        setBookError(result.error)
      } else {
        router.push('/dashboard/patient?booked=1')
      }
    })
  }

  const formattedDate = pickedDate
    ? new Date(pickedDate + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 'confirm') setStep('slots')
              else if (step === 'slots') setStep('search')
              else router.back()
            }}
            className="text-gray-500 hover:text-gray-800 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-semibold text-[#1A1A2E]">
            {step === 'search' && 'Find a Doctor'}
            {step === 'slots' && 'Choose a Slot'}
            {step === 'confirm' && 'Confirm Booking'}
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* STEP 1: Search */}
        {step === 'search' && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Doctor name, specialization, clinic…"
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20"
              />
              <button
                type="submit"
                disabled={searching}
                className="bg-[#006EFF] text-white px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-60"
              >
                {searching ? '…' : 'Search'}
              </button>
            </form>

            {results.length === 0 && !searching && query && (
              <p className="text-sm text-gray-400 text-center py-8">No doctors found.</p>
            )}

            <div className="space-y-3">
              {results.map(doc => (
                <button
                  key={doc.doctor_org_id}
                  onClick={() => handleSelectDoctor(doc)}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 hover:border-[#006EFF] transition"
                >
                  <p className="font-semibold text-[#1A1A2E]">{doc.doctor_name}</p>
                  {doc.qualification && (
                    <p className="text-xs text-gray-500 mt-0.5">{doc.qualification}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{doc.specializations.join(', ')}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500">{doc.org_name} · {doc.org_city}</p>
                    <p className="text-sm font-medium text-[#006EFF]">₹{doc.consultation_fee}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Slot picker */}
        {step === 'slots' && selected && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
              <p className="font-semibold text-[#1A1A2E]">{selected.doctor_name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{selected.org_name} · {selected.org_city}</p>
              <p className="text-sm text-[#006EFF] font-medium mt-1">₹{selected.consultation_fee} · Pay at clinic</p>
            </div>
            <SlotPicker
              doctor_org_id={selected.doctor_org_id}
              onSlotSelect={handleSlotSelect}
              selectedDate={pickedDate}
              selectedSlot={pickedSlot?.start}
            />
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === 'confirm' && selected && pickedSlot && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-[#1A1A2E]">Booking Summary</h2>
              <div className="text-sm space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Doctor</span>
                  <span className="font-medium">{selected.doctor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Clinic</span>
                  <span>{selected.org_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span>{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span>{pickedSlot.start} – {pickedSlot.end}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee</span>
                  <span className="font-medium text-[#006EFF]">₹{selected.consultation_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span>Pay at clinic</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes for doctor <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Symptoms, reason for visit…"
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-[#006EFF] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20 resize-none"
              />
            </div>

            {bookError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {bookError}
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              Please arrive 15 minutes before your appointment time.
            </p>

            <button
              onClick={handleBook}
              disabled={isPending}
              className="w-full bg-[#006EFF] text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-[#0058CC] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isPending ? 'Confirming…' : 'Confirm Appointment'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}