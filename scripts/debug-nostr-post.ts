// Debug script to test NOSTR posting endpoint
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function debugNostrPost() {
  // This is the content ID you're trying to post
  // Replace with the actual ID from your gallery post
  const contentId = 'YOUR_CONTENT_ID_HERE'
  
  console.log('🔍 Testing NOSTR post endpoint...\n')
  
  try {
    // First, get the content to see what we're working with
    const listResponse = await fetch('http://localhost:3000/api/content/list', {
      headers: {
        'Cookie': 'visitor_id=visitor_454eb9b2-3bb0-41a7-acd9-2a32893e2fc1' // Use your actual visitor cookie
      }
    })
    
    const listData = await listResponse.json()
    console.log(`Found ${listData.content?.length || 0} content items`)
    
    if (listData.content && listData.content.length > 0) {
      // Find carousel posts
      const carousels = listData.content.filter((c: any) => c.isCarousel)
      console.log(`Found ${carousels.length} carousel posts`)
      
      if (carousels.length > 0) {
        const carousel = carousels[0]
        console.log('\n📸 First carousel post:')
        console.log(`  ID: ${carousel.id}`)
        console.log(`  Caption: ${carousel.caption?.substring(0, 50)}...`)
        console.log(`  Is Carousel: ${carousel.isCarousel}`)
        console.log(`  Has carouselFiles: ${!!carousel.carouselFiles}`)
        console.log(`  Has supabaseCarouselUrls: ${!!carousel.supabaseCarouselUrls}`)
        
        if (carousel.supabaseCarouselUrls) {
          console.log(`  Supabase URLs (${carousel.supabaseCarouselUrls.length}):`)
          carousel.supabaseCarouselUrls.forEach((url: string, i: number) => {
            console.log(`    ${i+1}. ${url.substring(0, 80)}...`)
          })
        }
        
        // Now try to post to NOSTR
        console.log('\n📤 Attempting to post to NOSTR...')
        const postResponse = await fetch('http://localhost:3000/api/nostr/post', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'visitor_id=visitor_454eb9b2-3bb0-41a7-acd9-2a32893e2fc1'
          },
          body: JSON.stringify({
            contentId: carousel.id
          })
        })
        
        const postData = await postResponse.json()
        
        if (postResponse.ok) {
          console.log('✅ NOSTR post successful!')
          console.log(`  Note ID: ${postData.noteId}`)
          console.log(`  Message: ${postData.message}`)
        } else {
          console.log('❌ NOSTR post failed:')
          console.log(`  Error: ${postData.error}`)
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

debugNostrPost()