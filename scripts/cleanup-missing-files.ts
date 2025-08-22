#!/usr/bin/env tsx

import { db } from "../db"
import { downloadedContent } from "../db/schema"
import { existsSync } from "fs"
import { join } from "path"

async function cleanupMissingFiles() {
  console.log("🧹 Starting cleanup of database records with missing files...")
  
  const allContent = await db.select().from(downloadedContent)
  console.log(`Found ${allContent.length} content records in database`)
  
  let removedCount = 0
  
  for (const content of allContent) {
    const userDir = `downloads/${content.userId}`
    let fileMissing = false
    
    // Check if main file exists
    if (content.filePath) {
      const filePath = join(userDir, content.filePath)
      if (!existsSync(filePath)) {
        console.log(`❌ Missing file: ${filePath}`)
        fileMissing = true
      }
    }
    
    // Check if thumbnail exists
    if (content.thumbnailPath) {
      const thumbPath = join(userDir, content.thumbnailPath)
      if (!existsSync(thumbPath)) {
        console.log(`❌ Missing thumbnail: ${thumbPath}`)
        fileMissing = true
      }
    }
    
    // If files are missing, remove the database record
    if (fileMissing) {
      console.log(`🗑️  Removing database record: ${content.filePath}`)
      await db.delete(downloadedContent).where({ id: content.id } as any)
      removedCount++
    } else {
      console.log(`✅ Files exist: ${content.filePath}`)
    }
  }
  
  console.log(`\n✨ Cleanup complete! Removed ${removedCount} records with missing files.`)
}

cleanupMissingFiles().catch(console.error)