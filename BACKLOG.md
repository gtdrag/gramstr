# Project Backlog

## 🐛 Known Bugs

### Low Priority
- [ ] **Clerk API errors in Electron console**
  - Issue: Clerk authentication service tries to make API calls in Electron
  - Impact: Console errors only, no functional impact
  - Fix: Conditionally disable ClerkProvider in Electron environment
  - Priority: Low (cosmetic)

## ✨ Completed Features (v1.0)
- [x] Instagram content download (single URL)
- [x] Bulk URL download (multiple URLs at once)
- [x] Nostr posting from gallery
- [x] Electron desktop app
- [x] Encrypted key storage (AES-256)
- [x] Unified header with navigation
- [x] User tracking by Nostr pubkey
- [x] Instagram Stories support (with auth)

## 🚀 Feature Backlog

### High Priority (v1.1)
- [ ] **Search & Filter Gallery**
  - Search by caption text
  - Filter by date range
  - Filter by type (image/video/carousel)
  - Time: ~3 hours

- [ ] **Bulk Select & Post to Nostr**
  - Checkbox selection in gallery
  - Post multiple with time delays
  - Time: ~4 hours

### Medium Priority (v1.2)
- [ ] **Custom Relay Configuration**
  - Add/remove relay URLs
  - Save preferred relay list
  - Test relay connections
  - Time: ~2 hours

- [ ] **Edit Before Posting**
  - Edit caption before Nostr post
  - Add/remove hashtags
  - Preview before sending
  - Time: ~3 hours

- [ ] **Profile Download**
  - Download all posts from a profile
  - Download recent X posts
  - Download date range
  - Time: ~6 hours

### Low Priority (v2.0)
- [ ] **Auto-Repost Mode**
  - Watch Instagram for new posts
  - Auto-download and queue
  - Optional auto-post to Nostr
  - Time: ~1 day

- [ ] **Scheduled Posting**
  - Queue posts for specific times
  - Timezone support
  - Recurring schedules
  - Time: ~1 day

- [ ] **Analytics Dashboard**
  - Post performance from relays
  - Best posting times
  - Engagement trends
  - Time: ~2 days

- [ ] **Multi-Account Support**
  - Multiple Instagram sources
  - Multiple Nostr identities
  - Account switching
  - Time: ~1 week

## 🔧 Technical Debt

- [ ] **Error Handling Improvements**
  - Better error messages for failed downloads
  - Retry logic for network failures
  - Graceful degradation

- [ ] **Performance Optimizations**
  - Lazy loading for large galleries
  - Image thumbnail optimization
  - Virtual scrolling for 100+ items

- [ ] **Testing**
  - Unit tests for key components
  - E2E tests for critical flows
  - Cross-platform testing

## 📝 Documentation Needs

- [ ] User guide for Electron app
- [ ] API documentation
- [ ] Deployment guide
- [ ] Contributing guidelines

## 💡 Ideas / Considerations

- Cross-platform to other social media (TikTok, X/Twitter)
- AI-powered caption suggestions
- Batch editing tools
- Export/import gallery data
- Mobile app version
- Browser extension version

## 📊 Current Sprint (Ready for v1.0)

### Must Have Before Release
- [x] Bulk download
- [ ] Basic search (quick win)
- [ ] Fix any critical bugs from testing

### Nice to Have
- [ ] Custom relays
- [ ] Edit before post

## Release Notes Draft

### v1.0.0 (Ready to Ship)
- ✅ Download Instagram content (posts, reels, stories)
- ✅ Bulk download multiple URLs at once
- ✅ Post to Nostr with one click
- ✅ Electron desktop app
- ✅ Secure encrypted key storage
- ✅ Beautiful dark theme UI

---

Last Updated: 2024-12-27
Status: **Ready for v1.0 release with bulk download**