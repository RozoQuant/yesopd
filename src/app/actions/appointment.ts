'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assignQueueNumberAction } from './queue'

// ── BOOK ──────────────────────────────────────────────────────

export interface BookAppointmentInput {
  doctor_org_id: string
  appt_date: string   // "2024-06-15"
  slot_start: string  // "10:00"
  slot_end: string    // "11:00"
  patient_notes?: string
}

export async function bookAppointmentAction(input: BookAppointmentInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data: rules } = await supabase
    .from('booking_rules')
    .select(
      'same_day_booking, online_booking_enabled, advance_booking_days'
    )
    .eq('doctor_org_id', input.doctor_org_id)
    .maybeSingle()

  if (rules) {
    if (!rules.online_booking_enabled) {
      return { error: 'Online booking is disabled for this doctor.' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const bookingDate = new Date(input.appt_date)
    bookingDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor(
      (bookingDate.getTime() - today.getTime()) / 86400000
    )

    if (!rules.same_day_booking && diffDays === 0) {
      return { error: 'Same-day booking is not allowed.' }
    }

    if (diffDays > rules.advance_booking_days) {
      return {
        error: `Appointments can only be booked ${rules.advance_booking_days} days in advance.`,
      }
    }
  }

  // 1. Re-verify slot is still available (race condition guard)
  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_org_id', input.doctor_org_id)
    .eq('appt_date', input.appt_date)
    .eq('slot_start', input.slot_start)
    .eq('status', 'BOOKED')

  // Fetch capacity for this slot
  const bookingDay = new Date(input.appt_date)
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase()

  const { data: schedule } = await supabase
    .from('doctor_schedules')
    .select('max_per_slot, daily_limit')
    .eq('doctor_org_id', input.doctor_org_id)
    .eq('day_of_week', bookingDay)
    .maybeSingle()

  if (schedule && count !== null && count >= schedule.max_per_slot) {
    return { error: 'This slot is now full. Please choose another slot.' }
  }

  if (schedule?.daily_limit) {
    const { count: dailyCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_org_id', input.doctor_org_id)
      .eq('appt_date', input.appt_date)
      .eq('status', 'BOOKED')

    if (dailyCount !== null && dailyCount >= schedule.daily_limit) {
      return { error: 'Daily appointment limit reached.' }
    }
  }

  // 2. Check patient has not already booked this same slot
  const { data: duplicate } = await supabase
    .from('appointments')
    .select('id')
    .eq('patient_id', user.id)
    .eq('doctor_org_id', input.doctor_org_id)
    .eq('appt_date', input.appt_date)
    .eq('slot_start', input.slot_start)
    .eq('status', 'BOOKED')
    .maybeSingle()

  if (duplicate) {
    return { error: 'You already have a booking for this slot.' }
  }

  // 3. Insert appointment
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: user.id,
      doctor_org_id: input.doctor_org_id,
      appt_date: input.appt_date,
      slot_start: input.slot_start,
      slot_end: input.slot_end,
      status: 'BOOKED',
      source: 'YESOPD',
      payment_mode: 'PAY_AT_CLINIC',
      patient_notes: input.patient_notes ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // 3b. Assign queue number
  const { queue_code } = await assignQueueNumberAction(
    data.id,
    input.doctor_org_id,
    input.appt_date,
    input.slot_start
  )

  // 4. Create confirmation notification
  await supabase.from('notifications').insert({
    user_id: user.id,
    appt_id: data.id,
    type: 'BOOKING_CONFIRMATION',
    channel: 'EMAIL',
  })

  revalidatePath('/dashboard/patient')

  return {
    success: true,
    appointment_id: data.id,
    queue_code,
  }
}

// ── CANCEL ────────────────────────────────────────────────────

export async function cancelAppointmentAction(appointment_id: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, status, patient_id')
    .eq('id', appointment_id)
    .single()

  if (!appt) return { error: 'Appointment not found.' }
  if (appt.patient_id !== user.id) return { error: 'Not authorised.' }
  if (appt.status !== 'BOOKED') return { error: 'Only BOOKED appointments can be cancelled.' }

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'CANCELLED',
      cancel_reason: reason ?? null,
    })
    .eq('id', appointment_id)

  if (error) return { error: error.message }

  await supabase.from('notifications').insert({
    user_id: user.id,
    appt_id: appointment_id,
    type: 'APPOINTMENT_CANCELLATION',
    channel: 'EMAIL',
  })

  revalidatePath('/dashboard/patient')
  return { success: true }
}

// ── RESCHEDULE ────────────────────────────────────────────────

export interface RescheduleInput {
  appointment_id: string
  new_date: string
  new_slot_start: string
  new_slot_end: string
}

