import { getSupabaseClient } from '../lib/supabase-storage'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkSupabaseFiles() {
  console.log('📦 Checking files in Supabase bucket...\n')
  
  try {
    const client = getSupabaseClient()
    
    // List all files in the bucket - use null for root directory
    const { data: files, error } = await client.storage
      .from('dumpstr-media')
      .list(undefined, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      })
    
    if (error) {
      console.error('❌ Error listing files:', error)
      return
    }
    
    if (!files || files.length === 0) {
      console.log('📭 No files found in bucket')
      return
    }
    
    console.log(`📁 Found ${files.length} files in bucket:\n`)
    
    // List subdirectories (user folders)
    const folders = new Set<string>()
    
    for (const file of files) {
      if (file.name && !file.name.includes('/')) {
        // This is a folder
        folders.add(file.name)
      }
    }
    
    if (folders.size > 0) {
      console.log('📂 User folders:')
      for (const folder of folders) {
        console.log(`  - ${folder}`)
        
        // List files in this folder
        const { data: userFiles } = await client.storage
          .from('dumpstr-media')
          .list(folder, {
            limit: 10,
            sortBy: { column: 'created_at', order: 'desc' }
          })
        
        if (userFiles && userFiles.length > 0) {
          console.log(`    Files (${userFiles.length}):`)
          for (const file of userFiles.slice(0, 5)) {
            const publicUrl = client.storage
              .from('dumpstr-media')
              .getPublicUrl(`${folder}/${file.name}`).data.publicUrl
            console.log(`      • ${file.name}`)
            console.log(`        Size: ${(file.metadata?.size || 0) / 1024}KB`)
            console.log(`        URL: ${publicUrl}`)
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error)
  }
}

checkSupabaseFiles()