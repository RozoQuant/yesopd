'use client'

// src/app/dashboard/staff/_components/CreateApptModal.tsx
// Extracted from StaffDashboardClient.tsx — no logic changes.

import { useState, useEffect, useTransition } from 'react'
import {
  searchPatientsAction,
  registerWalkInAction,
  createAppointmentAction,
  checkFollowUpAction,
} from '@/app/actions/receptionist'
import { Modal, fmt12, todayStr, type Doctor, type OrgProp } from './utils'

interface AvailSlot { start: string; end: string; booked: number; capacity: number; available: boolean }

export function CreateApptModal({
  org,
  doctors,
  onClose,
  onSuccess,
}: {
  org: OrgProp
  doctors: Doctor[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<'walkin' | 'existing'>('walkin')
  const [isPending, start] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── Step 1: patient info ──────────────────────────────────
  const [wName, setWName] = useState('')
  const [wPhone, setWPhone] = useState('')
  const [wEmail, setWEmail] = useState('')
  const [wAge, setWAge] = useState('')
  const [wGender, setWGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('')
  const [source, setSource] = useState<'PHONE' | 'WHATSAPP'>('PHONE')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [followUp, setFollowUp] = useState<{ isFollowUp: boolean; lastVisit: string | null } | null>(null)

  // ── Step 2: slot selection ────────────────────────────────
  const [doctorOrgId, setDoctorOrgId] = useState(doctors[0]?.id ?? '')
  const [date, setDate] = useState(todayStr())
  const [slots, setSlots] = useState<AvailSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AvailSlot | null>(null)

  // ── Step 3: optional note ─────────────────────────────────
  const [notes, setNotes] = useState('')

  const nowMins = (() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })()

  async function loadSlots(dId: string, d: string) {
    setSlotsLoading(true)
    setSelectedSlot(null)
    setSlots([])
    try {
      const res = await fetch(`/api/availability?doctor_org_id=${dId}&date=${d}`)
      const json = await res.json()
      const dayData = json.availability?.[0]
      if (!dayData) { setSlots([]); return }
      const isToday = d === todayStr()
      const filtered = (dayData.slots as AvailSlot[]).filter(s => {
        if (!isToday) return true
        const [h, m] = s.start.split(':').map(Number)
        return h * 60 + m >= nowMins
      })
      setSlots(filtered)
      const first = filtered.find(s => s.available)
      if (first) setSelectedSlot(first)
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => {
    if (step === 2) loadSlots(doctorOrgId, date)
  }, [step, doctorOrgId, date])

  async function doSearch(q: string) {
    if (q.length < 2) { setSearchResults([]); return }
    const r = await searchPatientsAction(q, org.id)
    setSearchResults(r.data ?? [])
  }

  async function handleSelectPatient(p: any) {
    setSelectedPatient(p)
    setSearchResults([])
    setSearch(p.full_name)
    const r = await checkFollowUpAction(p.id, doctorOrgId)
    setFollowUp(r)
  }

  function goToStep2() {
    setError('')
    if (mode === 'walkin') {
      if (!wName.trim()) { setError('Patient name is required.'); return }
      if (!wPhone.trim()) { setError('Phone number is required.'); return }
    } else {
      if (!selectedPatient) { setError('Please search and select a patient.'); return }
    }
    setStep(2)
  }

  function goToStep3() {
    setStep(3)
  }

  function handleSubmit() {
    setError('')
    start(async () => {
      const slot = selectedSlot ?? slots.find(s => s.available) ?? null
      const slotStart = slot?.start ?? '09:00'
      const slotEnd   = slot?.end   ?? '09:15'

      if (mode === 'walkin') {
        const r = await registerWalkInAction({
          full_name: wName,
          phone: wPhone,
          email: wEmail || undefined,
          gender: wGender || undefined,
          age: wAge ? parseInt(wAge) : undefined,
          doctor_org_id: doctorOrgId,
          appt_date: date,
          slot_start: slotStart,
          slot_end: slotEnd,
          patient_notes: notes || undefined,
        })
        if (r.error) { setError(r.error); return }
        setSuccess(`Walk-in registered! Queue #${r.queue_number}`)
        setTimeout(() => { onSuccess(); onClose() }, 1200)
      } else {
        const r = await createAppointmentAction({
          patient_id: selectedPatient.id,
          doctor_org_id: doctorOrgId,
          appt_date: date,
          slot_start: slotStart,
          slot_end: slotEnd,
          patient_notes: notes || undefined,
          source,
        })
        if (r.error) { setError(r.error); return }
        setSuccess('Appointment booked!')
        setTimeout(() => { onSuccess(); onClose() }, 1000)
      }
    })
  }

  const selectedDoctor = doctors.find(d => d.id === doctorOrgId)
  const stepTitles = ['Patient', 'Slot', 'Confirm']

  return (
    <Modal title="New Appointment" onClose={onClose}>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-5">
        {stepTitles.map((t, i) => {
          const n = i + 1
          const active = step === n
          const done = step > n
          return (
            <div key={t} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1.5 flex-1 ${i > 0 ? '' : ''}`}>
                {i > 0 && <div className={`h-px flex-1 ${done || active ? 'bg-[#006EFF]' : 'bg-gray-200'}`} />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done ? 'bg-[#006EFF] text-white' : active ? 'bg-[#006EFF] text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-[#006EFF]' : done ? 'text-gray-500' : 'text-gray-300'}`}>{t}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Patient ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['walkin', 'existing'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition ${
                  mode === m ? 'bg-[#006EFF] text-white' : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                {m === 'walkin' ? '🚶 Walk-in' : '🔍 Existing'}
              </button>
            ))}
          </div>

          {mode === 'walkin' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                <input
                  value={wName}
                  onChange={e => setWName(e.target.value)}
                  placeholder="Patient full name"
                  autoFocus
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-3 bg-white focus:border-[#006EFF] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Phone *</label>
                <input
                  value={wPhone}
                  onChange={e => setWPhone(e.target.value)}
                  placeholder="Mobile number"
                  type="tel"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-3 bg-white focus:border-[#006EFF] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email (optional)</label>
                <input
                  value={wEmail}
                  onChange={e => setWEmail(e.target.value)}
                  placeholder="patient@email.com"
                  type="email"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-3 bg-white focus:border-[#006EFF] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Age (optional)</label>
                  <input
                    value={wAge}
                    onChange={e => setWAge(e.target.value)}
                    placeholder="e.g. 35"
                    type="number"
                    min="0"
                    max="120"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-3 bg-white focus:border-[#006EFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Gender (optional)</label>
                  <div className="flex gap-1 mt-1">
                    {(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (
                      <button key={g} type="button"
                        onClick={() => setWGender(wGender === g ? '' : g)}
                        className={`flex-1 py-2.5 text-xs font-medium rounded-xl transition border ${
                          wGender === g
                            ? 'bg-[#006EFF] text-white border-[#006EFF]'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}>
                        {g === 'MALE' ? 'M' : g === 'FEMALE' ? 'F' : 'O'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'existing' && (
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search patient</label>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedPatient(null); doSearch(e.target.value) }}
                placeholder="Name, phone, or email…"
                autoFocus
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-3 bg-white focus:border-[#006EFF] focus:outline-none"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                    >
                      <p className="text-sm font-semibold text-[#1A1A2E]">{p.full_name}</p>
                      <p className="text-xs text-gray-400">{p.phone ?? p.email}</p>
                    </button>
                  ))}
                </div>
              )}
              {selectedPatient && (
                <div className="mt-2 bg-[#006EFF]/5 border border-[#006EFF]/20 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF] font-bold text-xs shrink-0">
                    {selectedPatient.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A2E] truncate">{selectedPatient.full_name}</p>
                    <p className="text-xs text-gray-400">{selectedPatient.phone}</p>
                  </div>
                  {followUp?.isFollowUp && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">Follow-up</span>
                  )}
                </div>
              )}
              {mode === 'existing' && selectedPatient && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Booking via</label>
                  <div className="flex gap-2">
                    {(['PHONE', 'WHATSAPP'] as const).map(s => (
                      <button key={s} onClick={() => setSource(s)}
                        className={`flex-1 py-2 text-xs font-medium rounded-xl transition ${source === s ? 'bg-[#006EFF] text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {s === 'PHONE' ? '📞 Phone' : '💬 WhatsApp'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

          <button onClick={goToStep2}
            className="w-full bg-[#006EFF] text-white text-sm font-semibold py-3.5 rounded-2xl hover:bg-blue-700 transition">
            Next: Pick Slot →
          </button>
        </div>
      )}

      {/* ── STEP 2: Slot picker ── */}
      {step === 2 && (
        <div className="space-y-4">
          {doctors.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Doctor</label>
              <select
                value={doctorOrgId}
                onChange={e => setDoctorOrgId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-3 bg-white focus:border-[#006EFF] focus:outline-none"
              >
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.doctors?.full_name}{d.doctors?.qualification ? ` (${d.doctors.qualification})` : ''} — ₹{d.consultation_fee}
                  </option>
                ))}
              </select>
            </div>
          )}
          {doctors.length === 1 && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1A1A2E]">{selectedDoctor?.doctors?.full_name}</p>
                <p className="text-xs text-gray-400">₹{selectedDoctor?.consultation_fee} · {selectedDoctor?.doctors?.qualification}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() + i)
                const val = d.toISOString().split('T')[0]
                const label = i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
                const active = date === val
                return (
                  <button key={val} onClick={() => setDate(val)}
                    className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition border ${
                      active ? 'bg-[#006EFF] text-white border-[#006EFF]' : 'bg-white border-gray-200 text-gray-600'
                    }`}>
                    {label}
                  </button>
                )
              })}
              <input type="date" min={todayStr()}
                value={date < new Date(Date.now() + 7*86400000).toISOString().split('T')[0] ? '' : date}
                onChange={e => e.target.value && setDate(e.target.value)}
                className="shrink-0 text-xs border border-gray-200 rounded-xl px-2 py-2 bg-white text-gray-500 focus:border-[#006EFF] focus:outline-none w-28"
                placeholder="Other date"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">
                Available slots <span className="text-gray-400 font-normal">(optional — will auto-assign if skipped)</span>
              </label>
            </div>

            {slotsLoading && (
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!slotsLoading && slots.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                No schedule found for this date. Appointment will be created without a slot.
              </div>
            )}

            {!slotsLoading && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(s => {
                  const isSel = selectedSlot?.start === s.start
                  const full = !s.available
                  return (
                    <button
                      key={s.start}
                      onClick={() => !full && setSelectedSlot(isSel ? null : s)}
                      disabled={full}
                      className={`rounded-xl py-2.5 px-1 text-center transition border ${
                        isSel
                          ? 'bg-[#006EFF] border-[#006EFF] text-white'
                          : full
                          ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-[#006EFF] hover:text-[#006EFF]'
                      }`}
                    >
                      <p className="text-xs font-semibold">{fmt12(s.start)}</p>
                      <p className={`text-[10px] mt-0.5 ${isSel ? 'text-blue-100' : full ? 'text-gray-300' : 'text-gray-400'}`}>
                        {full ? 'Full' : `${s.capacity - s.booked} left`}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedSlot && (
              <p className="mt-2 text-xs text-[#006EFF] font-medium">
                ✓ Selected: {fmt12(selectedSlot.start)} – {fmt12(selectedSlot.end)}
              </p>
            )}
            {!selectedSlot && slots.length > 0 && (
              <p className="mt-2 text-xs text-gray-400">No slot selected — first available will be used.</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setStep(1)}
              className="px-4 py-3 text-sm font-medium bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition">
              ← Back
            </button>
            <button onClick={goToStep3}
              className="flex-1 bg-[#006EFF] text-white text-sm font-semibold py-3 rounded-2xl hover:bg-blue-700 transition">
              Next: Confirm →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Confirm ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-100">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">Patient</span>
              <span className="text-sm font-semibold text-[#1A1A2E]">
                {mode === 'walkin' ? wName : selectedPatient?.full_name}
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">Phone</span>
              <span className="text-sm text-gray-700">
                {mode === 'walkin' ? wPhone : selectedPatient?.phone}
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">Doctor</span>
              <span className="text-sm text-gray-700">{selectedDoctor?.doctors?.full_name}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">Date</span>
              <span className="text-sm text-gray-700">{date}</span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">Slot</span>
              <span className="text-sm text-gray-700">
                {selectedSlot
                  ? `${fmt12(selectedSlot.start)} – ${fmt12(selectedSlot.end)}`
                  : slots.length > 0
                  ? `Auto (${fmt12(slots.find(s => s.available)?.start ?? '09:00')})`
                  : 'No schedule / manual'}
              </span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">Fee</span>
              <span className="text-sm font-semibold text-green-600">₹{selectedDoctor?.consultation_fee}</span>
            </div>
            {followUp?.isFollowUp && (
              <div className="px-4 py-3">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  ✓ Follow-up (last seen {followUp.lastVisit})
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Chief complaint / notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. fever since 2 days, follow-up for BP…"
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-[#006EFF] focus:outline-none resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
          {success && <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-xl font-medium">{success}</p>}

          <div className="flex gap-2">
            <button onClick={() => setStep(2)}
              className="px-4 py-3.5 text-sm font-medium bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition">
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 bg-[#006EFF] text-white text-sm font-semibold py-3.5 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isPending ? 'Saving…' : mode === 'walkin' ? '✓ Register Walk-in' : '✓ Book Appointment'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}