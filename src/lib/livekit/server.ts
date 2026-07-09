import { AccessToken, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk'

// LIVEKIT_URL should be your LiveKit Cloud project URL, e.g.
// wss://yesopd-xxxxxxxx.livekit.cloud
// The server SDKs accept ws(s):// and transparently use it as http(s)://
// for the REST/Twirp APIs, so the same value works for both server and
// client (NEXT_PUBLIC_LIVEKIT_URL).
const apiKey = process.env.LIVEKIT_API_KEY
const apiSecret = process.env.LIVEKIT_API_SECRET
const livekitUrl = process.env.LIVEKIT_URL

function assertConfigured(): void {
  if (!apiKey || !apiSecret || !livekitUrl) {
    throw new Error(
      "[livekit] Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL environment variables. " +
      "Set these in .env.local (dev) and your hosting provider's env config (prod)."
    )
  }
}

export function getRoomServiceClient(): RoomServiceClient {
  assertConfigured()
  return new RoomServiceClient(livekitUrl!, apiKey!, apiSecret!)
}

export function getWebhookReceiver(): WebhookReceiver {
  assertConfigured()
  return new WebhookReceiver(apiKey!, apiSecret!)
}

export interface TokenGrantInput {
  roomName: string
  /** Stable, unique identity for this participant — we use the Supabase auth user id. */
  identity: string
  name: string
  role: 'DOCTOR' | 'PATIENT'
  ttlSeconds: number
}

/**
 * Issues a short-lived LiveKit access token scoped to exactly one room.
 * Doctors get `roomAdmin` so the client UI (@livekit/components-react) can
 * surface moderation controls — actual enforcement of room deletion /
 * participant removal still happens server-side via RoomServiceClient using
 * the API secret, so a tampered client token alone can't be abused.
 */
export async function createLiveKitToken({
  roomName,
  identity,
  name,
  role,
  ttlSeconds,
}: TokenGrantInput): Promise<string> {
  assertConfigured()

  const at = new AccessToken(apiKey!, apiSecret!, {
    identity,
    name,
    ttl: ttlSeconds,
  })

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true, // in-call chat
    canUpdateOwnMetadata: true,
    roomAdmin: role === 'DOCTOR',
  })

  return at.toJwt()
}