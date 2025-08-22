#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorage() {
  try {
    console.log('🗄️  Setting up Supabase Storage for InstaScrape...')
    
    // Create the bucket
    console.log('📁 Creating instascrape-media bucket...')
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('instascrape-media', {
      public: true,
      allowedMimeTypes: ['video/*', 'image/*'],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      throw bucketError
    }
    
    if (bucketError?.message.includes('already exists')) {
      console.log('✅ Bucket already exists')
    } else {
      console.log('✅ Created instascrape-media bucket')
    }
    
    // Set up RLS policies for public read access
    console.log('🔒 Setting up storage policies...')
    
    // Policy to allow public read access
    const { error: policyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'instascrape-media',
      policy_name: 'Public read access',
      definition: 'true'
    })
    
    if (policyError && !policyError.message.includes('already exists')) {
      // If the RPC doesn't exist, we'll need to use SQL
      console.log('⚠️  RPC not available, will need manual policy setup')
    }
    
    console.log('✅ Storage setup complete!')
    console.log('')
    console.log('📋 Next steps:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to Storage -> Policies')
    console.log('3. Add a policy for public read access if not already set')
    console.log('')
    console.log('🎯 Ready to test NOSTR video posting!')
    
  } catch (error) {
    console.error('❌ Storage setup failed:', error)
    process.exit(1)
  }
}

setupStorage()