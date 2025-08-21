#!/usr/bin/env tsx

import { db } from "../db"
import { downloadedContent } from "../db/schema"
import { eq } from "drizzle-orm"
import { basename } from "path"

async function fixFilePaths() {
  console.log("🔧 Fixing inconsistent file paths in database...")
  
  try {
    const allContent = await db.select().from(downloadedContent)
    
    console.log(`Found ${allContent.length} content records to check`)
    
    let updatedCount = 0
    
    for (const content of allContent) {
      let needsUpdate = false
      let newFilePath = content.filePath
      let newThumbnailPath = content.thumbnailPath
      
      // Fix filePath - extract just the filename if it's a full path
      if (content.filePath && content.filePath.includes('/')) {
        newFilePath = basename(content.filePath)
        needsUpdate = true
        console.log(`📁 Fixing filePath: ${content.filePath} -> ${newFilePath}`)
      }
      
      // Fix thumbnailPath - extract just the filename if it's a full path
      if (content.thumbnailPath && content.thumbnailPath.includes('/')) {
        newThumbnailPath = basename(content.thumbnailPath)
        needsUpdate = true
        console.log(`🖼️ Fixing thumbnailPath: ${content.thumbnailPath} -> ${newThumbnailPath}`)
      }
      
      if (needsUpdate) {
        await db
          .update(downloadedContent)
          .set({ 
            filePath: newFilePath,
            thumbnailPath: newThumbnailPath
          })
          .where(eq(downloadedContent.id, content.id))
        
        updatedCount++
      }
    }
    
    console.log(`✅ Updated ${updatedCount} records with fixed file paths`)
    console.log("🎉 File path cleanup complete!")
    
  } catch (error) {
    console.error("❌ Error fixing file paths:", error)
    process.exit(1)
  }
}

fixFilePaths()