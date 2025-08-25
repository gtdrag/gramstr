/**
 * API client that automatically includes NOSTR pubkey in headers
 */

import { nostrProvider } from "./nostr-provider"

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
    const pubkey = nostrProvider.getPublicKey()
    if (pubkey) {
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