export async function rescheduleAppointmentAction(input: RescheduleInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }



  const { data: appt } = await supabase
    .from('appointments')
    .select('id, status, patient_id, doctor_org_id')
    .eq('id', input.appointment_id)
    .single()

  if (!appt) return { error: 'Appointment not found.' }
  if (appt.patient_id !== user.id) return { error: 'Not authorised.' }
  if (appt.status !== 'BOOKED') return { error: 'Only BOOKED appointments can be rescheduled.' }

  const { data: rules } = await supabase
    .from('booking_rules')
    .select(
      'same_day_booking, online_booking_enabled, advance_booking_days'
    )
    .eq('doctor_org_id', appt.doctor_org_id)
    .maybeSingle()

  if (rules) {
    if (!rules.online_booking_enabled) {
      return { error: 'Online booking is disabled for this doctor.' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const bookingDate = new Date(input.new_date)
    bookingDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor(
      (bookingDate.getTime() - today.getTime()) / 86400000
    )

    if (!rules.same_day_booking && diffDays === 0) {
      return { error: 'Same-day booking is not allowed.' }
    }

    if (diffDays > rules.advance_booking_days) {
      return {
        error: `Appointments can only be booked ${rules.advance_booking_days} days in advance.`,
      }
    }
  }

  // Verify new slot capacity
  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('doctor_org_id', appt.doctor_org_id)
    .eq('appt_date', input.new_date)
    .eq('slot_start', input.new_slot_start)
    .eq('status', 'BOOKED')

  const bookingDay = new Date(input.new_date)
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase()

  const { data: schedule } = await supabase
    .from('doctor_schedules')
    .select('max_per_slot, daily_limit')
    .eq('doctor_org_id', appt.doctor_org_id)
    .eq('day_of_week', bookingDay)
    .maybeSingle()

  if (schedule && count !== null && count >= schedule.max_per_slot) {
    return { error: 'New slot is full. Please choose another slot.' }
  }

  if (schedule?.daily_limit) {
    const { count: dailyCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_org_id', appt.doctor_org_id)
      .eq('appt_date', input.new_date)
      .eq('status', 'BOOKED')

    if (dailyCount !== null && dailyCount >= schedule.daily_limit) {
      return { error: 'Daily appointment limit reached.' }
    }
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      appt_date: input.new_date,
      slot_start: input.new_slot_start,
      slot_end: input.new_slot_end,
    })
    .eq('id', input.appointment_id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/patient')
  return { success: true }
}

// ── FETCH PATIENT APPOINTMENTS ────────────────────────────────

export async function getMyAppointmentsAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appt_date,
      slot_start,
      slot_end,
      status,
      patient_notes,
      booked_at,
      doctor_organizations (
        consultation_fee,
        doctors (
          full_name,
          qualification,
          photo_url
        ),
        organizations (
          name,
          city,
          address_line1
        )
      )
    `)
    .eq('patient_id', user.id)
    .order('appt_date', { ascending: false })

  if (error) return { error: error.message }

  const normalized = (data ?? []).map((row: any) => {
    const doctorOrg = Array.isArray(row.doctor_organizations)
      ? row.doctor_organizations[0] ?? null
      : row.doctor_organizations

    return {
      ...row,
      doctor_organizations: doctorOrg
        ? {
            ...doctorOrg,
            doctors: Array.isArray(doctorOrg.doctors)
              ? doctorOrg.doctors[0] ?? null
              : doctorOrg.doctors,
            organizations: Array.isArray(doctorOrg.organizations)
              ? doctorOrg.organizations[0] ?? null
              : doctorOrg.organizations,
          }
        : null,
    }
  })

  return { data: normalized }
}

// ── FETCH UPCOMING (for reminders / dashboard top card) ───────

export async function getUpcomingAppointmentsAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appt_date,
      slot_start,
      slot_end,
      status,
      doctor_organizations (
        consultation_fee,
        doctors (
          full_name,
          qualification,
          photo_url
        ),
        organizations (
          name,
          city,
          address_line1
        )
      )
    `)
    .eq('patient_id', user.id)
    .eq('status', 'BOOKED')
    .gte('appt_date', today)
    .order('appt_date', { ascending: true })
    .limit(5)

  if (error) return { error: error.message }

  const normalized = (data ?? []).map((row: any) => {
    const doctorOrg = Array.isArray(row.doctor_organizations)
      ? row.doctor_organizations[0] ?? null
      : row.doctor_organizations

    return {
      ...row,
      doctor_organizations: doctorOrg
        ? {
            ...doctorOrg,
            doctors: Array.isArray(doctorOrg.doctors)
              ? doctorOrg.doctors[0] ?? null
              : doctorOrg.doctors,
            organizations: Array.isArray(doctorOrg.organizations)
              ? doctorOrg.organizations[0] ?? null
              : doctorOrg.organizations,
          }
        : null,
    }
  })

  return { data: normalized }
}