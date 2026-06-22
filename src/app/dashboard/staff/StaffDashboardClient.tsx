'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { logoutAction } from '@/app/actions/auth'
import { getClinicAppointmentsAction, setAppointmentStatusAction } from '@/app/actions/clinic-appointments'

type ApptStatus = 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

interface Appt {
  id: string
  appt_date: string
  slot_start: string
  slot_end: string
  status: ApptStatus
  patient_notes: string | null
  patients: { id: string; users: { full_name: string; phone: string | null; email: string } } | null
  doctor_organizations: { id: string; doctors: { full_name: string } | null } | null
}

const STATUS_STYLE: Record<ApptStatus, string> = {
  BOOKED: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  NO_SHOW: 'bg-gray-100 text-gray-500 border-gray-200',
}

interface Props {
  profile: { full_name: string; email: string }
  designation: string
  org: { id: string; name: string; city: string }
}

export default function StaffDashboardClient({ profile, designation, org }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'appointments' | 'account'>('appointments')

  async function load(d: string) {
    setLoading(true)
    const result = await getClinicAppointmentsAction(org.id, d)
    if (result?.data) setAppointments(result.data as Appt[])
    setLoading(false)
  }

  useEffect(() => { load(date) }, [date])

  function handleStatus(id: string, status: 'COMPLETED' | 'NO_SHOW' | 'CANCELLED') {
    startTransition(async () => {
      await setAppointmentStatusAction(id, status)
      await load(date)
    })
  }

  const counts = {
    booked: appointments.filter(a => a.status === 'BOOKED').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    noShow: appointments.filter(a => a.status === 'NO_SHOW').length,
  }

  const isToday = date === today

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-[#006EFF]">YES</span>
            <span className="text-lg font-bold text-[#1A1A2E]">OPD</span>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-700">{profile.full_name}</p>
            <p className="text-xs text-gray-400">{designation} · {org.name}</p>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex">
          {(['appointments', 'account'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-[#006EFF] text-[#006EFF]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'appointments' ? 'Appointments' : 'Account'}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── APPOINTMENTS TAB ── */}
        {activeTab === 'appointments' && (
          <>
            {/* Date picker */}
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#006EFF] focus:outline-none bg-white"
              />
              {isToday && <span className="text-xs bg-[#006EFF]/10 text-[#006EFF] px-2 py-1 rounded-full font-medium">Today</span>}
            </div>

            {/* Stats row */}
            {!loading && appointments.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pending', value: counts.booked, color: 'text-blue-600' },
                  { label: 'Done', value: counts.completed, color: 'text-green-600' },
                  { label: 'No Show', value: counts.noShow, color: 'text-gray-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                    <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!loading && appointments.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400">
                No appointments for this date.
              </div>
            )}

            {!loading && appointments.map(a => {
              const patient = a.patients?.users
              const doctor = a.doctor_organizations?.doctors
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#1A1A2E] text-sm">{patient?.full_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[a.status]}`}>
                          {a.status}
                        </span>
                      </div>
                      {patient?.phone && (
                        <a href={`tel:${patient.phone}`} className="text-xs text-[#006EFF] mt-0.5 block">
                          {patient.phone}
                        </a>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {a.slot_start}–{a.slot_end}
                        {doctor && <span className="text-gray-400"> · {doctor.full_name}</span>}
                      </p>
                      {a.patient_notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">"{a.patient_notes}"</p>
                      )}
                    </div>
                  </div>

                  {a.status === 'BOOKED' && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex gap-4">
                      <button
                        onClick={() => handleStatus(a.id, 'COMPLETED')}
                        disabled={isPending}
                        className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        ✓ Completed
                      </button>
                      <button
                        onClick={() => handleStatus(a.id, 'NO_SHOW')}
                        disabled={isPending}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        No show
                      </button>
                      <button
                        onClick={() => handleStatus(a.id, 'CANCELLED')}
                        disabled={isPending}
                        className="text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ── ACCOUNT TAB ── */}
        {activeTab === 'account' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#006EFF]/10 flex items-center justify-center text-[#006EFF] font-bold text-sm">
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-[#1A1A2E] text-sm">{profile.full_name}</p>
                  <p className="text-xs text-gray-400">{profile.email}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex gap-4">
                <span>{designation}</span>
                <span>·</span>
                <span>{org.name}, {org.city}</span>
              </div>
            </div>

            <Link
              href="/account/change-password"
              className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm text-gray-700">Change Password</span>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm text-red-500">Sign Out</span>
                </div>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}