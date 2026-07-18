'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  getDoctorsForOrgAction,
  setDoctorActiveAction,
} from '@/app/actions/doctor'
import AddDoctorForm from './AddDoctorForm'
import EditDoctorForm from './EditDoctorForm'
import ScheduleManager from './ScheduleManager'
import { inviteDoctorAction } from '@/app/actions/doctor'

interface Specialization { id: number; name: string }

// Shape returned by getDoctorsForOrgAction
// NOTE: this requires `bio` to be added to the select() in
// getDoctorsForOrgAction (src/app/actions/doctor.ts) — see patch README.
interface DoctorOrgRow {
  id: string
  consultation_fee: number
  consultation_mode: 'IN_PERSON' | 'TELECONSULT' | 'BOTH'
  is_active: boolean
  doctors: {
    id: string
    full_name: string
    qualification: string | null
    experience_yrs: number
    status: string
    email: string | null
    account_status: 'NOT_INVITED' | 'INVITED' | 'ACTIVE'
    is_approved: boolean
    photo_url: string | null
    languages: string[]
    bio: string | null
    doctor_specializations: {
      specializations: { id: number; name: string } | null
    }[]
  } | null
}

interface Props {
  org_id: string
  initialDoctors: unknown[]
  specializations: Specialization[]
}

export default function DoctorList({ org_id, initialDoctors, specializations }: Props) {
  const [doctors, setDoctors] = useState<DoctorOrgRow[]>(initialDoctors as any)
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<DoctorOrgRow | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reload = useCallback(async () => {
    const { data } = await getDoctorsForOrgAction(org_id)
    if (data) setDoctors(data as any)
  }, [org_id])

  function toggleExpand(doctor_org_id: string) {
    setExpandedId(prev => prev === doctor_org_id ? null : doctor_org_id)
  }

  function handleToggleActive(doctor_org_id: string, current: boolean) {
    startTransition(async () => {
      await setDoctorActiveAction(doctor_org_id, !current)
      await reload()
    })
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-[#006EFF] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#0058CC] transition"
        >
          + Add Doctor
        </button>
      </div>

      {/* Add Doctor Modal */}
      {showAdd && (
        <AddDoctorForm
          org_id={org_id}
          specializations={specializations}
          onClose={() => setShowAdd(false)}
          onSaved={async () => { setShowAdd(false); await reload() }}
        />
      )}

      {/* Edit Doctor Modal */}
      {editTarget && editTarget.doctors && (
        <EditDoctorForm
          doctor={{
            doctor_org_id: editTarget.id,
            doctor_id: editTarget.doctors.id,
            full_name: editTarget.doctors.full_name,
            qualification: editTarget.doctors.qualification,
            experience_yrs: editTarget.doctors.experience_yrs,
            bio: editTarget.doctors.bio,
            languages: editTarget.doctors.languages,
            photo_url: editTarget.doctors.photo_url,
            consultation_fee: editTarget.consultation_fee,
            consultation_mode: editTarget.consultation_mode,   
            specialization_ids: editTarget.doctors.doctor_specializations
              .map(ds => ds.specializations?.id)
              .filter((id): id is number => typeof id === 'number'),
          }}
          specializations={specializations}
          onClose={() => setEditTarget(null)}
          onSaved={async () => { setEditTarget(null); await reload() }}
        />
      )}

      {/* Doctor cards */}
      {doctors.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
          No doctors yet. Add your first doctor.
        </div>
      )}

      {doctors.map(row => {
        const d = row.doctors
        if (!d) return null
        const specs = d.doctor_specializations
          .map(ds => ds.specializations?.name)
          .filter(Boolean)
        const isExpanded = expandedId === row.id

        return (
          <div key={row.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Doctor row */}
            <div className="px-5 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#006EFF]/10 flex items-center justify-center shrink-0 text-[#006EFF] font-bold">
                {d.full_name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#1A1A2E]">{d.full_name}</p>
                  {!d.is_approved && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
                      Pending approval
                    </span>
                  )}
                  {!row.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}

                  <InviteDoctorControl
                    doctorId={d.id}
                    accountStatus={d.account_status}
                    onInvited={reload}
                  />
                </div>

                {d.qualification && (
                  <p className="text-xs text-gray-500 mt-0.5">{d.qualification}</p>
                )}
                {specs.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{specs.join(', ')}</p>
                )}

                <p className="text-xs text-[#006EFF] font-medium mt-1">
                  ₹{row.consultation_fee} consultation fee
                  <span className="ml-2 text-gray-400">
                    · {row.consultation_mode === 'BOTH' ? 'In-person & Teleconsultation' : row.consultation_mode === 'TELECONSULT' ? 'Teleconsultation only' : 'In-person only'}
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Active toggle */}
                <button
                  onClick={() => handleToggleActive(row.id, row.is_active)}
                  disabled={isPending}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                    row.is_active ? 'bg-[#006EFF]' : 'bg-gray-200'
                  } disabled:opacity-50`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    row.is_active ? 'translate-x-4' : 'translate-x-1'
                  }`} />
                </button>
                {/* Edit */}
                <button
                  onClick={() => setEditTarget(row)}
                  className="text-xs text-gray-500 hover:text-[#006EFF]"
                >
                  Edit details
                </button>
                {/* Expand schedule */}
                <button
                  onClick={() => toggleExpand(row.id)}
                  className="text-xs text-[#006EFF] hover:underline"
                >
                  {isExpanded ? 'Hide schedule ↑' : 'Manage schedule ↓'}
                </button>
              </div>
            </div>

            {/* Schedule manager (expanded) */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-[#F7F8FA] px-5 py-4">
                <ScheduleManager doctor_org_id={row.id} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InviteDoctorControl({
  doctorId, accountStatus, onInvited,
}: { doctorId: string; accountStatus: 'NOT_INVITED' | 'INVITED' | 'ACTIVE'; onInvited: () => void }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  if (accountStatus === 'ACTIVE') {
    return <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">Portal Active</span>
  }
  if (accountStatus === 'INVITED') {
    return <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">Invite Sent</span>
  }

  function handleInvite() {
    if (!email.trim()) { setMsg('Email required'); return }
    setMsg(null)
    startTransition(async () => {
      const r = await inviteDoctorAction(doctorId, email)
      setMsg(r.message)
      if (r.success) onInvited()
    })
  }

  return open ? (
    <div className="flex items-center gap-1.5">
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="doctor@email.com"
        type="email"
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-40 focus:border-[#006EFF] focus:outline-none"
      />
      <button onClick={handleInvite} disabled={isPending}
        className="text-xs font-medium text-white bg-[#006EFF] px-2 py-1 rounded-lg disabled:opacity-50">
        {isPending ? '…' : 'Send'}
      </button>
      {msg && <span className="text-xs text-gray-500">{msg}</span>}
    </div>
  ) : (
    <button onClick={() => setOpen(true)} className="text-xs text-[#006EFF] hover:underline">
      + Invite to portal
    </button>
  )
}