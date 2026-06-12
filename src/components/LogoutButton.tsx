'use client'

import { logoutAction } from '@/app/actions/auth'
import { useTransition } from 'react'

export default function LogoutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={isPending}
      className={className ?? 'text-sm text-gray-500 hover:text-red-600 transition disabled:opacity-50'}
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}