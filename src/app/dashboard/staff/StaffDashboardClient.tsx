'use client'

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import QueueBoard from '@/components/QueueBoard'
import {
  getQueueAction,
  checkInPatientAction,
  advanceQueueAction,
  receptionistSetStatusAction,
  searchPatientsAction,
  registerWalkInAction,
  createAppointmentAction,
  editAppointmentAction,
  getDoctorsForOrgAction,
  getDailyReportAction,
  checkFollowUpAction,
} from '@/app/actions/receptionist'

// ─── Types ────────────────────────────────────────────────────
type ApptStatus = 'BOOKED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

interface QueueItem {
  id: string
  appt_date: string
  slot_start: string
  slot_end: string
  status: ApptStatus
  source: string
  patient_notes: string | null
  queue_number: number | null
  checked_in_at: string | null
  arrived_at: string | null
  patients: { id: string; users: { full_name: string; phone: string | null; email: string } } | null
  doctor_organizations: { id: string; consultation_fee: number; doctors: { full_name: string } | null } | null
}

interface Doctor {
  id: string
  consultation_fee: number
  doctors: { id: string; full_name: string; qualification: string | null } | null
}

interface Props {
  profile: { full_name: string; email: string }
  designation: string
  org: { id: string; name: string; city: string }
}

// ─── Helpers ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<ApptStatus, { label: string; bg: string; text: string; dot: string }> = {
  BOOKED:      { label: 'Booked',      bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500'  },
  CHECKED_IN:  { label: 'Arrived',     bg: 'bg-teal-50',   text: 'text-teal-700',  dot: 'bg-teal-500'  },
  IN_PROGRESS: { label: 'With Doctor', bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED:   { label: 'Done',        bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
  CANCELLED:   { label: 'Cancelled',   bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-400'   },
  NO_SHOW:     { label: 'No Show',     bg: 'bg-gray-100',  text: 'text-gray-500',  dot: 'bg-gray-400'  },
}

const SOURCE_LABEL: Record<string, string> = {
  YESOPD: 'App',
  WALK_IN: 'Walk-in',
  PHONE: 'Phone',
  WHATSAPP: 'WhatsApp',
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// ─── Modal shell ──────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F7F8FA]">
      <div className="flex items-center gap-3 bg-white border-b border-gray-100 px-4 py-3 shrink-0">
        <button onClick={onClose} className="p-1.5 -ml-1 rounded-lg hover:bg-gray-100 transition">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-[#1A1A2E]">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  )
}

// ─── OPD Card (print) ─────────────────────────────────────────
function OPDCard({ appt, org }: { appt: QueueItem; org: Props['org'] }) {
  const patient = appt.patients?.users
  const doctor = appt.doctor_organizations?.doctors
  const fee = appt.doctor_organizations?.consultation_fee ?? 0
  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=380,height=600')
    if (!w) return
    w.document.write(`
      <html><head><title>OPD Card</title>
      <style>
        body { font-family: sans-serif; padding: 16px; font-size: 12px; color: #111; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .label { color: #666; }
        hr { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
        .big { font-size: 28px; font-weight: 700; text-align: center; color: #006EFF; }
      </style></head><body>
      <h1>${org.name}</h1>
      <div class="label">${org.city}</div>
      <hr/>
      <div class="big">Q ${appt.queue_number ?? '--'}</div>
      <hr/>
      <div class="row"><span class="label">Patient</span><span>${patient?.full_name ?? ''}</span></div>
      <div class="row"><span class="label">Phone</span><span>${patient?.phone ?? ''}</span></div>
      <div class="row"><span class="label">Doctor</span><span>${doctor?.full_name ?? ''}</span></div>
      <div class="row"><span class="label">Date</span><span>${appt.appt_date}</span></div>
      <div class="row"><span class="label">Slot</span><span>${fmt12(appt.slot_start)} – ${fmt12(appt.slot_end)}</span></div>
      <div class="row"><span class="label">Source</span><span>${SOURCE_LABEL[appt.source] ?? appt.source}</span></div>
      <hr/>
      <div class="row"><span class="label">Consultation Fee</span><span>₹${fee}</span></div>
      <hr/>
      ${appt.patient_notes ? `<div class="label">Notes: ${appt.patient_notes}</div>` : ''}
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    w.document.close()
  }
  return (
    <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-medium text-[#006EFF] hover:text-blue-800 transition">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      OPD Card
    </button>
  )
}

// ─── Invoice (print) ──────────────────────────────────────────
function InvoiceButton({ appt, org }: { appt: QueueItem; org: Props['org'] }) {
  const patient = appt.patients?.users
  const doctor = appt.doctor_organizations?.doctors
  const fee = appt.doctor_organizations?.consultation_fee ?? 0
  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=420,height=600')
    if (!w) return
    w.document.write(`
      <html><head><title>Invoice</title>
      <style>
        body { font-family: sans-serif; padding: 20px; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .sub { color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { text-align: left; background: #f3f4f6; padding: 6px 8px; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
        .total { font-size: 15px; font-weight: 700; }
        .right { text-align: right; }
        .label { color: #666; }
      </style></head><body>
      <h1>${org.name}</h1>
      <div class="sub">${org.city} | Invoice #${appt.id.slice(0, 8).toUpperCase()}</div>
      <div class="label">Patient: <strong>${patient?.full_name ?? ''}</strong></div>
      <div class="label">Phone: ${patient?.phone ?? ''}</div>
      <div class="label">Doctor: ${doctor?.full_name ?? ''}</div>
      <div class="label">Date: ${appt.appt_date} | Slot: ${fmt12(appt.slot_start)}</div>
      <table>
        <tr><th>Description</th><th class="right">Amount</th></tr>
        <tr><td>Consultation Fee</td><td class="right">₹${fee}</td></tr>
      </table>
      <div class="right total">Total: ₹${fee}</div>
      <br/><div class="label" style="font-size:10px">Thank you. Get well soon.</div>
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    w.document.close()
  }
  return (
    <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Invoice
    </button>
  )
}

// ─── Appointment Card ─────────────────────────────────────────
function ApptCard({
  appt,
  org,
  onAction,
  onEdit,
  isPending,
}: {
  appt: QueueItem
  org: Props['org']
  onAction: (id: string, action: string) => void
  onEdit: (appt: QueueItem) => void
  isPending: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const patient = appt.patients?.users
  const doctor = appt.doctor_organizations?.doctors
  const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.BOOKED

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 pt-4 pb-3 flex items-start gap-3 text-left"
      >
        {/* Queue number badge */}
        <div className="mt-0.5 min-w-[36px] h-9 rounded-xl bg-[#006EFF]/10 flex items-center justify-center">
          <span className="text-xs font-bold text-[#006EFF]">
            {appt.queue_number ? `#${appt.queue_number}` : '--'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[#1A1A2E] text-sm leading-tight">{patient?.full_name}</p>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              {SOURCE_LABEL[appt.source] ?? appt.source}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {fmt12(appt.slot_start)}
            {doctor && <span className="text-gray-400"> · {doctor.full_name}</span>}
          </p>
          {patient?.phone && (
            <a
              href={`tel:${patient.phone}`}
              onClick={e => e.stopPropagation()}
              className="text-xs text-[#006EFF] mt-0.5 block"
            >
              {patient.phone}
            </a>
          )}
        </div>

        <svg
          className={`w-4 h-4 text-gray-300 mt-1 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Notes */}
      {appt.patient_notes && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400 italic">"{appt.patient_notes}"</p>
        </div>
      )}

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 py-3 space-y-3">
          {/* Print row */}
          <div className="flex gap-4">
            <OPDCard appt={appt} org={org} />
            <InvoiceButton appt={appt} org={org} />
          </div>

          {/* Action buttons by status */}
          <div className="flex gap-2 flex-wrap">
            {appt.status === 'BOOKED' && (
              <>
                <button
                  onClick={() => onAction(appt.id, 'check-in')}
                  disabled={isPending}
                  className="flex-1 text-xs font-medium bg-teal-500 text-white rounded-xl py-2.5 hover:bg-teal-600 transition disabled:opacity-50"
                >
                  ✓ Check In / Arrived
                </button>
                <button
                  onClick={() => onEdit(appt)}
                  disabled={isPending}
                  className="px-3 text-xs font-medium bg-gray-100 text-gray-600 rounded-xl py-2.5 hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => onAction(appt.id, 'cancel')}
                  disabled={isPending}
                  className="px-3 text-xs font-medium bg-red-50 text-red-500 rounded-xl py-2.5 hover:bg-red-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
            {appt.status === 'CHECKED_IN' && (
              <>
                <button
                  onClick={() => onAction(appt.id, 'advance')}
                  disabled={isPending}
                  className="flex-1 text-xs font-medium bg-amber-500 text-white rounded-xl py-2.5 hover:bg-amber-600 transition disabled:opacity-50"
                >
                  → Send to Doctor
                </button>
                <button
                  onClick={() => onAction(appt.id, 'no-show')}
                  disabled={isPending}
                  className="px-3 text-xs font-medium bg-gray-100 text-gray-500 rounded-xl py-2.5 hover:bg-gray-200 transition disabled:opacity-50"
                >
                  No Show
                </button>
              </>
            )}
            {appt.status === 'IN_PROGRESS' && (
              <button
                onClick={() => onAction(appt.id, 'complete')}
                disabled={isPending}
                className="flex-1 text-xs font-medium bg-green-500 text-white rounded-xl py-2.5 hover:bg-green-600 transition disabled:opacity-50"
              >
                ✓ Mark Completed
              </button>
            )}
            {(appt.status === 'COMPLETED' || appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') && (
              <p className="text-xs text-gray-400 py-1">No further actions available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Slot type ────────────────────────────────────────────────
interface AvailSlot { start: string; end: string; booked: number; capacity: number; available: boolean }

// ─── Walk-in / Create Appointment Modal ───────────────────────
// Step 1: Patient (name+phone for walk-in, or search for existing)
// Step 2: Slot picker (doctor + date → real schedule slots, future-only, optional)
// Step 3: Confirm & save  — total 3 taps minimum
function CreateApptModal({
  org,
  doctors,
  onClose,
  onSuccess,
}: {
  org: Props['org']
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

  // Load slots from the availability API whenever doctor or date changes
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
      // Filter to future slots only when date is today
      const filtered = (dayData.slots as AvailSlot[]).filter(s => {
        if (!isToday) return true
        const [h, m] = s.start.split(':').map(Number)
        return h * 60 + m >= nowMins
      })
      setSlots(filtered)
      // Auto-select first available slot
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

  // Validate step 1 and advance
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

  // Final submit
  function handleSubmit() {
    setError('')
    start(async () => {
      // Resolve slot — if none selected, pick first available from loaded slots
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
    <Modal
      title="New Appointment"
      onClose={onClose}
    >
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
          {/* Walk-in vs Existing toggle */}
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
          {/* Doctor selector */}
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

          {/* Date picker — today forward only */}
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
              {/* Custom date beyond 7 days */}
              <input type="date" min={todayStr()}
                value={date < new Date(Date.now() + 7*86400000).toISOString().split('T')[0] ? '' : date}
                onChange={e => e.target.value && setDate(e.target.value)}
                className="shrink-0 text-xs border border-gray-200 rounded-xl px-2 py-2 bg-white text-gray-500 focus:border-[#006EFF] focus:outline-none w-28"
                placeholder="Other date"
              />
            </div>
          </div>

          {/* Slot grid */}
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
          {/* Summary card */}
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

          {/* Optional notes */}
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

// ─── Edit Appointment Modal ───────────────────────────────────
function EditApptModal({
  appt,
  onClose,
  onSuccess,
}: {
  appt: QueueItem
  onClose: () => void
  onSuccess: () => void
}) {
  const [isPending, start] = useTransition()
  const [date, setDate] = useState(appt.appt_date)
  const [slotStart, setSlotStart] = useState(appt.slot_start)
  const [slotEnd, setSlotEnd] = useState(appt.slot_end)
  const [notes, setNotes] = useState(appt.patient_notes ?? '')
  const [error, setError] = useState('')

  function handleSubmit() {
    setError('')
    start(async () => {
      const r = await editAppointmentAction(appt.id, {
        appt_date: date,
        slot_start: slotStart,
        slot_end: slotEnd,
        patient_notes: notes || undefined,
      })
      if (r.error) { setError(r.error); return }
      onSuccess()
      onClose()
    })
  }

  return (
    <Modal title="Edit Appointment" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-[#1A1A2E]">{appt.patients?.users.full_name}</p>
          <p className="text-xs text-gray-400">{appt.doctor_organizations?.doctors?.full_name}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-[#006EFF] focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
            <input
              type="time"
              value={slotStart}
              onChange={e => setSlotStart(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-[#006EFF] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
            <input
              type="time"
              value={slotEnd}
              onChange={e => setSlotEnd(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-[#006EFF] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-[#006EFF] focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-[#006EFF] text-white text-sm font-semibold py-3.5 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Daily Report Modal ───────────────────────────────────────
function DailyReportModal({ org, onClose }: { org: Props['org']; onClose: () => void }) {
  const [date, setDate] = useState(todayStr())
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function load(d: string) {
    setLoading(true)
    const r = await getDailyReportAction(org.id, d)
    setData(r.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load(date) }, [date])

  const total = data.reduce((s, a) => s + (a.doctor_organizations?.consultation_fee ?? 0), 0)
  const completed = data.filter(a => a.status === 'COMPLETED').length
  const booked = data.filter(a => a.status === 'BOOKED').length
  const walkIns = data.filter(a => a.source === 'WALK_IN').length

  function printReport() {
    const rows = data
      .map(a => `<tr>
        <td>${a.patients?.users?.full_name ?? ''}</td>
        <td>${a.doctor_organizations?.doctors?.full_name ?? ''}</td>
        <td>${fmt12(a.slot_start)}</td>
        <td>${a.source}</td>
        <td>${a.status}</td>
        <td>₹${a.doctor_organizations?.consultation_fee ?? 0}</td>
      </tr>`)
      .join('')

    const w = window.open('', '_blank', 'width=700,height=800')
    if (!w) return
    w.document.write(`
      <html><head><title>Daily Report – ${date}</title>
      <style>
        body { font-family: sans-serif; padding: 20px; font-size: 12px; }
        h1 { font-size: 16px; } h2 { font-size: 13px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #f3f4f6; padding: 6px 8px; text-align: left; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
        .summary { display: flex; gap: 20px; margin: 12px 0; }
        .stat { background: #f9fafb; padding: 8px 12px; border-radius: 8px; }
        .stat-num { font-size: 20px; font-weight: 700; }
        .stat-label { font-size: 10px; color: #888; }
      </style></head><body>
      <h1>${org.name} — Daily Report</h1>
      <h2>${date}</h2>
      <div class="summary">
        <div class="stat"><div class="stat-num">${data.length}</div><div class="stat-label">Total</div></div>
        <div class="stat"><div class="stat-num">${completed}</div><div class="stat-label">Completed</div></div>
        <div class="stat"><div class="stat-num">${walkIns}</div><div class="stat-label">Walk-ins</div></div>
        <div class="stat"><div class="stat-num">₹${total}</div><div class="stat-label">Revenue</div></div>
      </div>
      <table>
        <tr><th>Patient</th><th>Doctor</th><th>Slot</th><th>Source</th><th>Status</th><th>Fee</th></tr>
        ${rows}
      </table>
      <br/><div style="font-size:10px;color:#999">Generated by YESOPD · ${new Date().toLocaleString()}</div>
      <script>window.print(); window.close();</script>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <Modal title="Daily Report" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-[#006EFF] focus:outline-none flex-1"
          />
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 text-sm font-medium text-[#006EFF] bg-blue-50 px-4 py-2.5 rounded-xl hover:bg-blue-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>

        {/* Summary stats */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total', value: data.length, color: 'text-gray-700' },
              { label: 'Completed', value: completed, color: 'text-green-600' },
              { label: 'Booked', value: booked, color: 'text-blue-600' },
              { label: 'Walk-ins', value: walkIns, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Revenue */}
        {!loading && (
          <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-green-700">Est. Revenue</span>
            <span className="text-xl font-bold text-green-700">₹{total.toLocaleString('en-IN')}</span>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl h-14 animate-pulse" />
            ))}
          </div>
        )}

        {/* List */}
        {!loading && data.map(a => {
          const cfg = STATUS_CONFIG[a.status as ApptStatus] ?? STATUS_CONFIG.BOOKED
          return (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A2E] truncate">{a.patients?.users?.full_name}</p>
                <p className="text-xs text-gray-400">{fmt12(a.slot_start)} · {a.doctor_organizations?.doctors?.full_name}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                <p className="text-xs text-gray-500 mt-1">₹{a.doctor_organizations?.consultation_fee ?? 0}</p>
              </div>
            </div>
          )
        })}

        {!loading && data.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">No appointments for this date.</div>
        )}
      </div>
    </Modal>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function StaffDashboardClient({ profile, designation, org }: Props) {
  const today = todayStr()
  const [date, setDate] = useState(today)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, start] = useTransition()

  // Active tab
  const [tab, setTab] = useState<'queue' | 'account'>('queue')

  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<QueueItem | null>(null)
  const [showReport, setShowReport] = useState(false)

  // Filter
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')

  async function load(d: string) {
    setLoading(true)
    const [qResult, dResult] = await Promise.all([
      getQueueAction(org.id, d),
      getDoctorsForOrgAction(org.id),
    ])
    if (qResult.data) setQueue(qResult.data as QueueItem[])
    if (dResult.data) setDoctors(dResult.data as Doctor[])
    setLoading(false)
  }

  useEffect(() => { load(date) }, [date])

  function handleAction(id: string, action: string) {
    start(async () => {
      if (action === 'check-in') await checkInPatientAction(id)
      else if (action === 'advance') await advanceQueueAction(id)
      else if (action === 'complete') await receptionistSetStatusAction(id, 'COMPLETED')
      else if (action === 'no-show') await receptionistSetStatusAction(id, 'NO_SHOW')
      else if (action === 'cancel') await receptionistSetStatusAction(id, 'CANCELLED')
      await load(date)
    })
  }

  const isToday = date === today
  const counts = {
    total: queue.length,
    booked: queue.filter(a => a.status === 'BOOKED').length,
    arrived: queue.filter(a => a.status === 'CHECKED_IN').length,
    inProgress: queue.filter(a => a.status === 'IN_PROGRESS').length,
    done: queue.filter(a => a.status === 'COMPLETED').length,
    walkIns: queue.filter(a => a.source === 'WALK_IN').length,
  }

  const filteredQueue = queue.filter(a => {
    if (filter === 'active') return ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status)
    if (filter === 'done') return ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)
    return true
  })

  return (
    <>
      <div className="min-h-screen bg-[#F7F8FA]">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#006EFF]">YES</span>
              <span className="text-lg font-bold text-[#1A1A2E]">OPD</span>
              <span className="text-xs bg-[#006EFF]/10 text-[#006EFF] px-2 py-0.5 rounded-full font-medium ml-1">
                Reception
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-700">{profile.full_name}</p>
              <p className="text-xs text-gray-400">{org.name}</p>
            </div>
          </div>
        </header>

        {/* Tab bar */}
        <div className="bg-white border-b border-gray-100 sticky top-[53px] z-30">
          <div className="max-w-lg mx-auto flex">
            {(['queue', 'account'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t
                    ? 'border-[#006EFF] text-[#006EFF]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'queue' ? 'Queue & Appointments' : 'Account'}
              </button>
            ))}
          </div>
        </div>

        <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-24">

          {/* ── QUEUE TAB ── */}
          {tab === 'queue' && (
            <>
              {/* Date bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-[#006EFF] focus:outline-none"
                />
                {isToday && (
                  <span className="text-xs bg-[#006EFF]/10 text-[#006EFF] px-2.5 py-1 rounded-full font-medium">
                    Today
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setShowReport(true)}
                    className="flex items-center gap-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Report
                  </button>
                </div>
              </div>

              {/* Stats cards */}
              {!loading && queue.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Waiting', value: counts.booked + counts.arrived, color: 'text-blue-600' },
                    { label: 'With Doctor', value: counts.inProgress, color: 'text-amber-600' },
                    { label: 'Done', value: counts.done, color: 'text-green-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick summary strip */}
              {!loading && queue.length > 0 && (
                <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                  <span>{counts.total} total</span>
                  {counts.walkIns > 0 && <span>· {counts.walkIns} walk-ins</span>}
                  {counts.arrived > 0 && <span className="text-teal-600 font-medium">· {counts.arrived} arrived</span>}
                  {counts.inProgress > 0 && <span className="text-amber-600 font-medium">· {counts.inProgress} with doctor</span>}
                </div>
              )}

              {/* Filter tabs */}
              {!loading && queue.length > 0 && (
                <div className="flex gap-1.5 bg-white rounded-xl border border-gray-100 p-1">
                  {(['all', 'active', 'done'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                        filter === f
                          ? 'bg-[#006EFF] text-white'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Closed'}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-100 rounded w-2/3" />
                          <div className="h-3 bg-gray-100 rounded w-1/3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loading && filteredQueue.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                  <p className="text-sm text-gray-400">
                    {filter !== 'all'
                      ? 'No appointments in this filter.'
                      : 'No appointments for this date.'}
                  </p>
                </div>
              )}

              {/* Queue list */}
              {!loading && filteredQueue.map(a => (
                <ApptCard
                  key={a.id}
                  appt={a}
                  org={org}
                  onAction={handleAction}
                  onEdit={setEditTarget}
                  isPending={isPending}
                />
              ))}
            </>
          )}

          {/* ── ACCOUNT TAB ── */}
          {tab === 'account' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF] font-bold text-sm">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1A2E] text-sm">{profile.full_name}</p>
                    <p className="text-xs text-gray-400">{profile.email}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                  <span className="bg-gray-100 px-2.5 py-1 rounded-full">{designation}</span>
                  <span className="bg-gray-100 px-2.5 py-1 rounded-full">{org.name}, {org.city}</span>
                </div>
              </div>

              <Link
                href="/account/change-password"
                className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">Change Password</span>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-5 py-4 text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <span className="text-sm text-red-500 font-medium">Sign Out</span>
                </button>
              </form>
            </div>
          )}
        </main>

        {/* Floating action button */}
        {tab === 'queue' && (
          <div className="fixed bottom-6 right-4 z-30">
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-[#006EFF] text-white text-sm font-semibold px-5 py-3.5 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Appointment
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateApptModal
          org={org}
          doctors={doctors}
          onClose={() => setShowCreate(false)}
          onSuccess={() => load(date)}
        />
      )}
      {editTarget && (
        <EditApptModal
          appt={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => load(date)}
        />
      )}
      {showReport && (
        <DailyReportModal org={org} onClose={() => setShowReport(false)} />
      )}
    </>
  )
}