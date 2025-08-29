import { db } from '../db'
import { downloadedContent } from '../db/schema/content'
import { desc, eq } from 'drizzle-orm'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkCarouselData() {
  console.log('🔍 Checking carousel posts in database...\n')
  
  try {
    // Get recent carousel posts
    const carousels = await db
      .select()
      .from(downloadedContent)
      .where(eq(downloadedContent.isCarousel, true))
      .orderBy(desc(downloadedContent.createdAt))
      .limit(5)
    
    if (carousels.length === 0) {
      console.log('No carousel posts found in database')
      return
    }
    
    console.log(`Found ${carousels.length} carousel posts:\n`)
    
    for (const post of carousels) {
      console.log('=' .repeat(80))
      console.log(`📸 Post ID: ${post.id}`)
      console.log(`📅 Created: ${post.createdAt}`)
      console.log(`📝 Caption: ${post.caption?.substring(0, 50)}...`)
      console.log(`🎠 Is Carousel: ${post.isCarousel}`)
      console.log(`📊 Content Type: ${post.contentType}`)
      console.log('\n📁 File Storage:')
      console.log(`  - filePath: ${post.filePath}`)
      console.log(`  - supabaseFileUrl: ${post.supabaseFileUrl}`)
      console.log(`  - thumbnailPath: ${post.thumbnailPath}`)
      console.log(`  - supabaseThumbnailUrl: ${post.supabaseThumbnailUrl}`)
      
      console.log('\n🎨 Carousel Files:')
      if (post.carouselFiles) {
        const files = post.carouselFiles as string[]
        console.log(`  - carouselFiles (${files.length} items):`)
        files.forEach((f, i) => console.log(`    ${i+1}. ${f}`))
      } else {
        console.log('  - carouselFiles: null')
      }
      
      if (post.supabaseCarouselUrls) {
        const urls = post.supabaseCarouselUrls as string[]
        console.log(`  - supabaseCarouselUrls (${urls.length} items):`)
        urls.forEach((u, i) => console.log(`    ${i+1}. ${u.substring(0, 80)}...`))
      } else {
        console.log('  - supabaseCarouselUrls: null')
      }
      
      console.log()
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

checkCarouselData()