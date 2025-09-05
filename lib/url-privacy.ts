/**
 * URL Privacy Utilities
 * Strips tracking parameters and prevents link previews
 */

/**
 * Common tracking parameters used by Instagram and other social media
 */
const TRACKING_PARAMS = [
  // Instagram specific
  'igshid',
  'igsh',
  'utm_source',
  'utm_medium', 
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_cid',
  'utm_reader',
  'utm_referrer',
  'utm_name',
  'utm_social',
  'utm_social_type',
  'utm_brand',
  
  // Facebook/Meta tracking
  'fbclid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'fb_ref',
  'fbid',
  
  // Google Analytics
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'ga_source',
  'ga_medium',
  'ga_term',
  'ga_content',
  'ga_campaign',
  'ga_place',
  
  // Other common tracking
  '_ga',
  'mc_cid',
  'mc_eid',
  'mkwid',
  'pcrid',
  'ef_id',
  's_kwcid',
  'msclkid',
  
  // General referral/tracking
  'ref',
  'referer',
  'referrer',
  'source',
  'share_id',
  'si',
  
  // Instagram story specific
  'story_media_id',
  'h1'
];

/**
 * Clean tracking parameters from a URL
 */
export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove tracking parameters
    TRACKING_PARAMS.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Clean up Instagram specific patterns
    if (urlObj.hostname.includes('instagram.com')) {
      // Remove trailing query string if empty
      if (urlObj.search === '?') {
        urlObj.search = '';
      }
      
      // Remove trailing slashes for consistency
      urlObj.pathname = urlObj.pathname.replace(/\/+$/, '');
      
      // Remove 's=' parameter (share tracking)
      urlObj.searchParams.delete('s');
      
      // Clean up story URLs
      if (urlObj.pathname.includes('/stories/')) {
        // Stories often have tracking in the path itself
        // Keep only the essential parts: /stories/username/storyid
        const pathParts = urlObj.pathname.split('/');
        if (pathParts.length > 4) {
          urlObj.pathname = pathParts.slice(0, 4).join('/');
        }
      }
    }
    
    return urlObj.toString();
  } catch (error) {
    console.error('Failed to clean URL:', error);
    return url; // Return original if parsing fails
  }
}

/**
 * Prevent link preview in Nostr by using zero-width spaces
 * This breaks up the URL so clients don't generate previews
 */
export function breakUrlForNoPreview(url: string): string {
  // Insert zero-width space after https:// to break preview detection
  // Most clients look for complete URLs starting with http:// or https://
  return url.replace(/https?:\/\//g, '$&\u200b');
}

/**
 * Alternative: Wrap URL in backticks to show as code (no preview)
 */
export function wrapUrlAsCode(url: string): string {
  return `\`${url}\``;
}

/**
 * Alternative: Use angle brackets (some clients don't preview these)
 */
export function wrapUrlInBrackets(url: string): string {
  return `<${url}>`;
}

/**
 * Process URL for privacy-preserving Nostr posting
 * @param url - Original URL (possibly with tracking)
 * @param options - Processing options
 * @returns Processed URL ready for Nostr
 */
export function processUrlForNostr(
  url: string,
  options: {
    stripTracking?: boolean;
    preventPreview?: boolean;
    previewMethod?: 'zerowidth' | 'code' | 'brackets' | 'none';
  } = {}
): string {
  const {
    stripTracking = true,
    preventPreview = true,
    previewMethod = 'zerowidth'
  } = options;
  
  let processedUrl = url;
  
  // Step 1: Clean tracking parameters
  if (stripTracking) {
    processedUrl = cleanUrl(processedUrl);
  }
  
  // Step 2: Prevent preview if requested
  if (preventPreview && previewMethod !== 'none') {
    switch (previewMethod) {
      case 'zerowidth':
        processedUrl = breakUrlForNoPreview(processedUrl);
        break;
      case 'code':
        processedUrl = wrapUrlAsCode(processedUrl);
        break;
      case 'brackets':
        processedUrl = wrapUrlInBrackets(processedUrl);
        break;
    }
  }
  
  return processedUrl;
}

/**
 * Check if a URL contains tracking parameters
 */
export function hasTrackingParams(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    for (const param of TRACKING_PARAMS) {
      if (urlObj.searchParams.has(param)) {
        return true;
      }
    }
    
    // Check for Instagram's 's' parameter
    if (urlObj.hostname.includes('instagram.com') && urlObj.searchParams.has('s')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract username from Instagram URL
 */
export function extractInstagramUsername(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('instagram.com')) {
      return null;
    }
    
    // Match patterns like /username/ or /stories/username/
    const match = urlObj.pathname.match(/^\/(?:stories\/)?([A-Za-z0-9_.]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Create a privacy-friendly reference to Instagram content
 */
export function createPrivateReference(url: string): string {
  const username = extractInstagramUsername(url);
  
  if (username) {
    // Reference the user without a direct link
    if (url.includes('/stories/')) {
      return `@${username}'s story`;
    } else if (url.includes('/p/') || url.includes('/reel/')) {
      return `@${username}'s post`;
    } else {
      return `@${username}`;
    }
  }
  
  return 'Instagram content';
}

/**
 * Test function to demonstrate URL cleaning
 */
export function testUrlCleaning() {
  const testUrls = [
    'https://www.instagram.com/p/ABC123/?igshid=xyz&utm_source=ig_web',
    'https://www.instagram.com/stories/username/1234567890/?s=1&story_media_id=abc',
    'https://www.instagram.com/reel/XYZ/?utm_medium=share_sheet'
  ];
  
  console.log('URL Cleaning Tests:');
  testUrls.forEach(url => {
    console.log('\nOriginal:', url);
    console.log('Cleaned:', cleanUrl(url));
    console.log('No Preview:', breakUrlForNoPreview(cleanUrl(url)));
    console.log('As Code:', wrapUrlAsCode(cleanUrl(url)));
    console.log('Reference:', createPrivateReference(url));
  });
}