#!/usr/bin/env node
/**
 * Test URL privacy functions
 */

import {
  cleanUrl,
  breakUrlForNoPreview,
  wrapUrlAsCode,
  wrapUrlInBrackets,
  processUrlForNostr,
  hasTrackingParams,
  extractInstagramUsername,
  createPrivateReference
} from '../lib/url-privacy';

console.log('🔒 Testing URL Privacy Functions\n');
console.log('='.repeat(50));

// Test URLs with various tracking parameters
const testUrls = [
  'https://www.instagram.com/p/ABC123/?igshid=xyz123&utm_source=ig_web_copy_link',
  'https://www.instagram.com/stories/johndoe/1234567890/?s=1&story_media_id=abc_xyz',
  'https://www.instagram.com/reel/XYZ/?utm_medium=share_sheet&fbclid=1234567890',
  'https://www.instagram.com/username/?utm_source=qr',
  'https://www.instagram.com/p/CoolPost/?igsh=MzRlODBiNWFlZA==',
];

// Test 1: Cleaning tracking parameters
console.log('\n📧 Test 1: Cleaning Tracking Parameters');
console.log('-'.repeat(40));

testUrls.forEach(url => {
  console.log(`\nOriginal: ${url}`);
  console.log(`Has tracking: ${hasTrackingParams(url)}`);
  console.log(`Cleaned:  ${cleanUrl(url)}`);
});

// Test 2: Preventing link previews
console.log('\n\n🚫 Test 2: Preventing Link Previews');
console.log('-'.repeat(40));

const sampleUrl = 'https://www.instagram.com/p/ABC123/';
console.log(`\nOriginal URL: ${sampleUrl}`);
console.log(`Zero-width:   ${breakUrlForNoPreview(sampleUrl)}`);
console.log(`As code:      ${wrapUrlAsCode(sampleUrl)}`);
console.log(`In brackets:  ${wrapUrlInBrackets(sampleUrl)}`);

// Test 3: Extract usernames
console.log('\n\n👤 Test 3: Extracting Usernames');
console.log('-'.repeat(40));

const usernameTests = [
  'https://www.instagram.com/johndoe/',
  'https://www.instagram.com/stories/jane_smith/1234567890/',
  'https://www.instagram.com/p/ABC123/',
  'https://www.instagram.com/reel/XYZ/',
];

usernameTests.forEach(url => {
  const username = extractInstagramUsername(url);
  console.log(`\nURL: ${url}`);
  console.log(`Username: ${username || 'Not found'}`);
});

// Test 4: Create private references
console.log('\n\n🔐 Test 4: Creating Private References');
console.log('-'.repeat(40));

testUrls.forEach(url => {
  const reference = createPrivateReference(url);
  console.log(`\nURL: ${url}`);
  console.log(`Reference: ${reference}`);
});

// Test 5: Full processing for Nostr
console.log('\n\n⚡ Test 5: Full Processing for Nostr');
console.log('-'.repeat(40));

const dirtyUrl = 'https://www.instagram.com/p/ABC123/?igshid=xyz&utm_source=ig_web_copy_link';

console.log(`\nOriginal URL: ${dirtyUrl}`);
console.log('\nProcessing options:');

const options = [
  { stripTracking: true, preventPreview: true, previewMethod: 'zerowidth' as const },
  { stripTracking: true, preventPreview: true, previewMethod: 'code' as const },
  { stripTracking: true, preventPreview: true, previewMethod: 'brackets' as const },
  { stripTracking: true, preventPreview: false, previewMethod: 'none' as const },
];

options.forEach((opt, i) => {
  const processed = processUrlForNostr(dirtyUrl, opt);
  console.log(`\nOption ${i + 1}: ${JSON.stringify(opt)}`);
  console.log(`Result: ${processed}`);
});

// Test 6: Verify no tracking remains
console.log('\n\n✅ Test 6: Verification');
console.log('-'.repeat(40));

const processedUrls = testUrls.map(url => cleanUrl(url));
processedUrls.forEach(url => {
  const stillHasTracking = hasTrackingParams(url);
  console.log(`\nCleaned URL: ${url}`);
  console.log(`Still has tracking: ${stillHasTracking ? '❌ YES' : '✅ NO'}`);
});

console.log('\n' + '='.repeat(50));
console.log('✅ URL Privacy Tests Complete!\n');