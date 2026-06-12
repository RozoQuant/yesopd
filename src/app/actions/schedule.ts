'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DayOfWeek } from '@/types'

// ── SCHEDULE ──────────────────────────────────────────────────

export interface ScheduleInput {
  doctor_org_id: string
  day_of_week: DayOfWeek
  start_time: string      // "09:00"
  end_time: string        // "13:00"
  slot_duration?: number  // default 60
  max_per_slot: number
  daily_limit?: number | null
}

export async function upsertScheduleAction(input: ScheduleInput) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('doctor_schedules')
    .upsert(
      {
        doctor_org_id: input.doctor_org_id,
        day_of_week: input.day_of_week,
        start_time: input.start_time,
        end_time: input.end_time,
        slot_duration: input.slot_duration ?? 60,
        max_per_slot: input.max_per_slot,
        daily_limit: input.daily_limit ?? null,
        is_active: true,
      },
      { onConflict: 'doctor_org_id,day_of_week' }
    )

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clinic')
  return { success: true }
}

export async function deleteScheduleAction(doctor_org_id: string, day_of_week: DayOfWeek) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('doctor_schedules')
    .delete()
    .eq('doctor_org_id', doctor_org_id)
    .eq('day_of_week', day_of_week)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clinic')
  return { success: true }
}

export async function getSchedulesAction(doctor_org_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('doctor_schedules')
    .select('*')
    .eq('doctor_org_id', doctor_org_id)
    .eq('is_active', true)
    .order('day_of_week')

  if (error) return { error: error.message }
  return { data }
}

// ── EXCEPTIONS (Leave / Block Dates) ─────────────────────────

export interface ExceptionInput {
  doctor_org_id: string
  exception_date: string   // "2024-06-15"
  is_day_off: boolean
  start_time?: string | null
  end_time?: string | null
  reason?: string | null
}

export async function upsertExceptionAction(input: ExceptionInput) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('doctor_exceptions')
    .upsert(
      {
        doctor_org_id: input.doctor_org_id,
        exception_date: input.exception_date,
        is_day_off: input.is_day_off,
        start_time: input.start_time ?? null,
        end_time: input.end_time ?? null,
        reason: input.reason ?? null,
      },
      { onConflict: 'doctor_org_id,exception_date' }
    )

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clinic')
  return { success: true }
}

export async function deleteExceptionAction(doctor_org_id: string, exception_date: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('doctor_exceptions')
    .delete()
    .eq('doctor_org_id', doctor_org_id)
    .eq('exception_date', exception_date)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clinic')
  return { success: true }
}

export async function getExceptionsAction(doctor_org_id: string, from: string, to: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('doctor_exceptions')
    .select('*')
    .eq('doctor_org_id', doctor_org_id)
    .gte('exception_date', from)
    .lte('exception_date', to)
    .order('exception_date')

  if (error) return { error: error.message }
  return { data }
}

// ── BOOKING RULES ─────────────────────────────────────────────

export interface BookingRulesInput {
  doctor_org_id: string
  same_day_booking: boolean
  online_booking_enabled: boolean
  advance_booking_days: number
}

export async function upsertBookingRulesAction(input: BookingRulesInput) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('booking_rules')
    .upsert(
      {
        doctor_org_id: input.doctor_org_id,
        same_day_booking: input.same_day_booking,
        online_booking_enabled: input.online_booking_enabled,
        advance_booking_days: input.advance_booking_days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'doctor_org_id' }
    )

  if (error) return { error: error.message }
  revalidatePath('/dashboard/clinic')
  return { success: true }
}

export async function getBookingRulesAction(doctor_org_id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('booking_rules')
    .select('*')
    .eq('doctor_org_id', doctor_org_id)
    .single()

  if (error && error.code !== 'PGRST116') return { error: error.message } // PGRST116 = no rows
  return { data: data ?? null }
}