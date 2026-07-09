'use client'

import { useState } from 'react'
import VideoConsultRoom from './VideoConsultRoom'

interface Props {
  appointmentId: string
  isDoctor: boolean
  label?: string
  className?: string
  disabled?: boolean
}

/**
 * Drop this in place of the old `daily_room_url` "Join Call" anchor.
 * It doesn't need a stored URL — the token (and room, on first use) are
 * created on demand when the button is pressed.
 */
export default function TeleconsultLauncher({ appointmentId, isDoctor, label, className, disabled }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          className ??
          'flex-1 text-center text-xs font-medium bg-purple-500 text-white rounded-lg py-1.5 hover:bg-purple-600 disabled:opacity-40 transition'
        }
      >
        {label ?? (isDoctor ? 'Start Video Call' : 'Join Video Call')}
      </button>

      {open && (
        <VideoConsultRoom
          appointmentId={appointmentId}
          isDoctor={isDoctor}
          onLeave={() => setOpen(false)}
        />
      )}
    </>
  )
}