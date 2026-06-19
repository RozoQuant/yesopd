'use client'

import { useState } from 'react'
import AddStaffForm from './AddStaffForm'
import { toggleStaffStatusAction } from '@/app/actions/staff'

interface StaffUser {
  id: string
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
}

interface StaffMember {
  id: string
  designation: string
  is_active: boolean
  users: StaffUser | null
}

interface Props {
  org_id: string
  initialStaff: any[]
}

export default function StaffList({
  org_id,
  initialStaff,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
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

        <div className="mb-4 text-sm text-gray-500">
          Staff Count: {initialStaff.length}
        </div>

        {initialStaff.length === 0 ? (
          <div className="text-sm text-gray-500">
            No staff added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Name</th>
                  <th className="text-left py-3">Email</th>
                  <th className="text-left py-3">Designation</th>
                  <th className="text-left py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {initialStaff.map(staff => (
                  <tr
                    key={staff.id}
                    className="border-b last:border-0"
                  >
                    <td className="py-3">
                      {staff.users?.full_name ?? '-'}
                    </td>

                    <td className="py-3">
                      {staff.users?.email ?? '-'}
                    </td>

                    <td className="py-3">
                      {staff.designation}
                    </td>

                    <td className="py-3">
                    <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                        staff.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                    >
                        {staff.is_active ? 'Active' : 'Inactive'}
                    </span>
                    </td>

                    <td className="py-3">
                    <button
                        onClick={async () => {
                        const result =
                            await toggleStaffStatusAction(
                            staff.id,
                            staff.user_id,
                            !staff.is_active
                            )

                        if (result.success) {
                            window.location.reload()
                        } else {
                            alert(result.message)
                        }
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                        staff.is_active
                            ? 'bg-red-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}
                    >
                        {staff.is_active
                        ? 'Deactivate'
                        : 'Activate'}
                    </button>
                    </td>


                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <AddStaffForm
          org_id={org_id}
          onClose={() => setShowAddForm(false)}
          onSaved={() => {
            setShowAddForm(false)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}