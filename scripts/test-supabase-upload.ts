import { uploadToSupabase, getSupabaseClient } from '../lib/supabase-storage'
import { readFileSync } from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testSupabaseUpload() {
  console.log('🧪 Testing Supabase Upload Functionality\n')
  
  try {
    // First, test if we can create a client
    console.log('1️⃣ Testing Supabase client creation...')
    const client = getSupabaseClient()
    console.log('✅ Client created successfully\n')
    
    // Check if the bucket exists
    console.log('2️⃣ Checking if bucket "dumpstr-media" exists...')
    const { data: buckets, error: listError } = await client.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
    } else {
      console.log('📦 Available buckets:', buckets?.map(b => b.name).join(', '))
      const bucketExists = buckets?.some(b => b.name === 'dumpstr-media')
      if (bucketExists) {
        console.log('✅ Bucket "dumpstr-media" exists\n')
      } else {
        console.log('⚠️ Bucket "dumpstr-media" not found. Creating it...')
        const { data, error } = await client.storage.createBucket('dumpstr-media', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        })
        if (error) {
          console.error('❌ Error creating bucket:', error)
        } else {
          console.log('✅ Bucket created successfully:', data)
        }
      }
    }
    
    // Create a test file
    console.log('3️⃣ Creating test file...')
    const testContent = Buffer.from('This is a test file for Supabase upload')
    const testFileName = 'test-upload.txt'
    const testUserId = 'test-user-123'
    
    // Test the upload
    console.log('4️⃣ Uploading test file...')
    const publicUrl = await uploadToSupabase(
      testContent,
      testFileName,
      testUserId,
      'text/plain'
    )
    
    if (publicUrl) {
      console.log('✅ Upload successful!')
      console.log('🌐 Public URL:', publicUrl)
      
      // Try to fetch the file to verify it's accessible
      console.log('\n5️⃣ Verifying file accessibility...')
      const response = await fetch(publicUrl)
      if (response.ok) {
        const content = await response.text()
        console.log('✅ File is accessible')
        console.log('📄 Content:', content)
      } else {
        console.log('⚠️ File uploaded but not accessible via public URL')
        console.log('Status:', response.status, response.statusText)
      }
    } else {
      console.log('❌ Upload failed - check the logs above for details')
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error)
  }
}

// Run the test
testSupabaseUpload()