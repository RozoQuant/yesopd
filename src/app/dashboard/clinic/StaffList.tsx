'use client'

import { useState } from 'react'
import AddStaffForm from './AddStaffForm'
import { toggleStaffStatusAction, resendInviteAction } from '@/app/actions/staff'

interface StaffUser {
  id: string
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
}

interface StaffMember {
  id: string
  user_id: string
  designation: string
  status: string
  is_active: boolean
  users: StaffUser | null
}

interface Props {
  org_id: string
  initialStaff: StaffMember[]
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    INVITED:   { label: 'Invited',   className: 'bg-yellow-100 text-yellow-700' },
    ACTIVE:    { label: 'Active',    className: 'bg-green-100 text-green-700'   },
    SUSPENDED: { label: 'Suspended', className: 'bg-red-100 text-red-700'       },
  }
  const s = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

export default function StaffList({ org_id, initialStaff }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [staff, setStaff] = useState(initialStaff)
  const [resending, setResending] = useState<string | null>(null)
  const [resendMsg, setResendMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  async function handleToggle(member: StaffMember) {
    const newActive = !member.is_active
    const result = await toggleStaffStatusAction(member.id, member.user_id, newActive)
    if (result.success) {
      setStaff(prev =>
        prev.map(s =>
          s.id === member.id
            ? { ...s, is_active: newActive, status: newActive ? 'ACTIVE' : 'SUSPENDED' }
            : s
        )
      )
    } else {
      alert(result.message)
    }
  }

  async function handleResend(member: StaffMember) {
    setResending(member.id)
    setResendMsg(null)
    const result = await resendInviteAction(member.id, member.user_id)
    setResending(null)
    setResendMsg({
      id: member.id,
      ok: result.success,
      text: result.success ? 'Invite resent successfully.' : (result.message ?? 'Failed to resend.'),
    })
    // Clear message after 4s
    setTimeout(() => setResendMsg(null), 4000)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A2E]">Staff Management</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-[#006EFF] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Add Staff
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-500">Staff Count: {staff.length}</div>

        {staff.length === 0 ? (
          <div className="text-sm text-gray-500">No staff added yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Name</th>
                  <th className="text-left py-3">Email</th>
                  <th className="text-left py-3">Designation</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map(member => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="py-3">{member.users?.full_name ?? '-'}</td>
                    <td className="py-3">{member.users?.email ?? '-'}</td>
                    <td className="py-3">{member.designation}</td>
                    <td className="py-3">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="py-3 space-y-1">
                      {member.status === 'INVITED' ? (
                        <div>
                          <button
                            onClick={() => handleResend(member)}
                            disabled={resending === member.id}
                            className="px-3 py-1 rounded text-xs font-medium bg-yellow-500 text-white disabled:opacity-50"
                          >
                            {resending === member.id ? 'Sending…' : 'Resend Invite'}
                          </button>
                          {resendMsg?.id === member.id && (
                            <p className={`text-xs mt-1 ${resendMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                              {resendMsg.text}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggle(member)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            member.is_active ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                          }`}
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
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