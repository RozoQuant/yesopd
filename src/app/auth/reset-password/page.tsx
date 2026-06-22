'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/PasswordInput'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    router.replace('/auth/login?reset=1')
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <span className="text-3xl font-bold text-[#006EFF] tracking-tight">YES</span>
        <span className="text-3xl font-bold text-[#1A1A2E] tracking-tight">OPD</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-xl font-semibold text-[#1A1A2E] mb-6">Set new password</h1>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="password"
            name="password"
            label="New Password"
            placeholder="Min. 8 characters"
            required
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword((e.target as HTMLInputElement).value)}
          />

          <PasswordInput
            id="confirm"
            name="confirm"
            label="Confirm Password"
            placeholder="Re-enter password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm((e.target as HTMLInputElement).value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#006EFF] py-2.5 text-sm font-semibold text-white hover:bg-[#0058CC] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/40 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}