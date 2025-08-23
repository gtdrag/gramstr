#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

console.log('🗄️  Creating Supabase Storage bucket for Dumpstr...')
console.log('')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBucket() {
  try {
    // First, let's check what buckets exist
    console.log('🔍 Checking existing buckets...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message)
      console.log('')
      console.log('📋 Manual Setup Required:')
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard')
      console.log('2. Navigate to Storage')
      console.log('3. Create a new bucket named "dumpstr-media"')
      console.log('4. Set it as public')
      console.log('5. Allow video/* and image/* file types')
      console.log('')
      return
    }
    
    console.log('📁 Found buckets:', buckets?.map(b => b.name).join(', ') || 'none')
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'dumpstr-media')
    
    if (bucketExists) {
      console.log('✅ dumpstr-media bucket already exists!')
    } else {
      console.log('📁 Creating dumpstr-media bucket...')
      
      // Try to create bucket (this might fail with anon key)
      const { error: bucketError } = await supabase.storage.createBucket('dumpstr-media', {
        public: true,
        allowedMimeTypes: ['video/*', 'image/*'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB
      })
      
      if (bucketError) {
        console.error('❌ Failed to create bucket:', bucketError.message)
        console.log('')
        console.log('📋 Manual Setup Required:')
        console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard')
        console.log('2. Navigate to Storage')
        console.log('3. Create a new bucket named "dumpstr-media"')
        console.log('4. Set it as public')
        console.log('5. Allow video/* and image/* file types')
        console.log('6. Set file size limit to 50MB')
        console.log('')
        console.log('🔧 Once created manually, NOSTR posting will work!')
        return
      }
      
      console.log('✅ Created dumpstr-media bucket!')
    }
    
    console.log('')
    console.log('🎉 Storage setup complete!')
    console.log('⚡ Ready to test NOSTR video posting!')
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.log('')
    console.log('📋 Please create the bucket manually in your Supabase dashboard')
  }
}

createBucket()