'use client'

import { useState, useTransition } from 'react'
import { updateOrgAction } from '@/app/actions/org-settings'
import type { Organization } from '@/types'

interface Props {
  org: Organization
}

export default function OrgSettingsTab({ org }: Props) {
  const [form, setForm] = useState({
    name: org.name,
    address_line1: org.address_line1 ?? '',
    address_line2: org.address_line2 ?? '',
    city: org.city,
    state: org.state,
    pincode: org.pincode ?? '',
    phone: org.phone ?? '',
    email: org.email ?? '',
    google_maps_url: org.google_maps_url ?? '',
    logo_url: org.logo_url ?? '',
  })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSave() {
    setError(null)
    setSuccess(null)
    if (!form.name.trim()) { setError('Clinic name is required.'); return }
    if (!form.city.trim() || !form.state.trim()) { setError('City and state are required.'); return }

    startTransition(async () => {
      const r = await updateOrgAction(org.id, form)
      if (r?.error) { setError(r.error); return }
      setSuccess('Settings saved.')
      setTimeout(() => setSuccess(null), 3000)
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#1A1A2E] mb-1">Clinic profile</h2>
          <p className="text-xs text-gray-400">
            This is what patients see when they search for and book with your doctors.
          </p>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {success && <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Clinic / hospital name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Address line 1</label>
            <input value={form.address_line1} onChange={e => set('address_line1', e.target.value)} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Address line 2</label>
            <input value={form.address_line2} onChange={e => set('address_line2', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">City *</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">State *</label>
            <input value={form.state} onChange={e => set('state', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Pincode</label>
            <input value={form.pincode} onChange={e => set('pincode', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <input value={form.email} onChange={e => set('email', e.target.value)} type="email" className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Google Maps link</label>
            <input value={form.google_maps_url} onChange={e => set('google_maps_url', e.target.value)} placeholder="https://maps.google.com/…" className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Logo URL</label>
            <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://…" className="input" />
            <p className="text-xs text-gray-400 mt-1">
              Paste a hosted image link for now. Direct upload (Supabase Storage) is a natural next step — flag it
              if you want that built next.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full bg-[#006EFF] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#0058CC] disabled:opacity-60 transition"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <style jsx>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid #E5E7EB; background: #F9FAFB; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: #111827; outline: none; }
        .input:focus { border-color: #006EFF; background: white; box-shadow: 0 0 0 3px rgba(0,110,255,0.1); }
      `}</style>
    </div>
  )
}