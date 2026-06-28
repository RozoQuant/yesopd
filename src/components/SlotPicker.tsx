'use client'

import { useState, useEffect } from 'react'

interface Slot {
  start: string
  end: string
  booked: number
  capacity: number
  available: boolean
}

interface DayAvailability {
  date: string
  slots: Slot[]
  reason?: string
}

interface Props {
  doctor_org_id: string
  onSlotSelect: (date: string, slot: Slot) => void
  selectedDate?: string
  selectedSlot?: string
}

const DAYS = 7

export default function SlotPicker({ doctor_org_id, onSlotSelect, selectedDate, selectedSlot }: Props) {
  const [availability, setAvailability] = useState<DayAvailability[]>([])
  const [activeDate, setActiveDate] = useState<string>(selectedDate ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  useEffect(() => {
    async function fetchSlots() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/availability?doctor_org_id=${doctor_org_id}&from=${today}&days=${DAYS}`
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to load slots')
        setAvailability(json.availability)
        // Default to first date that has slots
        const first = json.availability.find((d: DayAvailability) => d.slots?.some((s: Slot) => s.available))
        if (first && !selectedDate) setActiveDate(first.date)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error loading availability')
      } finally {
        setLoading(false)
      }
    }
    fetchSlots()
  }, [doctor_org_id])

  const activeDayData = availability.find(d => d.date === activeDate)

  function formatTab(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return {
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.getDate(),
    }
  }

  if (loading) return (
    <div className="py-10 text-center text-sm text-gray-400">Loading slots…</div>
  )

  if (error) return (
    <div className="py-6 text-center text-sm text-red-500">{error}</div>
  )

  return (
    <div>
      {/* Date tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {availability.map(({ date, slots }) => {
          const hasSlots = slots?.some(s => s.available)
          const { day, date: d } = formatTab(date)
          const isActive = date === activeDate
          return (
            <button
              key={date}
              onClick={() => setActiveDate(date)}
              className={`shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border text-sm transition ${
                isActive
                  ? 'border-[#006EFF] bg-[#006EFF] text-white'
                  : hasSlots
                  ? 'border-gray-200 bg-white text-gray-700 hover:border-[#006EFF]'
                  : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
            >
              <span className="text-xs font-medium">{day}</span>
              <span className="text-base font-bold">{d}</span>
              {!hasSlots && <span className="text-[10px] mt-0.5">Full</span>}
            </button>
          )
        })}
      </div>

      {/* Slot grid */}
      <div className="mt-4">
        {!activeDayData || activeDayData.slots.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {activeDayData?.reason === 'day_off' ? 'Doctor is off on this day.' : 'No slots available.'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {activeDayData.slots.map(slot => {
              const isSelected = activeDate === selectedDate && slot.start === selectedSlot
              return (
                <button
                  key={slot.start}
                  disabled={!slot.available}
                  onClick={() => onSlotSelect(activeDate, slot)}
                  className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                    isSelected
                      ? 'border-[#006EFF] bg-[#006EFF] text-white'
                      : slot.available
                      ? 'border-gray-200 bg-white text-gray-700 hover:border-[#006EFF] hover:text-[#006EFF]'
                      : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                  }`}
                >
                  {slot.start}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}