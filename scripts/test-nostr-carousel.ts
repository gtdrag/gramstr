import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testNostrCarousel() {
  console.log('🧪 Testing NOSTR carousel posting...\n')
  
  // Simulate carousel data like what would be in the database
  const mockCarouselData = {
    id: 'test-carousel-123',
    userId: 'b586551cc19af1fd4b28a7a5002258ab8fa9521fb27af0140cb1022437879074',
    isCarousel: true,
    caption: 'Test carousel post from Gramstr',
    originalUrl: 'https://www.instagram.com/p/TEST/',
    supabaseCarouselUrls: [
      'https://jrhyqcugjnddbbmbplbk.supabase.co/storage/v1/object/public/dumpstr-media/b586551cc19af1fd4b28a7a5002258ab8fa9521fb27af0140cb1022437879074/1756434264651_3695537658764693068_3695537627676452776.jpg',
      'https://jrhyqcugjnddbbmbplbk.supabase.co/storage/v1/object/public/dumpstr-media/b586551cc19af1fd4b28a7a5002258ab8fa9521fb27af0140cb1022437879074/1756434265921_3695537658764693068_3695537628129503054.jpg',
      'https://jrhyqcugjnddbbmbplbk.supabase.co/storage/v1/object/public/dumpstr-media/b586551cc19af1fd4b28a7a5002258ab8fa9521fb27af0140cb1022437879074/1756434267173_3695537658764693068_3695537627483531830.jpg'
    ]
  }
  
  console.log('📊 Mock carousel data:')
  console.log(`  - Is Carousel: ${mockCarouselData.isCarousel}`)
  console.log(`  - Has ${mockCarouselData.supabaseCarouselUrls.length} Supabase URLs`)
  console.log(`  - Caption: ${mockCarouselData.caption}`)
  
  // Test the logic that would be in the NOSTR posting endpoint
  const carouselUrls = mockCarouselData.supabaseCarouselUrls
  
  if (mockCarouselData.isCarousel && carouselUrls) {
    console.log(`\n✅ Would process carousel with ${carouselUrls.length} files`)
    
    const publicUrls: string[] = []
    for (const url of carouselUrls) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log(`  ✓ Using Supabase URL directly: ${url.substring(0, 80)}...`)
        publicUrls.push(url)
      }
    }
    
    // Build the NOSTR note content
    let noteContent = mockCarouselData.caption || 'Shared from ⚡gramstr'
    if (publicUrls.length > 0) {
      noteContent = `${noteContent}\n\n${publicUrls.join('\n')}`
    }
    if (mockCarouselData.originalUrl) {
      noteContent = `${noteContent}\n\nOriginal: ${mockCarouselData.originalUrl}`
    }
    
    console.log('\n📝 Final NOSTR note content:')
    console.log('---')
    console.log(noteContent)
    console.log('---')
    
    console.log(`\n✅ This would post to NOSTR with ${publicUrls.length} image URLs`)
  } else {
    console.log('❌ Not detected as carousel')
  }
}

testNostrCarousel()