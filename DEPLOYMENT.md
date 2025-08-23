# 🚀 Dumpstr Deployment Guide

Deploy Dumpstr to production in 15 minutes!

## Prerequisites
- GitHub account with this repo
- [Vercel](https://vercel.com) account
- [Railway](https://railway.app) account  
- Existing Supabase project with `dumpstr-media` bucket
- Clerk application configured

## 🎯 Step 1: Deploy Backend to Railway

1. **Go to [Railway.app](https://railway.app/new)**

2. **Deploy from GitHub repo:**
   - Click "Deploy from GitHub repo"
   - Select `gtdrag/instascrape` (or your fork)
   - Choose branch: `feature/rename-to-dumpstr`

3. **Configure service:**
   - Railway auto-detects Python from `railway.json`
   - Service will be named `dumpstr-backend`
   - Wait for build to complete (~3 minutes)

4. **Get your backend URL:**
   - Click on the service
   - Go to Settings → Domains
   - Click "Generate Domain"
   - Copy URL (e.g., `dumpstr-backend.up.railway.app`)

## 🎨 Step 2: Deploy Frontend to Vercel

### Option A: CLI Deploy (Recommended)
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy (from project root)
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? dumpstr
# - Directory? ./
# - Override settings? N
```

### Option B: Web Deploy
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `gtdrag/instascrape` repository
3. Select `feature/rename-to-dumpstr` branch
4. Click "Deploy"

## 🔐 Step 3: Configure Environment Variables

### In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable from `.env.production.example`
3. **CRITICAL**: Update `NEXT_PUBLIC_API_URL` with your Railway backend URL

### Required Variables:
```env
# Your Railway backend URL
NEXT_PUBLIC_API_URL=https://dumpstr-backend.up.railway.app

# Clerk (copy from Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx

# Supabase (copy from local .env)
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# NOSTR
NOSTR_PRIVATE_KEY=nsec1xxxxx

# Stripe (optional)
STRIPE_SECRET_KEY=sk_live_xxxxx
```

## 🔄 Step 4: Redeploy with Environment Variables

After adding environment variables:
```bash
vercel --prod
```

Or in Vercel Dashboard:
- Go to Deployments
- Click "Redeploy" on latest deployment

## ✅ Step 5: Verify Deployment

1. **Test Frontend:**
   - Visit your Vercel URL
   - Should see "DUMPSTR" homepage
   - Login should work

2. **Test Backend:**
   - Visit `https://your-railway-url.railway.app/`
   - Should see: `{"message": "Dumpstr API is running"}`

3. **Test Full Flow:**
   - Login to dashboard
   - Try downloading an Instagram post
   - Check gallery displays correctly
   - Test NOSTR posting

## 🐛 Troubleshooting

### Backend not responding:
- Check Railway logs for errors
- Verify PORT=8000 is set
- Check Python dependencies installed

### Frontend API calls failing:
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS settings in backend
- Ensure Railway domain is generated

### Database errors:
- Verify DATABASE_URL is correct
- Run migrations: `npx drizzle-kit push`
- Check Supabase connection pooling

### NOSTR posting fails:
- Verify `dumpstr-media` bucket exists in Supabase
- Check bucket is PUBLIC
- Verify SUPABASE_SERVICE_ROLE_KEY is set

## 🎉 Success!

Your Dumpstr app is now live at:
- Frontend: `https://dumpstr.vercel.app`
- Backend: `https://dumpstr-backend.up.railway.app`

## 📝 Post-Deployment

1. **Update Clerk:**
   - Add production URLs to Clerk allowed origins

2. **Configure Custom Domain (optional):**
   - In Vercel: Settings → Domains
   - Add your domain (e.g., dumpstr.com)

3. **Monitor:**
   - Vercel Analytics for frontend
   - Railway metrics for backend
   - Supabase dashboard for database

## 🔄 Updating

To deploy updates:
```bash
git push origin feature/rename-to-dumpstr
```
Both Vercel and Railway will auto-deploy!