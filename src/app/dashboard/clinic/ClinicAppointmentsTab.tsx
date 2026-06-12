'use client'

import { useState, useEffect, useTransition } from 'react'
import { getClinicAppointmentsAction, setAppointmentStatusAction } from '@/app/actions/clinic-appointments'

type ApptStatus = 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

interface Appt {
  id: string
  appt_date: string
  slot_start: string
  slot_end: string
  status: ApptStatus
  patient_notes: string | null
  patients: {
    id: string
    users: { full_name: string; phone: string | null; email: string }
  } | null
  doctor_organizations: {
    id: string
    doctors: { full_name: string } | null
  } | null
}

const STATUS_STYLE: Record<ApptStatus, string> = {
  BOOKED: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  NO_SHOW: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function ClinicAppointmentsTab({ org_id }: { org_id: string }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [appointments, setAppointments] = useState<Appt[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  async function load(d: string) {
    setLoading(true)
    const result = await getClinicAppointmentsAction(org_id, d)
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

  const booked = appointments.filter(a => a.status === 'BOOKED').length
  const completed = appointments.filter(a => a.status === 'COMPLETED').length

  return (
    <div className="space-y-4">
      {/* Date picker + summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#006EFF] focus:outline-none"
        />
        {!loading && (
          <p className="text-sm text-gray-500">
            {appointments.length} total · {booked} pending · {completed} done
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}

      {!loading && appointments.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
          No appointments for this date.
        </div>
      )}

      {!loading && appointments.map(a => {
        const patient = a.patients?.users
        const doctor = a.doctor_organizations?.doctors
        return (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#1A1A2E]">{patient?.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[a.status]}`}>
                    {a.status}
                  </span>
                </div>
                {patient?.phone && (
                  <p className="text-xs text-gray-500 mt-0.5">{patient.phone}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {a.slot_start} – {a.slot_end}
                  {doctor && <span className="text-gray-400"> · {doctor.full_name}</span>}
                </p>
                {a.patient_notes && (
                  <p className="text-xs text-gray-400 mt-1 italic">"{a.patient_notes}"</p>
                )}
              </div>
            </div>

            {a.status === 'BOOKED' && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex gap-3">
                <button
                  onClick={() => handleStatus(a.id, 'COMPLETED')}
                  disabled={isPending}
                  className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                >
                  ✓ Mark completed
                </button>
                <button
                  onClick={() => handleStatus(a.id, 'NO_SHOW')}
                  disabled={isPending}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  No show
                </button>
                <button
                  onClick={() => handleStatus(a.id, 'CANCELLED')}
                  disabled={isPending}
                  className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}