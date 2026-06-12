'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMyAppointmentsAction } from '@/app/actions/appointment'
import AppointmentCard from '@/components/AppointmentCard'
import type { AppointmentStatus } from '@/types'

interface Appt {
  id: string
  appt_date: string
  slot_start: string
  slot_end: string
  status: AppointmentStatus
  patient_notes: string | null
  doctor_organizations: {
    consultation_fee: number
    doctors: { full_name: string; qualification: string | null; photo_url: string | null } | null
    organizations: { name: string; city: string; address_line1: string | null } | null
  } | null
}

type Tab = 'upcoming' | 'history'

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('upcoming')

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getMyAppointmentsAction()
    if (result?.data) setAppointments(result.data as any)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const upcoming = appointments.filter(
    a => a.status === 'BOOKED' && a.appt_date >= today
  )
  const history = appointments.filter(
    a => a.status !== 'BOOKED' || a.appt_date < today
  )

  const displayed = tab === 'upcoming' ? upcoming : history

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {(['upcoming', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize ${
              tab === t ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-gray-500'
            }`}
          >
            {t}
            {t === 'upcoming' && upcoming.length > 0 && (
              <span className="ml-1.5 bg-[#006EFF] text-white text-xs rounded-full px-1.5 py-0.5">
                {upcoming.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          {tab === 'upcoming' ? 'No upcoming appointments.' : 'No past appointments.'}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(a => (
            <AppointmentCard
              key={a.id}
              id={a.id}
              appt_date={a.appt_date}
              slot_start={a.slot_start}
              slot_end={a.slot_end}
              status={a.status}
              doctor_name={a.doctor_organizations?.doctors?.full_name ?? '—'}
              doctor_qualification={a.doctor_organizations?.doctors?.qualification ?? null}
              org_name={a.doctor_organizations?.organizations?.name ?? '—'}
              org_city={a.doctor_organizations?.organizations?.city ?? ''}
              consultation_fee={a.doctor_organizations?.consultation_fee ?? 0}
              onCancelled={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}