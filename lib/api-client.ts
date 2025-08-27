/**
 * API client that automatically includes NOSTR pubkey in headers
 */

import { nostrProvider } from "./nostr-provider"
import { getElectronNostr } from "./nostr-electron"

interface RequestOptions extends RequestInit {
  includeNostrPubkey?: boolean
}

/**
 * Enhanced fetch that includes NOSTR pubkey if connected
 */
export async function apiFetch(
  url: string, 
  options: RequestOptions = {}
): Promise<Response> {
  const { includeNostrPubkey = true, ...fetchOptions } = options
  
  // Get headers or create new ones
  const headers = new Headers(fetchOptions.headers)
  
  // Add NOSTR pubkey if available and requested
  if (includeNostrPubkey) {
    // Try Electron key first
    const electronNostr = getElectronNostr()
    let pubkey = electronNostr?.getPublicKey()
    
    // Fall back to Alby/browser extension
    if (!pubkey) {
      pubkey = nostrProvider.getPublicKey()
    }
    
    if (pubkey) {
      // The pubkey might be in hex format from Electron, or npub from Alby
      // The server expects hex format, so we need to ensure it's hex
      headers.set('x-nostr-pubkey', pubkey)
    }
  }
  
  // Perform the fetch with enhanced headers
  return fetch(url, {
    ...fetchOptions,
    headers
  })
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (url: string, options?: RequestOptions) => 
    apiFetch(url, { ...options, method: 'GET' }),
    
  post: (url: string, body?: any, options?: RequestOptions) => 
    apiFetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined
    }),
    
  delete: (url: string, body?: any, options?: RequestOptions) => 
    apiFetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined
    }),
    
  put: (url: string, body?: any, options?: RequestOptions) => 
    apiFetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : undefined
    })
}