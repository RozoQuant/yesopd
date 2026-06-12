'use client'

import { useState, useEffect, useRef } from 'react'
import { getMyNotificationsAction, markAllReadAction } from '@/app/actions/notification'

const TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMATION: '✅ Appointment confirmed',
  APPOINTMENT_REMINDER: '🔔 Appointment reminder',
  APPOINTMENT_CANCELLATION: '❌ Appointment cancelled',
}

interface Notification {
  id: string
  type: string
  is_read: boolean
  created_at: string
  appt_id: string | null
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.is_read).length

  async function load() {
    setLoading(true)
    const result = await getMyNotificationsAction()
    if (result?.data) setNotifications(result.data as Notification[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleOpen() {
    setOpen(o => !o)
    if (!open && unread > 0) {
      await markAllReadAction()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-500 hover:text-gray-800 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-[#1A1A2E]">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No notifications yet.</p>
            )}
            {!loading && notifications.map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
              >
                <p className="text-sm text-gray-800">{TYPE_LABELS[n.type] ?? n.type}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}