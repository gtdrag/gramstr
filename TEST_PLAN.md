# Gramstr Application Test Plan

## Overview
Comprehensive QA test plan for the Gramstr Instagram-to-Nostr cross-posting application, covering both web and Electron desktop versions.

## Test Environment Setup

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL/Supabase database configured
- [ ] Python 3.8+ with virtual environment
- [ ] Instagram test account
- [ ] Nostr test keys (nsec/npub pair)
- [ ] Test media files (images, videos, carousels)

### Environment Variables Required
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_API_URL (http://localhost:8000)
```

## 1. Authentication & Authorization Tests

### 1.1 Instagram Authentication
- [ ] **Fresh Cookie Upload**
  - Navigate to Instagram auth section
  - Run cookie extraction script in browser console
  - Download cookies.json file
  - Drag and drop file to upload area
  - Verify: Success message appears
  - Verify: Auth status shows "Enabled" with green indicator

- [ ] **Invalid Cookie File**
  - Upload non-Instagram cookie file
  - Verify: Error message about invalid cookies
  - Upload malformed JSON
  - Verify: Graceful error handling

- [ ] **Cookie Expiration**
  - Use app with valid cookies
  - Wait for session expiry (or modify cookie timestamps)
  - Attempt to download content
  - Verify: Clear error about expired session

### 1.2 Nostr Key Management (Electron)
- [ ] **Key Import - nsec Format**
  - Click "Import Private Key"
  - Enter valid nsec1... key
  - Verify: Key accepted and encrypted
  - Verify: Public key (npub) displayed correctly
  - Restart app
  - Verify: Key persists after restart

- [ ] **Key Import - Hex Format**
  - Import 64-character hex private key
  - Verify: Converted to nsec and stored
  - Verify: Can post to Nostr

- [ ] **Invalid Key Handling**
  - Try importing invalid nsec
  - Try importing public key (npub)
  - Try importing malformed hex
  - Verify: Clear error messages for each

- [ ] **Key Security**
  - Import key and check localStorage
  - Verify: Key is encrypted (not plaintext)
  - Clear sessionStorage and reload
  - Verify: Key can be decrypted and used

- [ ] **Key Deletion**
  - Import key successfully
  - Click "Remove Key"
  - Confirm deletion
  - Verify: Key removed from storage
  - Verify: Cannot post to Nostr

### 1.3 Nostr Connection (Web/Alby)
- [ ] **Alby Extension Connection**
  - Click "Connect Alby"
  - Approve connection in Alby
  - Verify: Connected status shown
  - Verify: npub displayed

## 2. Content Download Tests

### 2.1 Instagram Post Types
- [ ] **Single Image Post**
  - URL: `https://instagram.com/p/[POST_ID]`
  - Download and verify image saved
  - Check metadata (caption, likes, date)

- [ ] **Single Video Post**
  - URL: `https://instagram.com/reel/[REEL_ID]`
  - Verify: Video downloaded with thumbnail
  - Verify: Video playback works
  - Verify: "VIDEO" label shown

- [ ] **Carousel Post (Multiple Images)**
  - URL: `https://instagram.com/p/[CAROUSEL_ID]`
  - Verify: All images downloaded
  - Verify: Carousel navigation works
  - Verify: Image counter shows correctly

- [ ] **Stories (Requires Auth)**
  - URL: `https://instagram.com/stories/[USERNAME]/[STORY_ID]`
  - Without auth: Error message
  - With auth: Story downloads successfully

- [ ] **Private Account Content**
  - Test with private account post
  - Without auth: Access denied error
  - With auth: Content downloads

### 2.2 Download Error Handling
- [ record="Invalid URLs**
  - Malformed Instagram URL
  - Non-Instagram URL
  - Empty input
  - Verify: Appropriate error messages

- [ ] **Network Issues**
  - Disconnect internet mid-download
  - Verify: Timeout error
  - Verify: Partial download cleaned up

- [ ] **Rate Limiting**
  - Download many posts rapidly
  - Verify: Rate limit warnings
  - Verify: Graceful handling

## 3. Content Library Management

### 3.1 Gallery Display
- [ ] **Grid Layout**
  - Verify: 4-column grid on desktop
  - Verify: 2-column grid on tablet
  - Verify: 1-column grid on mobile
  - Verify: Images maintain aspect ratio

- [ ] **Media Preview**
  - Click image to view full size
  - Click video to play
  - Verify: Mute/unmute controls work
  - Verify: Play button visible on videos

- [ ] **Content Information**
  - Verify: Caption displayed (truncated)
  - Verify: Engagement stats (likes, views)
  - Verify: Download date shown
  - Verify: Original URL link works

### 3.2 Content Actions
- [ ] **Delete Content**
  - Click delete button
  - Confirm deletion dialog
  - Verify: Content removed from gallery
  - Verify: Files deleted from storage

- [ ] **Bulk Operations**
  - Select multiple items (if implemented)
  - Delete multiple items
  - Post multiple to Nostr

## 4. Nostr Posting Tests

### 4.1 Basic Posting
- [ ] **Single Image to Nostr**
  - Click "Post to NOSTR" on image
  - Verify: Loading state during upload
  - Verify: Success message with note ID
  - Check Nostr client: Post visible

- [ ] **Video to Nostr**
  - Post video content
  - Verify: Video uploaded to storage
  - Verify: Public URL in Nostr note
  - Verify: Video plays in Nostr clients

- [ ] **Carousel to Nostr**
  - Post carousel content
  - Verify: All images included
  - Verify: URLs properly formatted

### 4.2 Posting Error Handling
- [ ] **No Nostr Key**
  - Attempt post without key configured
  - Verify: Clear error message
  - Verify: Prompt to add key

- [ ] **Network Failures**
  - Simulate relay connection failure
  - Verify: Retry mechanism
  - Verify: Error reported to user

- [ ] **Large File Handling**
  - Post very large video (>100MB)
  - Verify: Progress indication
  - Verify: Timeout handling

## 5. Electron App Specific Tests

### 5.1 Installation & Updates
- [ ] **Fresh Installation**
  - Download installer from website
  - Run installation on Windows
  - Run installation on macOS
  - Run installation on Linux
  - Verify: App launches successfully

- [ ] **Auto-updater**
  - Check for updates mechanism
  - Download and apply update
  - Verify: Settings preserved

### 5.2 Platform Integration
- [ ] **File System Access**
  - Save downloads to custom directory
  - Verify: Files accessible outside app

- [ ] **System Tray (if implemented)**
  - Minimize to tray
  - Restore from tray
  - Quit from tray menu

- [ ] **Deep Linking**
  - Open Instagram URLs from browser
  - Verify: App launches with URL

### 5.3 Performance
- [ ] **Memory Usage**
  - Monitor RAM with many images loaded
  - Verify: No memory leaks
  - Verify: Efficient garbage collection

- [ ] **CPU Usage**
  - During idle
  - During download
  - During Nostr posting
  - Verify: Reasonable CPU usage

## 6. Backend Services Tests

### 6.1 Python Backend
- [ ] **Service Health**
  - GET http://localhost:8000/health
  - Verify: Service running

- [ ] **Download Endpoint**
  - POST http://localhost:8000/download
  - Test with various URLs
  - Verify: Proper responses

- [ ] **Media Serving**
  - Access downloaded files
  - Verify: Correct CORS headers

### 6.2 Database Operations
- [ ] **Data Persistence**
  - Download content
  - Restart all services
  - Verify: Content still in library

- [ ] **User Isolation**
  - Test with multiple users
  - Verify: Content properly segregated

## 7. Security Tests

### 7.1 Key Storage Security
- [ ] **Encryption Verification**
  - Check localStorage for keys
  - Verify: No plaintext secrets
  - Verify: Encryption working

- [ ] **Session Security**
  - Close app with key imported
  - Verify: Session cleared
  - Reopen app
  - Verify: Key still encrypted

### 7.2 API Security
- [ ] **Authentication Bypass**
  - Try accessing API without auth
  - Verify: Proper rejection

- [ ] **CORS Policy**
  - Test from different origins
  - Verify: CORS properly configured

## 8. Edge Cases & Stress Tests

### 8.1 Boundary Conditions
- [ ] **Empty States**
  - Fresh install with no content
  - Verify: Helpful empty states

- [ ] **Maximum Limits**
  - Download 100+ posts
  - Verify: Pagination/scrolling works
  - Verify: Performance acceptable

### 8.2 Concurrent Operations
- [ ] **Multiple Downloads**
  - Start 5 downloads simultaneously
  - Verify: All complete successfully

- [ ] **Download While Posting**
  - Download new content while posting
  - Verify: No conflicts

## 9. UI/UX Tests

### 9.1 Responsive Design
- [ ] **Desktop (1920x1080)**
  - All features accessible
  - Layout proper

- [ ] **Tablet (768x1024)**
  - Touch targets appropriate
  - Layout adjusts properly

- [ ] **Mobile (375x812)**
  - Usable on small screen
  - Key features accessible

### 9.2 Dark Mode
- [ ] **Consistency**
  - All components styled
  - Readable contrast ratios
  - No unstyled elements

### 9.3 Accessibility
- [ ] **Keyboard Navigation**
  - Tab through interface
  - Enter to activate buttons
  - Escape to close modals

- [ ] **Screen Reader**
  - ARIA labels present
  - Semantic HTML used

## 10. Production Deployment Tests

### 10.1 Vercel Deployment
- [ ] **Build Process**
  - Verify: Build succeeds
  - Verify: No build warnings

- [ ] **Environment Variables**
  - All env vars configured
  - Verify: Services connect

### 10.2 Performance Metrics
- [ ] **Lighthouse Scores**
  - Performance > 70
  - Accessibility > 90
  - Best Practices > 90

- [ ] **Core Web Vitals**
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1

## Test Execution Log

| Date | Tester | Test Section | Pass/Fail | Notes |
|------|--------|--------------|-----------|-------|
| | | | | |

## Issues Found

### Critical Issues
1. [Issue description, steps to reproduce, expected vs actual]

### Major Issues
1. [Issue description, steps to reproduce, expected vs actual]

### Minor Issues
1. [Issue description, steps to reproduce, expected vs actual]

## Recommendations
- [Improvement suggestions based on testing]

## Sign-off
- [ ] All critical paths tested
- [ ] No critical issues remaining
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Ready for production

---
Test Plan Version: 1.0
Last Updated: [Date]