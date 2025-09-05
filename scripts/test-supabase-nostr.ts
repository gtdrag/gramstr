#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })
dotenv.config({ path: resolve(__dirname, '../.env.production') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Testing Supabase Storage Configuration for NOSTR uploads...\n')

// Check environment variables
console.log('Environment Variables:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
console.log('  NOSTR_PRIVATE_KEY:', process.env.NOSTR_PRIVATE_KEY ? '✅ Set' : '❌ Missing')
console.log()

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testSupabaseStorage() {
  try {
    // 1. Check if bucket exists
    console.log('📦 Checking if dumpstr-media bucket exists...')
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      return
    }
    
    const bucketExists = buckets?.some(b => b.name === 'dumpstr-media')
    if (!bucketExists) {
      console.log('❌ Bucket "dumpstr-media" does not exist!')
      console.log('   Run: npm run setup:storage to create it')
      return
    }
    console.log('✅ Bucket exists')
    
    // 2. Test file upload
    console.log('\n📤 Testing file upload to bucket...')
    const testContent = `Test upload at ${new Date().toISOString()}`
    const testFileName = `nostr/test-${Date.now()}.txt`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dumpstr-media')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message)
      return
    }
    console.log('✅ Upload successful:', uploadData.path)
    
    // 3. Get public URL
    console.log('\n🔗 Getting public URL...')
    const { data: urlData } = supabase.storage
      .from('dumpstr-media')
      .getPublicUrl(testFileName)
    
    console.log('✅ Public URL:', urlData.publicUrl)
    
    // 4. Test deletion (cleanup)
    console.log('\n🗑️  Cleaning up test file...')
    const { error: deleteError } = await supabase.storage
      .from('dumpstr-media')
      .remove([testFileName])
    
    if (deleteError) {
      console.error('⚠️  Warning: Could not delete test file:', deleteError.message)
    } else {
      console.log('✅ Test file deleted')
    }
    
    // 5. List existing NOSTR uploads
    console.log('\n📋 Checking existing NOSTR uploads...')
    const { data: files, error: listFilesError } = await supabase.storage
      .from('dumpstr-media')
      .list('nostr', {
        limit: 5,
        offset: 0
      })
    
    if (listFilesError) {
      console.error('❌ Error listing files:', listFilesError.message)
    } else if (files && files.length > 0) {
      console.log(`✅ Found ${files.length} existing NOSTR uploads:`)
      files.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 0} bytes)`)
      })
    } else {
      console.log('ℹ️  No existing NOSTR uploads found')
    }
    
    console.log('\n✅ Supabase Storage is configured correctly for NOSTR uploads!')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testSupabaseStorage()