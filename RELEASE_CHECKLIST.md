# Release Checklist for v1.0.0

## 🔍 Pre-Release Testing

### Functionality Testing
- [ ] **Download Features**
  - [ ] Single URL download works
  - [ ] Bulk URL download works
  - [ ] Progress indicators display correctly
  - [ ] Failed downloads show error messages
  - [ ] Instagram auth works (cookies)
  - [ ] Stories download works (with auth)

- [ ] **Gallery Features**
  - [ ] Content displays correctly
  - [ ] Video playback works
  - [ ] Carousel navigation works
  - [ ] Delete function works
  - [ ] Content loads for correct user (by pubkey)

- [ ] **Nostr Features**
  - [ ] Key import/encryption works
  - [ ] Posting to Nostr succeeds
  - [ ] Posted content appears on Nostr clients
  - [ ] Public key displayed correctly

### Platform Testing
- [ ] **Web Browser**
  - [ ] Chrome/Brave
  - [ ] Firefox
  - [ ] Safari
  - [ ] Alby extension connection works

- [ ] **Electron Desktop**
  - [ ] macOS
  - [ ] Windows
  - [ ] Linux (if applicable)
  - [ ] Key management works
  - [ ] No critical console errors

## 🔧 Technical Preparation

### Code Quality
- [ ] Remove all `console.log` statements (or use proper logging)
- [ ] Check for any hardcoded values/URLs
- [ ] Ensure all environment variables are documented
- [ ] Remove any test data or dummy content
- [ ] Check for any TODO comments that need addressing

### Security
- [ ] Verify key encryption is working
- [ ] Ensure no secrets in code
- [ ] Check CORS settings for production
- [ ] Verify API rate limiting (if needed)

### Performance
- [ ] Test with 100+ items in gallery
- [ ] Check load times
- [ ] Verify no memory leaks in Electron

## 📦 Build & Package

### Web Deployment (Vercel)
- [ ] Update environment variables in Vercel dashboard
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  DATABASE_URL
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY (if using payments)
  ```
- [ ] Test build locally: `npm run build`
- [ ] Deploy to staging/preview
- [ ] Test all features on staging
- [ ] Deploy to production

### Electron App
- [ ] Update version in `package.json`
- [ ] Update `electron-builder.yml` with:
  - [ ] App name
  - [ ] App ID
  - [ ] Copyright info
  - [ ] Code signing certificates (if available)
- [ ] Build for each platform:
  ```bash
  npm run electron:build:mac
  npm run electron:build:win
  npm run electron:build:linux
  ```
- [ ] Test each installer
- [ ] Create GitHub Release with binaries
- [ ] Set up auto-update server (optional)

## 📝 Documentation

### User Documentation
- [ ] Create README with:
  - [ ] Installation instructions
  - [ ] Feature overview
  - [ ] Quick start guide
- [ ] Create CHANGELOG.md
- [ ] Update website/landing page (if exists)

### Technical Documentation
- [ ] Document API endpoints
- [ ] Document environment setup
- [ ] Create example .env file
- [ ] Document deployment process

## 🚀 Release Steps

### 1. Final Testing (Day Before)
- [ ] Full functionality test
- [ ] Fresh install test (clean machine/browser)
- [ ] Check all external services (Instagram API, Nostr relays)

### 2. Version Bump
- [ ] Update version in `package.json` to `1.0.0`
- [ ] Commit version bump
- [ ] Create git tag: `git tag v1.0.0`

### 3. Deploy Web
- [ ] Merge to main branch
- [ ] Verify Vercel deployment
- [ ] Test production URL
- [ ] Check SSL certificate

### 4. Build & Release Desktop
- [ ] Build all platform binaries
- [ ] Create GitHub release
- [ ] Upload binaries to GitHub
- [ ] Update download links on website

### 5. Announcement
- [ ] Post on Nostr about the release
- [ ] Share in relevant communities
- [ ] Update social media (if applicable)

## 🔥 Rollback Plan

### If Issues Arise
1. **Web**: Revert Vercel deployment to previous version
2. **Desktop**: Remove release from GitHub, point users to previous version
3. **Database**: Have backup ready before release
4. **Communication**: Have template ready for issue notification

## ✅ Post-Release

- [ ] Monitor error logs for first 24 hours
- [ ] Check user feedback channels
- [ ] Document any issues for v1.0.1
- [ ] Celebrate! 🎉

## 🎯 Success Metrics

### Day 1
- [ ] No critical bugs reported
- [ ] At least 10 successful downloads
- [ ] At least 5 Nostr posts made

### Week 1
- [ ] 100+ downloads
- [ ] User feedback collected
- [ ] Next version priorities identified

---

## Quick Commands Reference

```bash
# Development
npm run dev              # Start Next.js dev server
npm run electron:dev     # Start Electron dev

# Testing
npm run build           # Test production build
npm run start           # Test production server

# Building Electron
npm run electron:build:mac     # Build for macOS
npm run electron:build:win     # Build for Windows  
npm run electron:build:linux   # Build for Linux

# Deployment
git tag v1.0.0                 # Tag release
git push origin main --tags    # Push with tags
```

---

**Target Release Date**: _____________
**Release Manager**: _____________
**Testing Lead**: _____________

## Notes
- 
- 
- 

---

Last Updated: 2024-12-27
Status: **Ready for release testing**