import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSlots, getDayOfWeek, getDateRange } from '@/lib/availability'

/**
 * GET /api/availability?doctor_org_id=xxx&date=2024-01-15
 * GET /api/availability?doctor_org_id=xxx&from=2024-01-15&days=7  (week view)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const doctor_org_id = searchParams.get('doctor_org_id')
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const days = parseInt(searchParams.get('days') ?? '1')

  if (!doctor_org_id) {
    return NextResponse.json({ error: 'doctor_org_id is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Resolve date range
  const targetFrom = from ?? date ?? today
  const dateRange = getDateRange(targetFrom, days)

  // ── 1. Fetch schedule (weekly recurring) ──────────────────
  const { data: schedules, error: schedErr } = await supabase
    .from('doctor_schedules')
    .select('day_of_week, start_time, end_time, slot_duration, max_per_slot, daily_limit')
    .eq('doctor_org_id', doctor_org_id)
    .eq('is_active', true)

  if (schedErr) return NextResponse.json({ error: schedErr.message }, { status: 500 })

  // ── 2. Fetch exceptions for the date range ─────────────────
  const { data: exceptions } = await supabase
    .from('doctor_exceptions')
    .select('exception_date, is_day_off, start_time, end_time')
    .eq('doctor_org_id', doctor_org_id)
    .in('exception_date', dateRange)

  const exceptionMap = new Map(
    (exceptions ?? []).map(e => [e.exception_date, e])
  )

  // ── 3. Fetch booking rules ────────────────────────────────
  const { data: rules } = await supabase
    .from('booking_rules')
    .select('online_booking_enabled, same_day_booking, advance_booking_days')
    .eq('doctor_org_id', doctor_org_id)
    .single()

  if (rules && !rules.online_booking_enabled) {
    return NextResponse.json({ error: 'Online booking is disabled for this doctor.' }, { status: 403 })
  }

  // ── 4. Fetch existing bookings for the date range ─────────
  const { data: bookings } = await supabase
    .from('appointments')
    .select('appt_date, slot_start')
    .eq('doctor_org_id', doctor_org_id)
    .in('appt_date', dateRange)
    .in('status', ['BOOKED']) // only active bookings count

  // Build booking count map: "date|slot_start" → count
  const bookingCount = new Map<string, number>()
  for (const b of bookings ?? []) {
    const key = `${b.appt_date}|${b.slot_start}`
    bookingCount.set(key, (bookingCount.get(key) ?? 0) + 1)
  }

  // Build schedule map by day
  const scheduleByDay = new Map(
    (schedules ?? []).map(s => [s.day_of_week, s])
  )

  // ── 5. Build availability per date ────────────────────────
  const availability = []

  for (const d of dateRange) {
    // Same-day booking check
    if (!rules?.same_day_booking && d === today) {
      availability.push({ date: d, slots: [], reason: 'same_day_booking_disabled' })
      continue
    }

    // Advance booking window check
    if (rules?.advance_booking_days) {
      const maxDate = new Date(today)
      maxDate.setDate(maxDate.getDate() + rules.advance_booking_days)
      if (new Date(d) > maxDate) {
        availability.push({ date: d, slots: [], reason: 'outside_advance_booking_window' })
        continue
      }
    }

    // Exception check
    const exception = exceptionMap.get(d)
    if (exception?.is_day_off) {
      availability.push({ date: d, slots: [], reason: 'day_off' })
      continue
    }

    const dow = getDayOfWeek(d)
    const schedule = scheduleByDay.get(dow)

    if (!schedule) {
      availability.push({ date: d, slots: [], reason: 'no_schedule' })
      continue
    }

    // Use exception times if partial-day override
    const startTime = exception?.start_time ?? schedule.start_time
    const endTime = exception?.end_time ?? schedule.end_time

    const rawSlots = generateSlots(startTime, endTime, schedule.slot_duration)

    let dailyBooked = 0
    const slots = rawSlots.map(slot => {
      const booked = bookingCount.get(`${d}|${slot.start}`) ?? 0
      dailyBooked += booked
      return {
        start: slot.start,
        end: slot.end,
        booked,
        capacity: schedule.max_per_slot,
        available: booked < schedule.max_per_slot,
      }
    })

    // Apply daily limit
    const dailyLimit = schedule.daily_limit
    const dailyFull = dailyLimit != null && dailyBooked >= dailyLimit

    availability.push({
      date: d,
      slots: dailyFull
        ? slots.map(s => ({ ...s, available: false }))
        : slots,
    })
  }

  return NextResponse.json({ doctor_org_id, availability })
}