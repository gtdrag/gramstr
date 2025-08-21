CREATE TYPE "public"."content_status" AS ENUM('downloading', 'completed', 'failed', 'processing');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('image', 'video', 'carousel');--> statement-breakpoint
CREATE TYPE "public"."platform_type" AS ENUM('instagram', 'tiktok', 'youtube', 'twitter');--> statement-breakpoint
CREATE TABLE "cross_post_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"platform" "platform_type" NOT NULL,
	"platform_post_id" text,
	"status" "content_status" DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"posted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "downloaded_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"original_url" text NOT NULL,
	"shortcode" text NOT NULL,
	"caption" text,
	"content_type" "content_type" NOT NULL,
	"status" "content_status" DEFAULT 'downloading' NOT NULL,
	"file_path" text,
	"thumbnail_path" text,
	"file_size" integer,
	"duration" integer,
	"likes" integer DEFAULT 0,
	"views" integer DEFAULT 0,
	"metadata" jsonb,
	"downloaded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_platform_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" "platform_type" NOT NULL,
	"credentials" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cross_post_history" ADD CONSTRAINT "cross_post_history_content_id_downloaded_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."downloaded_content"("id") ON DELETE cascade ON UPDATE no action;