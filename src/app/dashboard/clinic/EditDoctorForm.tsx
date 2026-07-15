'use client'

import { useState, useTransition } from 'react'
import { updateDoctorAction } from '@/app/actions/doctor-edit'

interface Specialization { id: number; name: string }

interface DoctorForEdit {
  doctor_org_id: string
  doctor_id: string
  full_name: string
  qualification: string | null
  experience_yrs: number
  bio: string | null
  languages: string[]
  photo_url: string | null
  consultation_fee: number
  specialization_ids: number[]
}

interface Props {
  doctor: DoctorForEdit
  specializations: Specialization[]
  onClose: () => void
  onSaved: () => void
}

export default function EditDoctorForm({ doctor, specializations, onClose, onSaved }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedSpecs, setSelectedSpecs] = useState<number[]>(doctor.specialization_ids)

  function toggleSpec(id: number) {
    setSelectedSpecs(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateDoctorAction({
        doctor_id: doctor.doctor_id,
        doctor_org_id: doctor.doctor_org_id,
        full_name: fd.get('full_name') as string,
        qualification: (fd.get('qualification') as string) || undefined,
        experience_yrs: Number(fd.get('experience_yrs') ?? 0),
        consultation_fee: Number(fd.get('consultation_fee')),
        bio: (fd.get('bio') as string) || undefined,
        languages: ((fd.get('languages') as string) || '')
          .split(',')
          .map(l => l.trim())
          .filter(Boolean),
        specialization_ids: selectedSpecs,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        onSaved()
      }
    })
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1A1A2E]">Edit Doctor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Full name *</label>
              <input name="full_name" required defaultValue={doctor.full_name} className="input" />
            </div>
            <div>
              <label className="label">Qualification</label>
              <input name="qualification" defaultValue={doctor.qualification ?? ''} className="input" />
            </div>
            <div>
              <label className="label">Experience (years)</label>
              <input name="experience_yrs" type="number" min={0} defaultValue={doctor.experience_yrs} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Consultation fee (₹) *</label>
              <input name="consultation_fee" type="number" min={0} required defaultValue={doctor.consultation_fee} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Languages (comma separated)</label>
              <input name="languages" defaultValue={doctor.languages.join(', ')} className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Bio</label>
              <textarea name="bio" rows={2} defaultValue={doctor.bio ?? ''} className="input resize-none" />
            </div>
          </div>

          {/* Specializations */}
          <div>
            <label className="label mb-2">Specializations</label>
            <div className="flex flex-wrap gap-2">
              {specializations.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSpec(s.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    selectedSpecs.includes(s.id)
                      ? 'bg-[#006EFF] text-white border-[#006EFF]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#006EFF]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#006EFF] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#0058CC] disabled:opacity-60 transition"
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .label { display: block; font-size: 0.75rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid #E5E7EB; background: #F9FAFB; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: #111827; outline: none; }
        .input:focus { border-color: #006EFF; background: white; box-shadow: 0 0 0 3px rgba(0,110,255,0.1); }
      `}</style>
    </div>
  )
}