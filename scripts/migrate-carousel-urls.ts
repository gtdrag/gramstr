import { db } from '../db'
import { downloadedContent } from '../db/schema/content'
import { eq } from 'drizzle-orm'
import dotenv from 'dotenv'
import { getSupabaseClient } from '../lib/supabase-storage'

dotenv.config({ path: '.env.local' })

async function migrateCarouselUrls() {
  console.log('🔄 Migrating carousel URLs to use Supabase URLs...\n')
  
  try {
    // Get all carousel posts
    const carousels = await db
      .select()
      .from(downloadedContent)
      .where(eq(downloadedContent.isCarousel, true))
    
    console.log(`Found ${carousels.length} carousel posts to check`)
    
    const supabase = getSupabaseClient()
    let updated = 0
    
    for (const carousel of carousels) {
      // Skip if already has supabaseCarouselUrls
      if (carousel.supabaseCarouselUrls) {
        console.log(`✓ ${carousel.id} already has Supabase URLs`)
        continue
      }
      
      // Check if we have carousel files to migrate
      if (!carousel.carouselFiles || (carousel.carouselFiles as string[]).length === 0) {
        console.log(`⚠️ ${carousel.id} has no carousel files`)
        continue
      }
      
      console.log(`\n📸 Processing ${carousel.id}...`)
      const carouselFiles = carousel.carouselFiles as string[]
      const supabaseUrls: string[] = []
      
      // Check if files exist in Supabase
      for (const file of carouselFiles) {
        // Build the expected Supabase path
        const expectedPath = `${carousel.userId}/${file}`
        
        // Get public URL (this doesn't check if file exists, just builds URL)
        const { data: { publicUrl } } = supabase.storage
          .from('dumpstr-media')
          .getPublicUrl(expectedPath)
        
        console.log(`  Checking: ${file}`)
        
        // Try to verify if the file actually exists by listing files
        const { data: files } = await supabase.storage
          .from('dumpstr-media')
          .list(carousel.userId, {
            search: file.split('/').pop() // Search for filename
          })
        
        if (files && files.length > 0) {
          console.log(`    ✓ Found in Supabase: ${publicUrl}`)
          supabaseUrls.push(publicUrl)
        } else {
          console.log(`    ✗ Not found in Supabase`)
        }
      }
      
      // Update the database if we found Supabase URLs
      if (supabaseUrls.length > 0) {
        await db.update(downloadedContent)
          .set({
            supabaseCarouselUrls: supabaseUrls
          })
          .where(eq(downloadedContent.id, carousel.id))
        
        console.log(`  ✅ Updated with ${supabaseUrls.length} Supabase URLs`)
        updated++
      }
    }
    
    console.log(`\n✅ Migration complete! Updated ${updated} carousel posts`)
    
  } catch (error) {
    console.error('Migration error:', error)
  } finally {
    process.exit(0)
  }
}

migrateCarouselUrls()