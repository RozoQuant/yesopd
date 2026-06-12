import type { DayOfWeek } from '@/types'

export interface SlotWindow {
  start: string // "09:00"
  end: string   // "10:00"
}

export interface AvailabilityResult {
  date: string
  slots: {
    start: string
    end: string
    booked: number
    capacity: number
    available: boolean
  }[]
}

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
}

/** "09:00" → minutes since midnight */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** minutes → "09:00" */
export function minutesToTime(m: number): string {
  const hh = Math.floor(m / 60).toString().padStart(2, '0')
  const mm = (m % 60).toString().padStart(2, '0')
  return `${hh}:${mm}`
}

/** Generate hourly slot windows from a schedule row */
export function generateSlots(
  startTime: string,
  endTime: string,
  slotDuration: number // minutes
): SlotWindow[] {
  const slots: SlotWindow[] = []
  let cursor = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  while (cursor + slotDuration <= end) {
    slots.push({
      start: minutesToTime(cursor),
      end: minutesToTime(cursor + slotDuration),
    })
    cursor += slotDuration
  }

  return slots
}

/** Returns ISO date strings for the next N days starting from today */
export function getDateRange(fromDate: string, days: number): string[] {
  const dates: string[] = []
  const start = new Date(fromDate)
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export function getDayOfWeek(dateStr: string): DayOfWeek {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_MAP[d.getDay()]
}