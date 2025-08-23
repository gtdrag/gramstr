ALTER TYPE "public"."platform_type" ADD VALUE 'nostr';--> statement-breakpoint
ALTER TABLE "downloaded_content" ADD COLUMN "is_video" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "downloaded_content" ADD COLUMN "is_carousel" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "downloaded_content" ADD COLUMN "carousel_files" jsonb;