'use client'

import { useState, useTransition } from 'react'
import { addStaffAction } from '@/app/actions/staff'

interface Props {
  org_id: string
  onClose: () => void
  onSaved: () => void
}

export default function AddStaffForm({
  org_id,
  onClose,
  onSaved,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await addStaffAction({
        org_id,
        full_name: fd.get('full_name') as string,
        phone: fd.get('phone') as string,
        email: fd.get('email') as string,
        designation: fd.get('designation') as
          | 'RECEPTIONIST'
          | 'CABIN_ATTENDANT'
          | 'NURSE'
          | 'OTHER',
      })

      if (!result.success) {
        setError(result.message)
        return
      }

      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-[#1A1A2E]">
            Add Staff
          </h2>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="px-6 py-5 space-y-4"
        >
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="label">
              Full Name *
            </label>
            <input
              name="full_name"
              required
              className="input"
              placeholder="Staff name"
            />
          </div>

          <div>
            <label className="label">
              Mobile Number *
            </label>
            <input
              name="phone"
              required
              className="input"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="label">
              Email *
            </label>
            <input
              name="email"
              type="email"
              required
              className="input"
              placeholder="staff@example.com"
            />
          </div>

          <div>
            <label className="label">
              Designation *
            </label>

            <select
              name="designation"
              required
              className="input"
              defaultValue="RECEPTIONIST"
            >
              <option value="RECEPTIONIST">
                RECEPTIONIST
              </option>

              <option value="CABIN_ATTENDANT">
                CABIN_ATTENDANT
              </option>

              <option value="NURSE">
                NURSE
              </option>

              <option value="OTHER">
                OTHER
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#006EFF] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#0058CC] disabled:opacity-60 transition"
          >
            {isPending ? 'Inviting...' : 'Add Staff'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #E5E7EB;
          background: #F9FAFB;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
        }

        .input:focus {
          border-color: #006EFF;
          background: white;
          box-shadow: 0 0 0 3px rgba(0,110,255,0.1);
        }
      `}</style>
    </div>
  )
}