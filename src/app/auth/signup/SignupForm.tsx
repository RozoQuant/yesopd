'use client'

import { useActionState, useState } from 'react'
import { signupAction } from '@/app/actions/auth'
import PasswordInput from '@/components/PasswordInput'
import type { UserRole } from '@/types'

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'PATIENT', label: 'Patient', desc: 'Book appointments' },
  { value: 'CLINIC_ADMIN', label: 'Clinic / Hospital', desc: 'Manage your practice' },
]

const initialState = { error: undefined as string | undefined }

export default function SignupForm() {
  const [role, setRole] = useState<UserRole>('PATIENT')

  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      formData.set('role', role)
      const result = await signupAction(formData)
      return result ?? initialState
    },
    initialState
  )

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">I am a</p>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`rounded-lg border-2 px-4 py-3 text-left transition ${
                role === r.value
                  ? 'border-[#006EFF] bg-[#006EFF]/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className={`text-sm font-semibold ${role === r.value ? 'text-[#006EFF]' : 'text-gray-800'}`}>
                {r.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          placeholder="Dr. Sharma / Amit Kumar"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#006EFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20 transition"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#006EFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006EFF]/20 transition"
        />
      </div>

      <PasswordInput
        id="password"
        name="password"
        label="Password"
        placeholder="Min. 8 characters"
        required
        minLength={8}
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[#006EFF] py-2.5 text-sm font-semibold text-white hover:bg-[#0058CC] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/40 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {isPending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        By signing up you agree to YESOPD&apos;s terms of service.
      </p>
    </form>
  )
}