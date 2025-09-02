import { db } from "@/db"
import { downloadedContent } from "@/db/schema"
import { eq, and, isNull, or } from "drizzle-orm"
import { createClient } from "@supabase/supabase-js"
import fs from "fs/promises"
import path from "path"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function uploadToSupabase(
  filePath: string,
  fileName: string,
  userId: string,
  contentType?: string
): Promise<string | null> {
  try {
    const fileBuffer = await fs.readFile(filePath)
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: contentType || 'application/octet-stream' })
    
    const uniqueFileName = `${Date.now()}_${fileName}`
    const storagePath = `${userId}/${uniqueFileName}`
    
    const { data, error } = await supabase.storage
      .from('instagram-content')
      .upload(storagePath, blob, {
        contentType: contentType || undefined,
        upsert: false
      })
    
    if (error) {
      console.error(`Upload error for ${fileName}:`, error)
      return null
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('instagram-content')
      .getPublicUrl(storagePath)
    
    return publicUrl
  } catch (error) {
    console.error(`Failed to upload ${fileName}:`, error)
    return null
  }
}

async function fixMissingUrls() {
  console.log("🔍 Finding content with missing Supabase URLs...")
  
  // Find all content where single images/videos don't have Supabase URLs
  const itemsToFix = await db.select()
    .from(downloadedContent)
    .where(
      and(
        or(
          eq(downloadedContent.contentType, "image"),
          eq(downloadedContent.contentType, "video")
        ),
        isNull(downloadedContent.supabaseFileUrl)
      )
    )
  
  console.log(`Found ${itemsToFix.length} items to fix`)
  
  const downloadsDir = path.join(process.cwd(), "downloads")
  
  for (const item of itemsToFix) {
    console.log(`\n📦 Processing: ${item.caption?.substring(0, 50)}...`)
    
    if (!item.filePath || !item.userId) {
      console.log("⚠️ Skipping - missing filePath or userId")
      continue
    }
    
    const localFilePath = path.join(downloadsDir, item.userId, item.filePath)
    
    try {
      // Check if file exists locally
      await fs.access(localFilePath)
      
      // Determine content type
      let contentType = 'image/jpeg'
      if (item.filePath.endsWith('.mp4')) contentType = 'video/mp4'
      else if (item.filePath.endsWith('.png')) contentType = 'image/png'
      else if (item.filePath.endsWith('.webp')) contentType = 'image/webp'
      
      // Upload main file
      console.log(`⬆️ Uploading main file: ${item.filePath}`)
      const supabaseFileUrl = await uploadToSupabase(
        localFilePath,
        item.filePath,
        item.userId,
        contentType
      )
      
      // Upload thumbnail if exists
      let supabaseThumbnailUrl = null
      if (item.thumbnailPath) {
        const thumbnailPath = path.join(downloadsDir, item.userId, item.thumbnailPath)
        try {
          await fs.access(thumbnailPath)
          console.log(`⬆️ Uploading thumbnail: ${item.thumbnailPath}`)
          supabaseThumbnailUrl = await uploadToSupabase(
            thumbnailPath,
            item.thumbnailPath,
            item.userId,
            'image/jpeg'
          )
        } catch {
          console.log("⚠️ Thumbnail not found locally")
        }
      }
      
      // Update database
      if (supabaseFileUrl) {
        await db.update(downloadedContent)
          .set({
            supabaseFileUrl,
            supabaseThumbnailUrl
          })
          .where(eq(downloadedContent.id, item.id))
        
        console.log("✅ Updated database with Supabase URLs")
      } else {
        console.log("❌ Failed to upload to Supabase")
      }
      
    } catch (error) {
      console.log(`❌ File not found locally: ${localFilePath}`)
    }
  }
  
  console.log("\n✨ Done! Fixed all missing Supabase URLs")
}

fixMissingUrls().catch(console.error)