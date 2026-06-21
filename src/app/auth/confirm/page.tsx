'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// This page handles Supabase invite links which use hash fragments (#access_token=...&type=invite)
// Hash fragments are never sent to the server, so they must be handled client-side.

export default function ConfirmPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleInvite() {
      const hash = window.location.hash.substring(1)
      if (!hash) {
        router.replace('/auth/login')
        return
      }

      const params = new URLSearchParams(hash)
      const type = params.get('type')
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const errorParam = params.get('error')
      const errorDescription = params.get('error_description')

      // Handle expired / invalid link
      if (errorParam) {
        setError(errorDescription ?? 'Link is invalid or has expired.')
        return
      }

      if (!accessToken || !refreshToken) {
        router.replace('/auth/login')
        return
      }

      const supabase = createClient()

      // Set the session from the hash tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      // Invite type → go set password
      if (type === 'invite') {
        router.replace('/auth/set-password')
        return
      }

      // Any other type (recovery, magiclink) → role-based redirect
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id ?? '')
        .single()

      switch (profile?.role) {
        case 'SUPER_ADMIN': router.replace('/dashboard/admin'); break
        case 'CLINIC_ADMIN': router.replace('/dashboard/clinic'); break
        case 'STAFF': router.replace('/dashboard/staff'); break
        case 'PATIENT': router.replace('/dashboard/patient'); break
        default: router.replace('/auth/login')
      }
    }

    handleInvite()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <p className="text-xs text-gray-400">
            Please ask your clinic admin to resend the invitation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#006EFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Verifying your invitation…</p>
      </div>
    </div>
  )
}