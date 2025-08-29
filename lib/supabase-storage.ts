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
  console.log(`🚀 SUPABASE: Starting upload for ${fileName}`)
  console.log(`📊 SUPABASE: File size: ${file instanceof Blob ? file.size : file.length}, MIME: ${mimeType}`)
  
  try {
    const supabase = getSupabaseClient()
    console.log('✅ SUPABASE: Client created successfully')
    
    // Create a unique path for the file
    const filePath = `${userId}/${Date.now()}_${fileName}`
    console.log(`📁 SUPABASE: Upload path: ${filePath}`)
    
    const { data, error } = await supabase.storage
      .from('dumpstr-media')
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: false
      })

    if (error) {
      console.error('❌ SUPABASE: Upload error:', error)
      console.error('❌ SUPABASE: Error details:', JSON.stringify(error, null, 2))
      return null
    }

    console.log('✅ SUPABASE: Upload successful:', data)

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('dumpstr-media')
      .getPublicUrl(filePath)

    console.log(`🌐 SUPABASE: Public URL generated: ${publicUrl}`)
    return publicUrl
  } catch (error) {
    console.error('💥 SUPABASE: Exception during upload:', error)
    return null
  }
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