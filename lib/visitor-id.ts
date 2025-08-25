import { cookies, headers } from "next/headers"
import { v4 as uuidv4 } from "uuid"

const VISITOR_ID_COOKIE = "visitor_id"
const NOSTR_PUBKEY_HEADER = "x-nostr-pubkey"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

/**
 * Get the user ID for the current request
 * Priority: NOSTR pubkey > visitor cookie > new session ID
 */
export async function getUserId(): Promise<string> {
  // First check for NOSTR public key in headers (set by client)
  const headerStore = await headers()
  const nostrPubkey = headerStore.get(NOSTR_PUBKEY_HEADER)
  
  if (nostrPubkey) {
    // Use NOSTR public key as primary identifier
    return nostrPubkey
  }
  
  // Fall back to visitor cookie for non-NOSTR users
  const cookieStore = await cookies()
  const existingId = cookieStore.get(VISITOR_ID_COOKIE)
  
  if (existingId?.value) {
    return existingId.value
  }
  
  // Generate new visitor ID for anonymous users
  const newVisitorId = `visitor_${uuidv4()}`
  
  // Set cookie for future visits
  cookieStore.set(VISITOR_ID_COOKIE, newVisitorId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  })
  
  return newVisitorId
}