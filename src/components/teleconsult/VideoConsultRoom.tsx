'use client'

import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference, formatChatMessageLinks } from '@livekit/components-react'
import '@livekit/components-styles'
import { getTeleconsultTokenAction, endTeleconsultRoomAction } from '@/app/actions/teleconsult'

interface Props {
  appointmentId: string
  isDoctor: boolean
  onLeave: () => void
}

export default function VideoConsultRoom({ appointmentId, isDoctor, onLeave }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchToken() {
      setLoading(true)
      setError(null)
      const r = await getTeleconsultTokenAction(appointmentId)
      if (cancelled) return
      if (r.error || !r.token || !r.serverUrl) {
        setError(r.error ?? 'Could not connect to the call.')
        setLoading(false)
        return
      }
      setToken(r.token)
      setServerUrl(r.serverUrl)
      setLoading(false)
    }

    fetchToken()
    return () => { cancelled = true }
  }, [appointmentId])

  async function handleDisconnected() {
    if (isDoctor) {
      await endTeleconsultRoomAction(appointmentId)
    }
    onLeave()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0B14]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#006EFF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-300">Connecting to consultation…</p>
        </div>
      </div>
    )
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0B14] px-4">
        <div className="max-w-sm w-full text-center bg-white rounded-2xl p-6">
          <p className="text-sm font-semibold text-gray-800 mb-1">Can&apos;t join the call</p>
          <p className="text-sm text-gray-500">{error ?? 'Something went wrong.'}</p>
          <button
            onClick={onLeave}
            className="mt-4 text-sm font-medium text-[#006EFF] hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video
      audio
      token={token}
      serverUrl={serverUrl}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={handleDisconnected}
    >
      <VideoConference chatMessageFormatter={formatChatMessageLinks} />
    </LiveKitRoom>
  )
}