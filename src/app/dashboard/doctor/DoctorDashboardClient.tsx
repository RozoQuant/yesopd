'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import LogoutButton from '@/components/LogoutButton'
import ChangePasswordLink from '@/components/ChangePasswordLink'
import {
  getDoctorQueueAction,
  doctorCallNextAction,
  doctorStartAppointmentAction,
  doctorCompleteConsultAction,
  doctorNoShowAction,
  toggleAutoAdvanceAction,
} from '@/app/actions/doctor-queue'

type ApptStatus = 'BOOKED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

interface QueueItem {
  id: string
  appt_date: string
  slot_start: string
  slot_end: string
  status: ApptStatus
  source: string
  consultation_type: 'IN_PERSON' | 'TELECONSULT'
  patient_notes: string | null
  queue_number: number | null
  queue_code: string | null
  daily_room_url: string | null
  patients: { id: string; users: { full_name: string; phone: string | null } } | null
}

interface OrgOption {
  id: string
  consultation_fee: number
  consultation_mode: 'IN_PERSON' | 'TELECONSULT' | 'BOTH'
  auto_advance_queue: boolean
  is_active: boolean
  organizations: { id: string; name: string; city: string } | null
}

interface Props {
  doctor: { id: string; full_name: string }
  orgs: OrgOption[]
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export default function DoctorDashboardClient({ doctor, orgs }: Props) {
  const [orgId, setOrgId] = useState(orgs[0].id)
  const [date, setDate] = useState(todayStr())
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const activeOrg = orgs.find(o => o.id === orgId)!
  const isToday = date === todayStr()

  const load = useCallback(async () => {
    const r = await getDoctorQueueAction(orgId, date)
    if (r.data) setQueue(r.data as QueueItem[])
    setLoading(false)
  }, [orgId, date])

  useEffect(() => { setLoading(true); load() }, [load])

  useEffect(() => {
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [load])

  function runAction(fn: () => Promise<{ error?: string; success?: boolean; autoAdvanced?: boolean }>) {
    setActionMsg(null)
    startTransition(async () => {
      const r = await fn()
      if (r.error) setActionMsg(r.error)
      else if (r.autoAdvanced) setActionMsg('Marked complete — next patient started automatically.')
      await load()
    })
  }

  const columns: { key: ApptStatus; label: string; items: QueueItem[] }[] = [
    { key: 'BOOKED', label: 'Waiting', items: queue.filter(q => q.status === 'BOOKED') },
    { key: 'CHECKED_IN', label: 'Ready', items: queue.filter(q => q.status === 'CHECKED_IN') },
    { key: 'IN_PROGRESS', label: 'In Consultation', items: queue.filter(q => q.status === 'IN_PROGRESS') },
    { key: 'COMPLETED', label: 'Completed', items: queue.filter(q => ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(q.status)) },
  ]

  const hasActiveConsult = queue.some(q => q.status === 'IN_PROGRESS')
  const readyCount = queue.filter(q => q.status === 'CHECKED_IN').length

  return (
    <main className="min-h-screen bg-[#F7F8FA]">
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-xl font-bold text-[#006EFF]">YES</span>
            <span className="text-xl font-bold text-[#1A1A2E]">OPD</span>
            <span className="ml-3 text-sm text-gray-400">Dr. {doctor.full_name}</span>
          </div>
          <div className="flex items-center gap-3">
            <ChangePasswordLink />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
          {orgs.length > 1 && (
            <select
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#006EFF] focus:outline-none"
            >
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.organizations?.name}</option>
              ))}
            </select>
          )}

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#006EFF] focus:outline-none"
          />
          {isToday && (
            <span className="text-xs bg-[#006EFF]/10 text-[#006EFF] px-2.5 py-1 rounded-full font-medium">Today</span>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">Auto-advance queue</span>
            <button
              onClick={() => runAction(() => toggleAutoAdvanceAction(orgId, !activeOrg.auto_advance_queue))}
              disabled={isPending}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                activeOrg.auto_advance_queue ? 'bg-[#006EFF]' : 'bg-gray-200'
              } disabled:opacity-50`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                activeOrg.auto_advance_queue ? 'translate-x-4' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <button
            onClick={() => runAction(() => doctorCallNextAction(orgId, date))}
            disabled={isPending || hasActiveConsult || readyCount === 0}
            className="bg-[#006EFF] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0058CC] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {hasActiveConsult ? 'Consultation in progress' : `Call Next Patient${readyCount > 0 ? ` (${readyCount})` : ''}`}
          </button>
        </div>

        {actionMsg && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">{actionMsg}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {columns.map(col => (
              <div key={col.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1A1A2E]">{col.label}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{col.items.length}</span>
                </div>
                <div className="p-3 space-y-2.5 flex-1 min-h-[120px]">
                  {col.items.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-6">Empty</p>
                  )}
                  {col.items.map(item => (
                    <QueueCard
                      key={item.id}
                      item={item}
                      isPending={isPending}
                      hasActiveConsult={hasActiveConsult}
                      onStart={() => runAction(() => doctorStartAppointmentAction(item.id, orgId))}
                      onComplete={() => runAction(() => doctorCompleteConsultAction(item.id, orgId, date))}
                      onNoShow={() => runAction(() => doctorNoShowAction(item.id, orgId))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function QueueCard({
  item, isPending, hasActiveConsult, onStart, onComplete, onNoShow,
}: {
  item: QueueItem
  isPending: boolean
  hasActiveConsult: boolean
  onStart: () => void
  onComplete: () => void
  onNoShow: () => void
}) {
  const patient = item.patients?.users
  const isDone = ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(item.status)

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${isDone ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1A1A2E] truncate">{patient?.full_name ?? 'Patient'}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {item.queue_code ? `${item.queue_code} · ` : ''}{fmt12(item.slot_start)}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
          item.consultation_type === 'TELECONSULT' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {item.consultation_type === 'TELECONSULT' ? 'Video' : 'In-person'}
        </span>
      </div>

      {item.patient_notes && (
        <p className="text-xs text-gray-400 mt-1.5 italic truncate">"{item.patient_notes}"</p>
      )}

      {item.status === 'CHECKED_IN' && (
        <div className="flex gap-2 mt-2">
          <button onClick={onStart} disabled={isPending || hasActiveConsult}
            className="flex-1 text-xs font-medium bg-teal-500 text-white rounded-lg py-1.5 hover:bg-teal-600 disabled:opacity-40 transition">
            Start
          </button>
          <button onClick={onNoShow} disabled={isPending}
            className="text-xs font-medium bg-gray-100 text-gray-500 rounded-lg py-1.5 px-2 hover:bg-gray-200 disabled:opacity-40 transition">
            No Show
          </button>
        </div>
      )}

      {item.status === 'BOOKED' && (
        <button onClick={onNoShow} disabled={isPending}
          className="mt-2 w-full text-xs font-medium bg-gray-100 text-gray-500 rounded-lg py-1.5 hover:bg-gray-200 disabled:opacity-40 transition">
          Mark No Show
        </button>
      )}

      {item.status === 'IN_PROGRESS' && (
        <div className="flex gap-2 mt-2">
          {item.consultation_type === 'TELECONSULT' && item.daily_room_url && (
            <a href={item.daily_room_url} target="_blank" rel="noreferrer"
              className="flex-1 text-center text-xs font-medium bg-purple-500 text-white rounded-lg py-1.5 hover:bg-purple-600 transition">
              Join Call
            </a>
          )}
          <button onClick={onComplete} disabled={isPending}
            className="flex-1 text-xs font-medium bg-green-500 text-white rounded-lg py-1.5 hover:bg-green-600 disabled:opacity-40 transition">
            Complete
          </button>
        </div>
      )}

      {isDone && (
        <p className="text-[11px] text-gray-400 mt-1.5">{item.status.replace('_', ' ')}</p>
      )}
    </div>
  )
}