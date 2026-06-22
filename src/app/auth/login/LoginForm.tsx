'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'
import PasswordInput from '@/components/PasswordInput'

const initialState = { error: undefined as string | undefined }

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await loginAction(formData)
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

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <Link href="/auth/forgot-password" className="text-xs text-[#006EFF] hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          label=""
          required
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[#006EFF] py-2.5 text-sm font-semibold text-white hover:bg-[#0058CC] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/40 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}