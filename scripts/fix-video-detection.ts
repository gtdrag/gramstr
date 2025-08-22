#!/usr/bin/env tsx

import { db } from "../db"
import { downloadedContent } from "../db/schema"
import { eq } from "drizzle-orm"

async function fixVideoDetection() {
  console.log("🔧 Fixing video detection in database...")
  
  try {
    // Get all content records
    const allContent = await db.select().from(downloadedContent)
    
    console.log(`Found ${allContent.length} content records to check`)
    
    let updatedCount = 0
    
    for (const content of allContent) {
      let needsUpdate = false
      let newIsVideo = content.isVideo
      
      // Check if the file path indicates a video
      if (content.filePath) {
        const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov']
        const hasVideoExtension = videoExtensions.some(ext => 
          content.filePath?.toLowerCase().endsWith(ext)
        )
        
        if (hasVideoExtension && !content.isVideo) {
          newIsVideo = true
          needsUpdate = true
          console.log(`📹 Fixing ${content.filePath} - should be video`)
        } else if (!hasVideoExtension && content.isVideo) {
          newIsVideo = false
          needsUpdate = true
          console.log(`🖼️ Fixing ${content.filePath} - should be image`)
        }
      }
      
      if (needsUpdate) {
        await db
          .update(downloadedContent)
          .set({ isVideo: newIsVideo })
          .where(eq(downloadedContent.id, content.id))
        
        updatedCount++
      }
    }
    
    console.log(`✅ Updated ${updatedCount} records`)
    console.log("🎉 Video detection fix complete!")
    
  } catch (error) {
    console.error("❌ Error fixing video detection:", error)
    process.exit(1)
  }
}

fixVideoDetection()