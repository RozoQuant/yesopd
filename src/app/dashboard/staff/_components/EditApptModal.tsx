'use client'

// src/app/dashboard/staff/_components/EditApptModal.tsx
// Extracted from StaffDashboardClient.tsx — no logic changes.

import { useState, useTransition } from 'react'
import { editAppointmentAction } from '@/app/actions/receptionist'
import { Modal, type QueueItem } from './utils'

export function EditApptModal({
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