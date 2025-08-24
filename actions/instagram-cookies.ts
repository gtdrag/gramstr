"use server"

import { db } from "@/db"
import { instagramCookies } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function saveInstagramCookies(userId: string, cookies: any[]) {
  try {
    // Extract sessionid if present
    const sessionCookie = cookies.find((c: any) => c.name === 'sessionid')
    const sessionId = sessionCookie?.value || null
    
    // Calculate expiration (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    
    // Upsert cookies
    await db.insert(instagramCookies)
      .values({
        userId,
        cookies,
        sessionId,
        isValid: true,
        uploadedAt: new Date(),
        lastValidated: new Date(),
        expiresAt,
        lastError: null,
      })
      .onConflictDoUpdate({
        target: instagramCookies.userId,
        set: {
          cookies,
          sessionId,
          isValid: true,
          uploadedAt: new Date(),
          lastValidated: new Date(),
          expiresAt,
          lastError: null,
        }
      })
    
    return { success: true }
  } catch (error) {
    console.error("Failed to save Instagram cookies:", error)
    return { success: false, error: "Failed to save cookies" }
  }
}

export async function getInstagramCookies(userId: string) {
  try {
    const result = await db.select()
      .from(instagramCookies)
      .where(eq(instagramCookies.userId, userId))
      .limit(1)
    
    if (result.length === 0) {
      return null
    }
    
    const cookieData = result[0]
    
    // Check if cookies are expired
    if (cookieData.expiresAt && new Date() > cookieData.expiresAt) {
      return null
    }
    
    return cookieData
  } catch (error) {
    console.error("Failed to get Instagram cookies:", error)
    return null
  }
}

export async function invalidateInstagramCookies(userId: string, error: string) {
  try {
    await db.update(instagramCookies)
      .set({
        isValid: false,
        lastError: error,
        lastValidated: new Date(),
      })
      .where(eq(instagramCookies.userId, userId))
    
    return { success: true }
  } catch (error) {
    console.error("Failed to invalidate Instagram cookies:", error)
    return { success: false }
  }
}