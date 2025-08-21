#!/usr/bin/env tsx

import { db } from "../db"
import { downloadedContent } from "../db/schema"
import { desc, eq } from "drizzle-orm"
import * as fs from "fs"
import * as path from "path"

async function cleanupOldContent() {
  console.log("🧹 Cleaning up old content, keeping only 3 most recent...")
  
  try {
    // Get all content ordered by most recent first
    const allContent = await db
      .select()
      .from(downloadedContent)
      .orderBy(desc(downloadedContent.downloadedAt))
    
    console.log(`Found ${allContent.length} total content records`)
    
    if (allContent.length <= 3) {
      console.log("✅ Already have 3 or fewer records, nothing to clean up!")
      return
    }
    
    // Keep the first 3 (most recent), remove the rest
    const toKeep = allContent.slice(0, 3)
    const toRemove = allContent.slice(3)
    
    console.log(`📋 Keeping ${toKeep.length} most recent records:`)
    toKeep.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.filePath} (${item.downloadedAt})`)
    })
    
    console.log(`🗑️ Removing ${toRemove.length} older records:`)
    
    let deletedFiles = 0
    let deletedRecords = 0
    
    for (const content of toRemove) {
      console.log(`  🔥 Removing: ${content.filePath}`)
      
      // Delete actual files if they exist
      if (content.userId) {
        const userDir = `downloads/${content.userId}`
        
        // Delete main file
        if (content.filePath) {
          const filePath = path.join(userDir, content.filePath)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            console.log(`    📁 Deleted file: ${content.filePath}`)
            deletedFiles++
          }
        }
        
        // Delete thumbnail
        if (content.thumbnailPath) {
          const thumbPath = path.join(userDir, content.thumbnailPath)
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath)
            console.log(`    🖼️ Deleted thumbnail: ${content.thumbnailPath}`)
            deletedFiles++
          }
        }
        
        // Delete info.json file if it exists
        if (content.filePath) {
          const baseName = content.filePath.replace(/\.[^/.]+$/, "") // Remove extension
          const infoPath = path.join(userDir, baseName + '.info.json')
          if (fs.existsSync(infoPath)) {
            fs.unlinkSync(infoPath)
            console.log(`    📄 Deleted info: ${baseName}.info.json`)
            deletedFiles++
          }
        }
      }
      
      // Delete database record
      await db
        .delete(downloadedContent)
        .where(eq(downloadedContent.id, content.id))
      
      deletedRecords++
    }
    
    console.log(`✅ Cleanup complete!`)
    console.log(`   📊 Deleted ${deletedRecords} database records`)
    console.log(`   📁 Deleted ${deletedFiles} files`)
    console.log(`   🎉 Kept ${toKeep.length} most recent videos`)
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
    process.exit(1)
  }
}

cleanupOldContent()