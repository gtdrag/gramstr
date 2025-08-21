import { pgEnum, pgTable, text, timestamp, uuid, integer, boolean, jsonb } from "drizzle-orm/pg-core"

export const contentStatus = pgEnum("content_status", ["downloading", "completed", "failed", "processing"])
export const contentType = pgEnum("content_type", ["image", "video", "carousel"])
export const platformType = pgEnum("platform_type", ["instagram", "tiktok", "youtube", "twitter"])

export const downloadedContent = pgTable("downloaded_content", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  originalUrl: text("original_url").notNull(),
  shortcode: text("shortcode").notNull(),
  caption: text("caption"),
  contentType: contentType("content_type").notNull(),
  status: contentStatus("status").default("downloading").notNull(),
  filePath: text("file_path"),
  thumbnailPath: text("thumbnail_path"),
  isVideo: boolean("is_video").notNull().default(false), // ADD THIS FIELD!
  fileSize: integer("file_size"),
  duration: integer("duration"), // for videos in seconds
  likes: integer("likes").default(0),
  views: integer("views").default(0),
  metadata: jsonb("metadata"), // store additional Instagram metadata
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export const crossPostHistory = pgTable("cross_post_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentId: uuid("content_id").notNull().references(() => downloadedContent.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  platform: platformType("platform").notNull(),
  platformPostId: text("platform_post_id"),
  status: contentStatus("status").default("processing").notNull(),
  errorMessage: text("error_message"),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export const userPlatformCredentials = pgTable("user_platform_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  platform: platformType("platform").notNull(),
  credentials: jsonb("credentials").notNull(), // encrypted platform-specific auth data
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export type InsertDownloadedContent = typeof downloadedContent.$inferInsert
export type SelectDownloadedContent = typeof downloadedContent.$inferSelect

export type InsertCrossPostHistory = typeof crossPostHistory.$inferInsert
export type SelectCrossPostHistory = typeof crossPostHistory.$inferSelect

export type InsertUserPlatformCredentials = typeof userPlatformCredentials.$inferInsert
export type SelectUserPlatformCredentials = typeof userPlatformCredentials.$inferSelect