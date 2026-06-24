'use client'

import { useState, useTransition } from 'react'
import { cancelAppointmentAction } from '@/app/actions/appointment'
import type { AppointmentStatus } from '@/types'

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  BOOKED:      'bg-blue-50 text-blue-700 border-blue-200',
  CHECKED_IN:  'bg-teal-50 text-teal-700 border-teal-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED:   'bg-green-50 text-green-700 border-green-200',
  CANCELLED:   'bg-red-50 text-red-700 border-red-200',
  NO_SHOW:     'bg-gray-100 text-gray-500 border-gray-200',
}

interface Props {
  id: string
  appt_date: string
  slot_start: string
  slot_end: string
  status: AppointmentStatus
  doctor_name: string
  doctor_qualification: string | null
  org_name: string
  org_city: string
  consultation_fee: number
  onCancelled?: () => void
}

export default function AppointmentCard({
  id, appt_date, slot_start, slot_end, status,
  doctor_name, doctor_qualification, org_name, org_city,
  consultation_fee, onCancelled,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const formattedDate = new Date(appt_date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelAppointmentAction(id)
      if (result?.error) {
        setError(result.error)
      } else {
        setShowConfirm(false)
        onCancelled?.()
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1A1A2E] truncate">{doctor_name}</p>
          {doctor_qualification && (
            <p className="text-xs text-gray-500 mt-0.5">{doctor_qualification}</p>
          )}
          <p className="text-sm text-gray-600 mt-1 truncate">{org_name} · {org_city}</p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm text-gray-700">
              {formattedDate}
            </p>
            <span className="text-gray-300">·</span>
            <p className="text-sm text-gray-700">{slot_start} – {slot_end}</p>
          </div>
          <p className="text-xs text-gray-400 mt-1">Fee: ₹{consultation_fee} · Pay at clinic</p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[status]}`}>
          {status}
        </span>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {status === 'BOOKED' && (
        <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700 transition"
            >
              Cancel appointment
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600">Cancel this appointment?</p>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                {isPending ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                No
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}