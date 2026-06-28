// src/app/dashboard/staff/_components/utils.ts
// Shared types, constants, and helpers used across staff dashboard components.
// Extracted from StaffDashboardClient.tsx — no logic changes.

import React from 'react'

export type ApptStatus = 'BOOKED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface QueueItem {
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

export interface Doctor {
  id: string
  consultation_fee: number
  doctors: { id: string; full_name: string; qualification: string | null } | null
}

export interface OrgProp {
  id: string
  name: string
  city: string
}

export const STATUS_CONFIG: Record<ApptStatus, { label: string; bg: string; text: string; dot: string }> = {
  BOOKED:      { label: 'Booked',      bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500'  },
  CHECKED_IN:  { label: 'Arrived',     bg: 'bg-teal-50',   text: 'text-teal-700',  dot: 'bg-teal-500'  },
  IN_PROGRESS: { label: 'With Doctor', bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED:   { label: 'Done',        bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
  CANCELLED:   { label: 'Cancelled',   bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-400'   },
  NO_SHOW:     { label: 'No Show',     bg: 'bg-gray-100',  text: 'text-gray-500',  dot: 'bg-gray-400'  },
}

export const SOURCE_LABEL: Record<string, string> = {
  YESOPD: 'App',
  WALK_IN: 'Walk-in',
  PHONE: 'Phone',
  WHATSAPP: 'WhatsApp',
}

export function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function todayStr(): string {
  const d = new Date()
  const year  = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ── Modal shell (shared by all modals) ──────────────────────────
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
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