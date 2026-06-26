'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import {
  getSessionQueueAction,
  markArrivedAction,
  markCheckedInAction,
  markInProgressAction,
  markCompletedAction,
  markNoShowAction,
  getOrgDoctorsAction,
  type QueueEntry,
} from '@/app/actions/queue'

// ── STATUS CONFIG ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  BOOKED:      { label: 'Waiting',     color: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-400' },
  CHECKED_IN:  { label: 'Checked In',  color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  COMPLETED:   { label: 'Done',        color: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  NO_SHOW:     { label: 'No Show',     color: 'bg-gray-100 text-gray-500 border-gray-200',   dot: 'bg-gray-400' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-50 text-red-400 border-red-200',       dot: 'bg-red-400' },
}

const NEXT_ACTION: Record<string, { label: string; action: string } | null> = {
  BOOKED:      { label: 'Check In', action: 'checkin' },
  CHECKED_IN:  { label: 'Call In',  action: 'inprogress' },
  IN_PROGRESS: { label: 'Complete', action: 'complete' },
  COMPLETED:   null,
  NO_SHOW:     null,
  CANCELLED:   null,
}

// ── PROPS ─────────────────────────────────────────────────────

interface Props {
  org_id: string
  initialDoctorOrgId?: string
}

// ── QUEUE CARD ────────────────────────────────────────────────

function QueueCard({
  entry,
  onAction,
  loading,
}: {
  entry: QueueEntry
  onAction: (id: string, action: string) => void
  loading: boolean
}) {
  const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.BOOKED
  const next = NEXT_ACTION[entry.status]

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-4 ${
      entry.status === 'IN_PROGRESS' ? 'ring-2 ring-purple-300' : ''
    }`}>
      {/* Queue badge */}
      <div className="flex-shrink-0 w-14 text-center">
        <p className="text-[11px] text-gray-400 font-medium">{entry.queue_code?.split('-').slice(0,2).join('-')}</p>
        <p className="text-2xl font-bold text-[#1A1A2E] leading-tight">
          {entry.queue_number !== null ? String(entry.queue_number).padStart(3, '0') : '—'}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-gray-100 flex-shrink-0" />

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1A1A2E] text-sm truncate">{entry.patient_name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {entry.slot_start.slice(0, 5)} – {entry.slot_end.slice(0, 5)}
          {entry.patient_phone && <span className="ml-2">· {entry.patient_phone}</span>}
        </p>
        {entry.patient_notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate italic">"{entry.patient_notes}"</p>
        )}
        {entry.source !== 'YESOPD' && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
            {entry.source}
          </span>
        )}
      </div>

      {/* Status + action */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>

        <div className="flex gap-1.5">
          {next && (
            <button
              disabled={loading}
              onClick={() => onAction(entry.appointment_id, next.action)}
              className="text-xs bg-[#1A1A2E] text-white px-3 py-1 rounded-lg font-medium hover:bg-[#2d2d4e] disabled:opacity-50 transition"
            >
              {next.label}
            </button>
          )}
          {entry.status === 'BOOKED' && (
            <button
              disabled={loading}
              onClick={() => onAction(entry.appointment_id, 'noshow')}
              className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
            >
              No Show
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── SESSION PANEL ─────────────────────────────────────────────

function SessionPanel({
  label,
  entries,
  onAction,
  loading,
}: {
  label: string
  entries: QueueEntry[]
  onAction: (id: string, action: string) => void
  loading: boolean
}) {
  const active = entries.filter(e => !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(e.status))
  const done   = entries.filter(e => ['COMPLETED', 'NO_SHOW'].includes(e.status))

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <p className="text-sm text-gray-400">No appointments for {label} session</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Active queue */}
      {active.map(e => (
        <QueueCard key={e.appointment_id} entry={e} onAction={onAction} loading={loading} />
      ))}

      {/* Completed / No Show collapsed section */}
      {done.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none list-none flex items-center gap-1 pt-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            {done.length} completed / no-show
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {done.map(e => (
              <QueueCard key={e.appointment_id} entry={e} onAction={onAction} loading={loading} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────

export default function QueueBoard({ org_id, initialDoctorOrgId }: Props) {
  const [doctors, setDoctors] = useState<{ doctor_org_id: string; doctor_name: string; short_code: string }[]>([])
  const [selectedDoctorOrgId, setSelectedDoctorOrgId] = useState<string>(initialDoctorOrgId ?? '')
  const [session, setSession] = useState<'MORNING' | 'EVENING'>('MORNING')
  const [queueDate, setQueueDate] = useState(new Date().toISOString().split('T')[0])
  const [morning, setMorning] = useState<QueueEntry[]>([])
  const [evening, setEvening] = useState<QueueEntry[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  // Load doctors for org
  useEffect(() => {
    getOrgDoctorsAction(org_id).then(res => {
      if (res.data && res.data.length > 0) {
        setDoctors(res.data)
        if (!initialDoctorOrgId) setSelectedDoctorOrgId(res.data[0].doctor_org_id)
      }
    })
  }, [org_id, initialDoctorOrgId])

  // Fetch queue
  const fetchQueue = useCallback(() => {
    if (!selectedDoctorOrgId) return
    setFetchError(null)
    startTransition(async () => {
      const res = await getSessionQueueAction(selectedDoctorOrgId, queueDate)
      if (res.error) { setFetchError(res.error); return }
      setMorning(res.data?.morning ?? [])
      setEvening(res.data?.evening ?? [])
    })
  }, [selectedDoctorOrgId, queueDate])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(fetchQueue, 30_000)
    return () => clearInterval(t)
  }, [fetchQueue])

  // Handle status actions
  async function handleAction(appointment_id: string, action: string) {
    setActionError(null)
    let res: { error?: string; success?: boolean }

    if (action === 'checkin')    res = await markCheckedInAction(appointment_id)
    else if (action === 'inprogress') res = await markInProgressAction(appointment_id)
    else if (action === 'complete')   res = await markCompletedAction(appointment_id)
    else if (action === 'noshow')     res = await markNoShowAction(appointment_id)
    else if (action === 'arrived')    res = await markArrivedAction(appointment_id)
    else return

    if (res.error) { setActionError(res.error); return }
    fetchQueue()
  }

  const currentEntries = session === 'MORNING' ? morning : evening
  const activeCount = currentEntries.filter(e => !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(e.status)).length
  const selectedDoctor = doctors.find(d => d.doctor_org_id === selectedDoctorOrgId)

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 space-y-3">
        {/* Doctor selector */}
        {doctors.length > 1 && (
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Doctor</label>
            <select
              value={selectedDoctorOrgId}
              onChange={e => setSelectedDoctorOrgId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/10"
            >
              {doctors.map(d => (
                <option key={d.doctor_org_id} value={d.doctor_org_id}>
                  Dr. {d.doctor_name} ({d.short_code})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3">
          {/* Date picker */}
          <div className="flex-1">
            <label className="text-xs text-gray-500 font-medium block mb-1">Date</label>
            <input
              type="date"
              value={queueDate}
              onChange={e => setQueueDate(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A1A2E]/10"
            />
          </div>

          {/* Refresh */}
          <div className="flex items-end">
            <button
              onClick={fetchQueue}
              disabled={isPending}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {isPending ? '↻' : '⟳'} Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Session tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['MORNING', 'EVENING'] as const).map(s => {
          const count = (s === 'MORNING' ? morning : evening).filter(
            e => !['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(e.status)
          ).length
          return (
            <button
              key={s}
              onClick={() => setSession(s)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 ${
                session === s ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-gray-500'
              }`}
            >
              {s === 'MORNING' ? '☀️ Morning' : '🌙 Evening'}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  session === s ? 'bg-[#1A1A2E] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Stats row */}
      {selectedDoctor && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Waiting',    value: currentEntries.filter(e => e.status === 'BOOKED').length,      color: 'text-blue-600' },
            { label: 'In Room',    value: currentEntries.filter(e => ['CHECKED_IN','IN_PROGRESS'].includes(e.status)).length, color: 'text-purple-600' },
            { label: 'Done Today', value: currentEntries.filter(e => e.status === 'COMPLETED').length,   color: 'text-green-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {(fetchError || actionError) && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          {fetchError ?? actionError}
        </p>
      )}

      {/* Queue list */}
      <SessionPanel
        label={session === 'MORNING' ? 'Morning' : 'Evening'}
        entries={currentEntries}
        onAction={handleAction}
        loading={isPending}
      />
    </div>
  )
}