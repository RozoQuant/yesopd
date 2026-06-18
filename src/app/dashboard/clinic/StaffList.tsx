'use client'

import { useState } from 'react'
import AddStaffForm from './AddStaffForm'

interface Props {
  org_id: string
  initialStaff: unknown[]
}

export default function StaffList({ org_id, initialStaff }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1A1A2E]">
            Staff Management
          </h2>

          <button
            onClick={() => setShowAddForm(true)}
            className="bg-[#006EFF] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Add Staff
          </button>
        </div>

        <div className="text-sm text-gray-500">
          Staff Count: {initialStaff.length}
        </div>
      </div>

      {showAddForm && (
        <AddStaffForm
          org_id={org_id}
          onClose={() => setShowAddForm(false)}
          onSaved={() => setShowAddForm(false)}
        />
      )}
    </>
  )
}