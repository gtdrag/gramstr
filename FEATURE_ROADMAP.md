# Feature Roadmap - Priority Queue

## 🚀 Phase 1: Quick Wins (Ship v1.0)
*1-2 days each, high impact*

### 1. **Bulk Select & Post** ⚡
- [ ] Checkbox selection in gallery
- [ ] "Post Selected to Nostr" button
- [ ] Progress indicator
- **Value**: Users can migrate entire Instagram history quickly
- **Time**: ~4 hours

### 2. **Search & Filter Gallery** 🔍
- [ ] Search by caption text
- [ ] Filter by date range
- [ ] Filter by content type (image/video/carousel)
- **Value**: Find specific content instantly
- **Time**: ~3 hours

### 3. **Custom Relay Configuration** 🌐
- [ ] Add/remove relay URLs
- [ ] Save preferred relay list
- [ ] Test relay connection
- **Value**: Better reliability, user control
- **Time**: ~2 hours

### 4. **Edit Before Posting** ✏️
- [ ] Quick edit caption before Nostr post
- [ ] Add/remove hashtags
- [ ] Preview before sending
- **Value**: Optimize content for Nostr audience
- **Time**: ~3 hours

## 📈 Phase 2: Growth Features (v1.1)
*3-5 days each*

### 5. **Auto-Repost Mode** 🔄
- [ ] Watch Instagram account for new posts
- [ ] Auto-download and queue
- [ ] Optional auto-post to Nostr
- **Value**: Set and forget Instagram→Nostr bridge
- **Time**: ~1 day

### 6. **Scheduled Posting** ⏰
- [ ] Queue posts for specific times
- [ ] Timezone support
- [ ] Recurring schedules
- **Value**: Consistent posting, better engagement
- **Time**: ~1 day

### 7. **Analytics Dashboard** 📊
- [ ] Post performance (from Nostr relays)
- [ ] Best posting times
- [ ] Engagement trends
- **Value**: Data-driven content strategy
- **Time**: ~2 days

## 🎯 Phase 3: Power Features (v2.0)
*1-2 weeks each*

### 8. **Multi-Account Support** 👥
- [ ] Multiple Instagram sources
- [ ] Multiple Nostr identities
- [ ] Account switching UI
- **Value**: Agencies, power users
- **Time**: ~1 week

### 9. **Content Templates** 🎨
- [ ] Save caption templates
- [ ] Hashtag sets
- [ ] Auto-formatting rules
- **Value**: Consistent branding
- **Time**: ~3 days

### 10. **Cross-Platform Expansion** 🌍
- [ ] TikTok support
- [ ] X/Twitter support
- [ ] YouTube Shorts
- **Value**: Complete social media hub
- **Time**: ~2 weeks per platform

## 🏁 MVP Release Checklist (Before v1.0)

### Must Have
- [x] Basic download from Instagram
- [x] Post to Nostr
- [x] Electron app
- [x] Encrypted key storage
- [ ] **Bulk post** (Phase 1.1)
- [ ] **Search gallery** (Phase 1.2)

### Nice to Have
- [ ] Custom relays (Phase 1.3)
- [ ] Edit before post (Phase 1.4)

### Can Wait
- Everything in Phase 2+

## 💭 Quick Implementation Notes

**Bulk Select & Post** - Add checkbox to each card, floating action bar when items selected
```typescript
// State: selectedIds: Set<string>
// UI: Checkbox overlay on hover
// Action: Post all selected sequentially with delay
```

**Search & Filter** - Add search bar above gallery
```typescript
// Filter state in ContentList
// Fuzzy search on caption
// Date picker for range
```

**Custom Relays** - Settings modal
```typescript
// Store in localStorage
// Default relays + custom
// Ping test for health check
```

---

**Recommended Ship Date for v1.0**: Add bulk post + search, then ship! (1-2 days)

**Why this order?**
1. Bulk post = killer feature for migrating existing content
2. Search = essential for managing large libraries  
3. Custom relays = reliability for power users
4. Edit = polish for content creators

Everything else can come in updates!