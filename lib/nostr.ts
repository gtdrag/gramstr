import { 
  generateSecretKey, 
  getPublicKey, 
  finalizeEvent, 
  UnsignedEvent,
  SimplePool,
  nip19
} from 'nostr-tools'
import { createClient } from '@supabase/supabase-js'

// Popular NOSTR relays
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.nostr.info',
  'wss://nostr.wine'
]

export class NostrService {
  private secretKey: Uint8Array
  private publicKey: string
  private pool: SimplePool
  private relays: string[]

  constructor(secretKey?: Uint8Array) {
    this.pool = new SimplePool()
    this.relays = DEFAULT_RELAYS
    
    if (secretKey) {
      this.secretKey = secretKey
    } else {
      // Generate new key pair if none provided
      this.secretKey = generateSecretKey()
    }
    
    this.publicKey = getPublicKey(this.secretKey)
  }

  // Get the user's NOSTR public key (npub format)
  getPublicKey(): string {
    return nip19.npubEncode(this.publicKey)
  }

  // Get the user's NOSTR private key (nsec format) - handle with care!
  getPrivateKey(): string {
    return nip19.nsecEncode(this.secretKey)
  }

  // Connect to relays
  async connect(): Promise<void> {
    try {
      console.log('📡 Connecting to NOSTR relays...')
      // Connection is handled automatically by SimplePool
      console.log('✅ Connected to NOSTR network')
    } catch (error) {
      console.error('❌ Failed to connect to NOSTR relays:', error)
      throw error
    }
  }

  // Upload file to Supabase Storage
  async uploadFile(file: File): Promise<string> {
    try {
      console.log('📤 Uploading file to Supabase Storage...')
      
      // Initialize Supabase client with service role key for uploads
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables not configured. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `nostr/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload to Supabase Storage (bucket should exist already)
      console.log('⬆️  Uploading file to instascrape-media bucket...')
      const { data, error } = await supabase.storage
        .from('instascrape-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Upload error details:', error)
        
        // If bucket doesn't exist, provide helpful error message
        if (error.message.includes('bucket') || error.message.includes('not found')) {
          throw new Error(`Storage bucket 'instascrape-media' not found. Please create it in your Supabase dashboard under Storage.`)
        }
        
        throw new Error(`Supabase upload failed: ${error.message}`)
      }
      
      // Get public URL
      const { data: publicData } = supabase.storage
        .from('instascrape-media')
        .getPublicUrl(fileName)
      
      console.log('✅ File uploaded to Supabase:', publicData.publicUrl)
      return publicData.publicUrl
      
    } catch (error) {
      console.error('❌ Supabase upload failed:', error)
      throw error
    }
  }

  // Upload video from URL (for our Instagram videos)
  async uploadVideoFromUrl(videoUrl: string, filename: string): Promise<string> {
    try {
      console.log('📤 Downloading and uploading video to nostr.build...')
      
      // Download the video
      const videoResponse = await fetch(videoUrl)
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.status}`)
      }
      
      const videoBlob = await videoResponse.blob()
      const file = new File([videoBlob], filename, { type: videoBlob.type })
      
      // Upload to nostr.build
      return await this.uploadFile(file)
      
    } catch (error) {
      console.error('❌ Video upload from URL failed:', error)
      throw error
    }
  }

  // Create and publish a NOSTR note with media
  async publishNote(content: string, mediaUrl?: string): Promise<string> {
    try {
      console.log('📝 Publishing NOSTR note...')
      
      let noteContent = content
      
      // Add media URL to content if provided
      if (mediaUrl) {
        noteContent += `\n\n${mediaUrl}`
      }
      
      // Create the event
      const unsignedEvent: UnsignedEvent = {
        kind: 1, // Text note
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: noteContent,
        pubkey: this.publicKey,
      }
      
      // Sign the event
      const signedEvent = finalizeEvent(unsignedEvent, this.secretKey)
      
      // Publish to relays
      const promises = this.pool.publish(this.relays, signedEvent)
      const results = await Promise.allSettled(promises)
      
      console.log('📡 Published to relays:', results)
      console.log('✅ NOSTR note published successfully!')
      
      // Return the note ID
      return signedEvent.id
      
    } catch (error) {
      console.error('❌ Failed to publish NOSTR note:', error)
      throw error
    }
  }

  // Publish Instagram video to NOSTR
  async publishInstagramVideo(
    videoUrl: string, 
    filename: string, 
    caption: string,
    originalUrl: string
  ): Promise<string> {
    try {
      console.log('🎬 Publishing Instagram video to NOSTR...')
      
      // Upload video to Supabase Storage for public access
      const publicVideoUrl = await this.uploadVideoFromUrl(videoUrl, filename)
      
      // Create note content with the actual video
      const noteContent = `📹 ${caption}\n\n🔗 Original: ${originalUrl}\n\n#InstaScrape #Instagram #VideoShare\n\nPosted via InstaScrape 🤖`
      
      // Publish the note WITH the publicly accessible video URL
      const noteId = await this.publishNote(noteContent, publicVideoUrl)
      
      console.log('🎉 Instagram video published to NOSTR with video!')
      return noteId
      
    } catch (error) {
      console.error('❌ Failed to publish Instagram video to NOSTR:', error)
      throw error
    }
  }

  // Disconnect from relays
  disconnect(): void {
    this.pool.close(this.relays)
    console.log('📴 Disconnected from NOSTR relays')
  }
}

// Utility functions for key management
export const createNostrKeys = () => {
  const secretKey = generateSecretKey()
  const publicKey = getPublicKey(secretKey)
  
  return {
    secretKey,
    publicKey,
    npub: nip19.npubEncode(publicKey),
    nsec: nip19.nsecEncode(secretKey)
  }
}

export const nostrKeysFromNsec = (nsec: string) => {
  const { type, data } = nip19.decode(nsec)
  if (type !== 'nsec') {
    throw new Error('Invalid nsec key')
  }
  
  const secretKey = data as Uint8Array
  const publicKey = getPublicKey(secretKey)
  
  return {
    secretKey,
    publicKey,
    npub: nip19.npubEncode(publicKey),
    nsec
  }
}