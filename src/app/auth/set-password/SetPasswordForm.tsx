'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PasswordInput from '@/components/PasswordInput'

export default function SetPasswordForm() {
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
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('staff').update({ status: 'ACTIVE' }).eq('user_id', user.id)
    }

    router.replace('/dashboard/staff')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
        {loading ? 'Activating account…' : 'Set Password & Continue'}
      </button>
    </form>
  )
}