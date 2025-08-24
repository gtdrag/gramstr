import { createClient } from '@supabase/supabase-js'

// Create a Supabase client for storage operations
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
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
  const supabase = getSupabaseClient()
  
  // Create a unique path for the file
  const filePath = `${userId}/${Date.now()}_${fileName}`
  
  try {
    const { data, error } = await supabase.storage
      .from('dumpstr-media')
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('dumpstr-media')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Upload failed:', error)
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