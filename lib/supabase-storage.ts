import { createClient } from '@supabase/supabase-js'

// Create a Supabase client for storage operations
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log(`🔐 SUPABASE: URL exists: ${!!supabaseUrl}`)
  console.log(`🔐 SUPABASE: Key exists: ${!!supabaseKey}`)
  console.log(`🔐 SUPABASE: URL starts with: ${supabaseUrl?.substring(0, 20)}...`)
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE: Missing credentials!')
    throw new Error('Missing Supabase credentials')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function uploadToSupabase(
  file: Buffer | Blob,
  fileName: string,
  userId: string,
  mimeType?: string
): Promise<string | null> {
  const fileSize = file instanceof Blob ? file.size : file.length
  const fileSizeMB = fileSize / (1024 * 1024)
  const isVideo = mimeType?.startsWith('video/')
  
  console.log(`🚀 SUPABASE: Starting upload for ${fileName}`)
  console.log(`📊 SUPABASE: File size: ${fileSizeMB.toFixed(2)} MB, MIME: ${mimeType}`)
  
  // Warn about large files
  if (fileSizeMB > 100) {
    console.warn(`⚠️ SUPABASE: Large file (${fileSizeMB.toFixed(2)} MB) - upload may take longer or fail`)
  }
  
  // Retry logic for videos and large files
  const maxRetries = isVideo ? 3 : 1
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 SUPABASE: Retry attempt ${attempt}/${maxRetries} for ${fileName}`)
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
      }
      
      const supabase = getSupabaseClient()
      console.log('✅ SUPABASE: Client created successfully')
      
      // Create a unique path for the file
      const filePath = `${userId}/${Date.now()}_${fileName}`
      console.log(`📁 SUPABASE: Upload path: ${filePath}`)
      
      // For videos, use longer timeout
      const uploadOptions: any = {
        contentType: mimeType,
        upsert: false
      }
      
      // Note: Supabase client doesn't expose timeout directly, but we can handle it
      console.log(`⏰ SUPABASE: Starting upload (attempt ${attempt})...`)
      
      const { data, error } = await supabase.storage
        .from('dumpstr-media')
        .upload(filePath, file, uploadOptions)

      if (error) {
        console.error(`❌ SUPABASE: Upload error (attempt ${attempt}):`, error)
        console.error('❌ SUPABASE: Error details:', JSON.stringify(error, null, 2))
        
        // Check for specific error types
        if (error.message?.includes('size') || error.message?.includes('too large')) {
          console.error('❌ SUPABASE: File size exceeds storage limits')
          return null // Don't retry for size limit errors
        }
        
        if (error.message?.includes('timeout')) {
          console.error('❌ SUPABASE: Upload timed out')
        }
        
        lastError = error
        
        if (attempt === maxRetries) {
          console.error(`❌ SUPABASE: All ${maxRetries} attempts failed for ${fileName}`)
          return null
        }
        
        continue // Try again
      }

      console.log('✅ SUPABASE: Upload successful:', data)

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dumpstr-media')
        .getPublicUrl(filePath)

      console.log(`🌐 SUPABASE: Public URL generated: ${publicUrl}`)
      return publicUrl
      
    } catch (error) {
      console.error(`💥 SUPABASE: Exception during upload (attempt ${attempt}):`, error)
      lastError = error
      
      if (attempt === maxRetries) {
        console.error(`💥 SUPABASE: All ${maxRetries} attempts failed with exception`)
        return null
      }
    }
  }
  
  return null
}

export async function deleteFromSupabase(filePath: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  
  try {
    const { error } = await supabase.storage
      .from('dumpstr-media')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete failed:', error)
    return false
  }
}