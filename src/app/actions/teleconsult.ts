'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createLiveKitToken, getRoomServiceClient } from '@/lib/livekit/server'
import { doctorStartAppointmentAction, doctorCompleteConsultAction } from './doctor-queue'

// ── Config ───────────────────────────────────────────────────────────────
// NOTE ON TIMEZONES: appt_date/slot_start are stored as local (IST) wall-clock
// values with no timezone. `new Date(\`${date}T${time}\`)` is parsed in the
// *server process's* local timezone. If you deploy to a host that doesn't
// run in Asia/Kolkata (most PaaS default to UTC), set TZ=Asia/Kolkata in
// your deployment env, or these window checks will be off by your UTC
// offset. This mirrors an existing assumption elsewhere in the codebase
// (see src/lib/availability.ts's localDateStr).
const JOIN_WINDOW_MINUTES_BEFORE = 10 // earliest either party can request a token
const JOIN_GRACE_MINUTES_AFTER = 60   // latest — covers doctor running over
const TOKEN_TTL_SECONDS = 60 * 90     // hard cap per token; client reconnects get a fresh one

interface TokenResult {
  token?: string
  serverUrl?: string
  roomName?: string
  error?: string
}

function roomNameFor(appointmentId: string) {
  return `appt-${appointmentId}`
}

// ── Issue a join token ──────────────────────────────────────────────────
export async function getTeleconsultTokenAction(appointment_id: string): Promise<TokenResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: appt, error: apptErr } = await admin
    .from('appointments')
    .select(`
      id, status, consultation_type, appt_date, slot_start, slot_end, video_room_name,
      patient_id,
      doctor_organizations!inner ( id, doctors ( id, user_id, full_name ) ),
      patients!inner ( id, users!inner ( id, full_name ) )
    `)
    .eq('id', appointment_id)
    .single()

  if (apptErr || !appt) return { error: 'Appointment not found.' }
  if (appt.consultation_type !== 'TELECONSULT') {
    return { error: 'This appointment is not a video consultation.' }
  }

  const doctorOrg = Array.isArray(appt.doctor_organizations) ? appt.doctor_organizations[0] : appt.doctor_organizations
  const doctor = Array.isArray(doctorOrg?.doctors) ? doctorOrg.doctors[0] : doctorOrg?.doctors
  const patientRow = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients
  const patientUser = Array.isArray(patientRow?.users) ? patientRow.users[0] : patientRow?.users

  const isDoctor = !!doctor?.user_id && doctor.user_id === user.id
  const isPatient = appt.patient_id === user.id

  if (!isDoctor && !isPatient) return { error: 'Not authorised for this appointment.' }

  // ── Time-window guard ──
  const apptStart = new Date(`${appt.appt_date}T${appt.slot_start}`)
  const apptEnd = new Date(`${appt.appt_date}T${appt.slot_end}`)
  const now = new Date()
  const earliestJoin = new Date(apptStart.getTime() - JOIN_WINDOW_MINUTES_BEFORE * 60_000)
  const latestJoin = new Date(apptEnd.getTime() + JOIN_GRACE_MINUTES_AFTER * 60_000)

  if (now < earliestJoin) {
    return { error: `You can join up to ${JOIN_WINDOW_MINUTES_BEFORE} minutes before the appointment time.` }
  }
  if (now > latestJoin) {
    return { error: 'This consultation window has closed. Please contact the clinic to reschedule.' }
  }

  // ── Status guard — reuses the existing queue state machine ──
  // Patients can only enter once the doctor has actually started the call.
  if (isPatient && appt.status !== 'IN_PROGRESS') {
    return { error: "Please wait — your doctor hasn't started the call yet." }
  }

  if (isDoctor) {
    if (appt.status === 'CHECKED_IN') {
      // Reuse the existing action so the "only one active consult per doctor"
      // rule stays enforced in exactly one place.
      if (!doctorOrg?.id) return { error: 'Doctor organisation not found.' }
      const startResult = await doctorStartAppointmentAction(appointment_id, doctorOrg.id)
      if ('error' in startResult && startResult.error) return { error: startResult.error }
    } else if (appt.status !== 'IN_PROGRESS') {
      return { error: 'This consultation is not ready to start yet.' }
    }
  }

  // ── Room + token ──
  const roomName = appt.video_room_name ?? roomNameFor(appt.id)

  if (!appt.video_room_name) {
    await admin
      .from('appointments')
      .update({ video_room_name: roomName, video_room_created_at: new Date().toISOString() })
      .eq('id', appt.id)
  }

  const displayName = isDoctor ? `Dr. ${doctor?.full_name ?? ''}`.trim() : (patientUser?.full_name ?? 'Patient')

  const token = await createLiveKitToken({
    roomName,
    identity: user.id,
    name: displayName,
    role: isDoctor ? 'DOCTOR' : 'PATIENT',
    ttlSeconds: TOKEN_TTL_SECONDS,
  })

  if (isDoctor) revalidatePath('/dashboard/doctor')

  return {
    token,
    serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    roomName,
  }
}

// ── Doctor ends the call for everyone ───────────────────────────────────
export async function endTeleconsultRoomAction(appointment_id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: appt } = await admin
    .from('appointments')
    .select(`
      id, appt_date, status, video_room_name,
      doctor_organizations!inner ( id, doctors ( user_id ) )
    `)
    .eq('id', appointment_id)
    .single()

  if (!appt) return { error: 'Appointment not found.' }

  const doctorOrg = Array.isArray(appt.doctor_organizations) ? appt.doctor_organizations[0] : appt.doctor_organizations
  const doctor = Array.isArray(doctorOrg?.doctors) ? doctorOrg.doctors[0] : doctorOrg?.doctors

  if (!doctor?.user_id || doctor.user_id !== user.id) {
    return { error: 'Only the consulting doctor can end this call.' }
  }

  if (appt.video_room_name) {
    try {
      await getRoomServiceClient().deleteRoom(appt.video_room_name)
    } catch {
      // Room may already be closed (e.g. everyone already left) — non-fatal.
    }
  }

  await admin
    .from('appointments')
    .update({ video_ended_at: new Date().toISOString() })
    .eq('id', appointment_id)

  // Fold the video call ending into the existing consult-completion flow —
  // this also triggers auto-advance-queue if the doctor has it enabled.
  if (['IN_PROGRESS', 'CHECKED_IN'].includes(appt.status) && doctorOrg?.id) {
    await doctorCompleteConsultAction(appointment_id, doctorOrg.id, appt.appt_date)
  }

  revalidatePath('/dashboard/doctor')
  return { success: true }
}

// ── Usage tracking against your LiveKit Cloud free-tier minutes ────────
export async function getTeleconsultUsageAction(): Promise<{ minutesUsed: number; monthLabel: string }> {
  const admin = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data } = await admin
    .from('teleconsult_sessions')
    .select('duration_seconds')
    .gte('joined_at', monthStart)

  const totalSeconds = (data ?? []).reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0)

  return {
    minutesUsed: Math.round(totalSeconds / 60),
    monthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  }
}