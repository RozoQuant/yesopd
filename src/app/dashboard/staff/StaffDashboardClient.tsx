'use client'

// src/app/dashboard/staff/StaffDashboardClient.tsx
// Refactored: sub-components extracted to ./_components/.
// This file is now the coordinator: state, data loading, action dispatch, layout.
// All rendering logic lives in the imported components.

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import {
  getQueueAction,
  checkInPatientAction,
  advanceQueueAction,
  receptionistSetStatusAction,
  getDoctorsForOrgAction,
} from '@/app/actions/receptionist'
import { ApptCard } from './_components/ApptCard'
import { CreateApptModal } from './_components/CreateApptModal'
import { EditApptModal } from './_components/EditApptModal'
import { DailyReportModal } from './_components/DailyReportModal'
import { todayStr, type QueueItem, type Doctor } from './_components/utils'

interface Props {
  profile: { full_name: string; email: string }
  designation: string
  org: { id: string; name: string; city: string }
}

export default function StaffDashboardClient({ profile, designation, org }: Props) {
  const today = todayStr()
  const [date, setDate] = useState(today)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, start] = useTransition()

  const [tab, setTab] = useState<'queue' | 'account'>('queue')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<QueueItem | null>(null)
  const [showReport, setShowReport] = useState(false)
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
                    { label: 'Waiting',    value: counts.booked + counts.arrived, color: 'text-blue-600' },
                    { label: 'With Doctor', value: counts.inProgress,             color: 'text-amber-600' },
                    { label: 'Done',        value: counts.done,                   color: 'text-green-600' },
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