import { pgTable, varchar, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core"

export const instagramCookies = pgTable("instagram_cookies", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  cookies: jsonb("cookies").notNull(), // Store cookies as JSON
  sessionId: varchar("session_id", { length: 255 }), // Instagram sessionid for quick lookup
  isValid: boolean("is_valid").default(true).notNull(),
  lastValidated: timestamp("last_validated").defaultNow(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // When cookies might expire
  lastError: text("last_error"),
})

export type InstagramCookie = typeof instagramCookies.$inferSelect
export type NewInstagramCookie = typeof instagramCookies.$inferInsert