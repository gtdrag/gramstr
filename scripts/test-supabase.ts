#!/usr/bin/env tsx

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

console.log('🔍 Testing Supabase connection...')
console.log('')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Environment variables:')
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing')
console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔗 Testing Supabase connection...')
    
    // Test basic connection by listing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to connect to Supabase Storage:', listError)
      console.log('')
      console.log('Possible issues:')
      console.log('1. Invalid Supabase URL or anon key')
      console.log('2. Network connectivity issues')
      console.log('3. Supabase project not accessible')
      return
    }
    
    console.log('✅ Successfully connected to Supabase!')
    console.log('📁 Available buckets:', buckets?.map(b => b.name).join(', ') || 'none')
    
    // Check if our bucket exists
    const bucketExists = buckets?.some(bucket => bucket.name === 'dumpstr-media')
    console.log('🎯 dumpstr-media bucket:', bucketExists ? '✅ Exists' : '❌ Not found')
    
    if (!bucketExists) {
      console.log('')
      console.log('📋 To fix: Create "dumpstr-media" bucket in Supabase dashboard')
      console.log('Settings: Public=true, Allow video/* and image/* files')
    } else {
      console.log('')
      console.log('🎉 Storage setup looks good!')
      
      // Test creating a small test file
      console.log('🧪 Testing file upload...')
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      
      const { data, error } = await supabase.storage
        .from('dumpstr-media')
        .upload(`test/${Date.now()}-test.txt`, testFile)
      
      if (error) {
        console.error('❌ Upload test failed:', error)
        console.log('')
        console.log('Possible issues:')
        console.log('1. Bucket permissions not set correctly')
        console.log('2. Authentication issues with anon key')
        console.log('3. Storage policies blocking uploads')
      } else {
        console.log('✅ Upload test successful!')
        
        // Clean up test file
        await supabase.storage.from('dumpstr-media').remove([data.path])
        console.log('🧹 Test file cleaned up')
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testConnection()