'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/PasswordInput'

export default function ChangePasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (current === password) { setError('New password must differ from current.'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setError('Session expired. Please log in again.'); setLoading(false); return }

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current })
    if (signInErr) { setError('Current password is incorrect.'); setLoading(false); return }

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateErr) { setError(updateErr.message); return }

    setSuccess(true)
    setTimeout(() => router.back(), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#1A1A2E]">Change Password</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {success ? (
            <div className="text-center space-y-3 py-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Password updated successfully!</p>
              <p className="text-xs text-gray-400">Redirecting you back…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <PasswordInput id="current" name="current" label="Current Password" required autoComplete="current-password" value={current} onChange={e => setCurrent((e.target as HTMLInputElement).value)} />
              <PasswordInput id="password" name="password" label="New Password" placeholder="Min. 8 characters" required autoComplete="new-password" value={password} onChange={e => setPassword((e.target as HTMLInputElement).value)} />
              <PasswordInput id="confirm" name="confirm" label="Confirm New Password" placeholder="Re-enter new password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm((e.target as HTMLInputElement).value)} />
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#006EFF] py-2.5 text-sm font-semibold text-white hover:bg-[#0058CC] focus:outline-none focus:ring-2 focus:ring-[#006EFF]/40 disabled:opacity-60 disabled:cursor-not-allowed transition">
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}