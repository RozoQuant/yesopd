'use client'

import { useState } from 'react'
import DoctorList from './DoctorList'
import ClinicAppointmentsTab from './ClinicAppointmentsTab'
import type { Organization } from '@/types'
import StaffList from './StaffList'

interface Specialization { id: number; name: string }
interface Props {
  org: Organization
  initialDoctors: unknown[]
  initialStaff: unknown[]
  specializations: Specialization[]
}

type Tab = 'appointments' | 'doctors' | 'staff'

export default function ClinicDashboardClient({org,initialDoctors,initialStaff,specializations}: Props) {
  const [tab, setTab] = useState<Tab>('appointments')

  return (
    <div className="space-y-6">
      {/* Org info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-[#1A1A2E]">{org.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {org.address_line1 ? `${org.address_line1}, ` : ''}{org.city}, {org.state}
            </p>
            {org.phone && <p className="text-sm text-gray-400 mt-0.5">{org.phone}</p>}
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
            org.status === 'ACTIVE'
              ? 'bg-green-50 text-green-700 border-green-200'
              : org.status === 'PENDING'
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {org.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['appointments', 'doctors', 'staff'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize ${
              tab === t ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-gray-500'
            }`}
          >
            {t === 'appointments'? 'Appointments': t === 'doctors'? 'Doctors': 'Staff'}
          </button>
        ))}
      </div>

      {tab === 'appointments' && <ClinicAppointmentsTab org_id={org.id} />}
      {tab === 'doctors' && (
        <DoctorList org_id={org.id} initialDoctors={initialDoctors} specializations={specializations} />
      )}

      {tab === 'staff' && (
        <StaffList
        org_id={org.id}
        initialStaff={initialStaff}
      />
      )}

    </div>
  )
}