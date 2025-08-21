#!/usr/bin/env tsx

import { db } from "../db"
import { downloadedContent } from "../db/schema"
import { eq } from "drizzle-orm"

async function fixExistingVideos() {
  console.log("🔧 Fixing existing video records...")
  
  try {
    // Get all content records
    const allContent = await db.select().from(downloadedContent)
    
    console.log(`Found ${allContent.length} content records to check`)
    
    let updatedCount = 0
    
    for (const content of allContent) {
      // Check if the file path indicates a video
      if (content.filePath) {
        const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov']
        const hasVideoExtension = videoExtensions.some(ext => 
          content.filePath?.toLowerCase().endsWith(ext)
        )
        
        if (hasVideoExtension && !content.isVideo) {
          await db
            .update(downloadedContent)
            .set({ 
              isVideo: true,
              contentType: "video"
            })
            .where(eq(downloadedContent.id, content.id))
          
          console.log(`📹 Fixed ${content.filePath} - set to video`)
          updatedCount++
        }
      }
    }
    
    console.log(`✅ Updated ${updatedCount} video records`)
    console.log("🎉 Video detection fix complete!")
    
  } catch (error) {
    console.error("❌ Error fixing video detection:", error)
    process.exit(1)
  }
}

fixExistingVideos()