'use client'

import { useState, useTransition } from 'react'
import { setOrgStatusAction, approveDoctorAction } from '@/app/actions/admin'

interface Stats { orgs: number; doctors: number; patients: number; appointments: number }

interface OrgRow {
  id: string
  name: string
  org_type: string
  status: string
  city: string
  state: string
  created_at: string
  users: { full_name: string; email: string } | null
}

interface DoctorRow {
  id: string
  full_name: string
  qualification: string | null
  status: string
  is_approved: boolean
  created_at: string
  doctor_organizations: { organizations: { name: string; city: string } | null }[]
}

interface Props {
  stats: Stats
  initialOrgs: unknown[]
  initialDoctors: unknown[]
}

type Tab = 'overview' | 'organizations' | 'doctors'

const STAT_CARDS = [
  { key: 'orgs', label: 'Organizations', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'doctors', label: 'Doctors', color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'patients', label: 'Patients', color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'appointments', label: 'Appointments', color: 'text-orange-600', bg: 'bg-orange-50' },
] as const

export default function AdminDashboardClient({ stats, initialOrgs, initialDoctors }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [orgs, setOrgs] = useState<OrgRow[]>(initialOrgs as OrgRow[])
  const [doctors, setDoctors] = useState<DoctorRow[]>(initialDoctors as DoctorRow[])
  const [isPending, startTransition] = useTransition()

  function handleOrgStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') {
    startTransition(async () => {
      await setOrgStatusAction(id, status)
      setOrgs(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    })
  }

  function handleDoctorApprove(id: string, approve: boolean) {
    startTransition(async () => {
      await approveDoctorAction(id, approve)
      setDoctors(prev => prev.map(d => d.id === id ? { ...d, is_approved: approve } : d))
    })
  }

  const pendingOrgs = orgs.filter(o => o.status === 'PENDING')
  const pendingDoctors = doctors.filter(d => !d.is_approved)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['overview', 'organizations', 'doctors'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize ${
              tab === t ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-gray-500'
            }`}
          >
            {t}
            {t === 'organizations' && pendingOrgs.length > 0 && (
              <span className="ml-1.5 bg-yellow-400 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingOrgs.length}
              </span>
            )}
            {t === 'doctors' && pendingDoctors.length > 0 && (
              <span className="ml-1.5 bg-yellow-400 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingDoctors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STAT_CARDS.map(card => (
            <div key={card.key} className={`${card.bg} rounded-2xl p-5`}>
              <p className={`text-3xl font-bold ${card.color}`}>{stats[card.key]}</p>
              <p className="text-sm text-gray-600 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Organizations */}
      {tab === 'organizations' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{orgs.length} total · {pendingOrgs.length} pending review</p>
          {orgs.map(org => (
            <div key={org.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1A1A2E]">{org.name}</p>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {org.org_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      org.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200'
                      : org.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {org.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{org.city}, {org.state}</p>
                  {org.users && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Admin: {org.users.full_name} · {org.users.email}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {org.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleOrgStatus(org.id, 'ACTIVE')}
                      disabled={isPending}
                      className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {org.status !== 'SUSPENDED' && (
                    <button
                      onClick={() => handleOrgStatus(org.id, 'SUSPENDED')}
                      disabled={isPending}
                      className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  )}
                  {org.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleOrgStatus(org.id, 'PENDING')}
                      disabled={isPending}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                      Reinstate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Doctors */}
      {tab === 'doctors' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{doctors.length} total · {pendingDoctors.length} pending approval</p>
          {doctors.map(doc => {
            const orgsLinked = doc.doctor_organizations
              ?.map(d => d.organizations?.name)
              .filter(Boolean).join(', ')
            return (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#1A1A2E]">{doc.full_name}</p>
                      {doc.qualification && (
                        <span className="text-xs text-gray-500">{doc.qualification}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        doc.is_approved
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {doc.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    {orgsLinked && (
                      <p className="text-xs text-gray-400 mt-1">{orgsLinked}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!doc.is_approved ? (
                      <button
                        onClick={() => handleDoctorApprove(doc.id, true)}
                        disabled={isPending}
                        className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDoctorApprove(doc.id, false)}
                        disabled={isPending}
                        className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}