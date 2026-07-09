import { NextRequest, NextResponse } from 'next/server'
import { getWebhookReceiver } from '@/lib/livekit/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function appointmentIdFromRoom(roomName?: string): string | null {
  if (!roomName?.startsWith('appt-')) return null
  return roomName.slice('appt-'.length)
}

// Register this endpoint's full URL (https://www.yesopd.com/api/webhooks/livekit)
// as a webhook in your LiveKit Cloud project settings.
export async function POST(req: NextRequest) {
  // WebhookReceiver needs the RAW request body (not parsed JSON) to verify
  // the signature — do not use req.json() here.
  const body = await req.text()
  const authHeader = req.headers.get('Authorization') ?? ''

  let event
  try {
    event = await getWebhookReceiver().receive(body, authHeader)
  } catch (err) {
    console.error('[livekit webhook] signature verification failed', err)
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appointmentId = appointmentIdFromRoom(event.room?.name)

  // ── Idempotency guard ──
  // LiveKit retries webhook delivery on non-2xx responses (and can otherwise
  // redeliver). Log every raw event first with a unique key so re-processing
  // is a safe no-op.
  const eventId =
    event.id ||
    `${event.event}:${event.room?.sid ?? 'no-room'}:${event.participant?.sid ?? 'no-participant'}:${event.createdAt ?? ''}`

  const { error: dedupeErr } = await admin.from('livekit_webhook_events').insert({
    event_id: eventId,
    event_type: event.event,
    room_name: event.room?.name ?? null,
    payload: event as unknown as Record<string, unknown>,
  })

  if (dedupeErr) {
    if (dedupeErr.code === '23505') {
      // Already processed this exact event.
      return NextResponse.json({ ok: true, duplicate: true })
    }
    console.error('[livekit webhook] failed to log event', dedupeErr)
  }

  try {
    switch (event.event) {
      case 'participant_joined': {
        if (!appointmentId || !event.participant?.identity) break

        const { data: appt } = await admin
          .from('appointments')
          .select('patient_id')
          .eq('id', appointmentId)
          .single()

        const role = appt?.patient_id === event.participant.identity ? 'PATIENT' : 'DOCTOR'

        await admin.from('teleconsult_sessions').insert({
          appointment_id: appointmentId,
          room_name: event.room?.name,
          room_sid: event.room?.sid,
          participant_identity: event.participant.identity,
          participant_role: role,
          joined_at: new Date().toISOString(),
        })
        break
      }

      case 'participant_left': {
        if (!event.room?.sid || !event.participant?.identity) break

        const { data: openSession } = await admin
          .from('teleconsult_sessions')
          .select('id, joined_at')
          .eq('room_sid', event.room.sid)
          .eq('participant_identity', event.participant.identity)
          .is('left_at', null)
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (openSession) {
          const leftAt = new Date()
          const durationSeconds = Math.max(
            0,
            Math.round((leftAt.getTime() - new Date(openSession.joined_at).getTime()) / 1000)
          )
          await admin
            .from('teleconsult_sessions')
            .update({
              left_at: leftAt.toISOString(),
              duration_seconds: durationSeconds,
              disconnect_reason: event.participant.disconnectReason ?? null,
            })
            .eq('id', openSession.id)
        }
        break
      }

      case 'room_finished': {
        if (!event.room?.name) break
        await admin
          .from('appointments')
          .update({ video_room_sid: event.room.sid, video_ended_at: new Date().toISOString() })
          .eq('video_room_name', event.room.name)
        break
      }

      default:
        // egress_started / egress_ended / track_published etc. — log-only for now.
        break
    }
  } catch (err) {
    console.error('[livekit webhook] handler error for event', event.event, err)
    // Still return 200 — the raw event is already logged above for replay/debugging,
    // and returning non-2xx would just trigger LiveKit retries of a handler that
    // will likely fail the same way again.
  }

  return NextResponse.json({ ok: true })
}