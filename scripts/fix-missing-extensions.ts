#!/usr/bin/env tsx

import { db } from "../db"
import { downloadedContent } from "../db/schema"
import { eq } from "drizzle-orm"
import * as fs from "fs"
import * as path from "path"

async function fixMissingExtensions() {
  console.log("🔧 Fixing missing file extensions in database...")
  
  try {
    const allContent = await db.select().from(downloadedContent)
    
    console.log(`Found ${allContent.length} content records to check`)
    
    let updatedCount = 0
    
    for (const content of allContent) {
      if (!content.filePath || !content.userId) continue
      
      let needsUpdate = false
      let newFilePath = content.filePath
      let newThumbnailPath = content.thumbnailPath
      
      const userDir = `downloads/${content.userId}`
      
      // Check if filePath is missing extension
      if (!content.filePath.includes('.')) {
        // Look for the actual file with extension
        const possibleExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.jpg', '.jpeg', '.png', '.webp']
        
        for (const ext of possibleExtensions) {
          const fullPath = path.join(userDir, content.filePath + ext)
          if (fs.existsSync(fullPath)) {
            newFilePath = content.filePath + ext
            needsUpdate = true
            console.log(`📁 Adding missing extension: ${content.filePath} -> ${newFilePath}`)
            break
          }
        }
      }
      
      // Check if thumbnailPath is missing extension  
      if (content.thumbnailPath && !content.thumbnailPath.includes('.')) {
        const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp']
        
        for (const ext of possibleExtensions) {
          const fullPath = path.join(userDir, content.thumbnailPath + ext)
          if (fs.existsSync(fullPath)) {
            newThumbnailPath = content.thumbnailPath + ext
            needsUpdate = true
            console.log(`🖼️ Adding missing thumbnail extension: ${content.thumbnailPath} -> ${newThumbnailPath}`)
            break
          }
        }
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
    
    console.log(`✅ Updated ${updatedCount} records with missing extensions`)
    console.log("🎉 Extension fix complete!")
    
  } catch (error) {
    console.error("❌ Error fixing extensions:", error)
    process.exit(1)
  }
}

fixMissingExtensions()