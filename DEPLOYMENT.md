# 🚀 Dumpstr Deployment Guide

Deploy Dumpstr to production using DigitalOcean App Platform (backend) and Vercel (frontend).

## Prerequisites
- GitHub account with this repo
- [Vercel](https://vercel.com) account
- [DigitalOcean](https://digitalocean.com) account  
- Existing Supabase project with `dumpstr-media` bucket
- Clerk application configured

## 🎯 Step 1: Deploy Backend to DigitalOcean App Platform

### Option A: Using App Spec (Recommended)
1. **Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)**
2. **Click "Create App"**
3. **Choose Source**: GitHub → `gtdrag/instascrape` → `feature/rename-to-dumpstr` branch
4. **App Spec Detection**: DigitalOcean will automatically detect our `.do/app.yaml` configuration
5. **Review Settings**:
   - Name: `dumpstr-backend`
   - Plan: Basic ($5/month)
   - Region: Choose closest to your users
6. **Click "Create Resources"**
7. **Wait for deployment** (~5-8 minutes)
8. **Copy the generated URL** (e.g., `https://dumpstr-backend-xyz.ondigitalocean.app`)

### Option B: Manual Configuration
1. **Create App** → **GitHub** → Select repository and branch
2. **Configure Service**:
   - **Name**: `dumpstr-backend`
   - **Source Directory**: `/` (root)
   - **Build Command**: Auto-detected from Dockerfile
   - **Run Command**: `cd backend && python main.py`
   - **HTTP Port**: 8000
3. **Environment Variables**:
   - `PYTHONUNBUFFERED=1`
   - `PORT=8000`
4. **Plan**: Basic ($5/month)

## 🎨 Step 2: Deploy Frontend to Vercel

### CLI Deploy (Recommended)
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy from project root
vercel

# Follow prompts:
# - Set up and deploy? Y  
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? dumpstr
# - Directory? ./
# - Override settings? N
```

### Web Deploy
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `gtdrag/instascrape` repository
3. Select `feature/rename-to-dumpstr` branch
4. Click "Deploy"

## 🔐 Step 3: Configure Environment Variables in Vercel

1. **Go to Project Settings → Environment Variables**
2. **Add each variable**:

```env
# Your DigitalOcean backend URL
NEXT_PUBLIC_API_URL=https://dumpstr-backend-xyz.ondigitalocean.app

# Clerk (from Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx

# Supabase (from your project)
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# NOSTR
NOSTR_PRIVATE_KEY=nsec1xxxxx

# Stripe (optional)
STRIPE_SECRET_KEY=sk_live_xxxxx
```

## 🔄 Step 4: Redeploy Frontend

After adding environment variables:
```bash
vercel --prod
```

Or in Vercel Dashboard: Deployments → Redeploy latest

## ✅ Step 5: Verify Deployment

### Test Backend
Visit your DigitalOcean URL: `https://dumpstr-backend-xyz.ondigitalocean.app/`

Should see: `{"message": "Dumpstr API is running"}`

### Test Frontend  
Visit your Vercel URL and verify:
- Homepage loads
- Login works
- Dashboard accessible

### Test Full Flow
1. Login to dashboard
2. Try downloading an Instagram post
3. Check gallery displays correctly
4. Test NOSTR posting

## 🐛 Troubleshooting

### Backend Issues
- **Build fails**: Check DigitalOcean build logs
- **App won't start**: Verify `PORT=8000` environment variable
- **Dependencies fail**: DigitalOcean handles Docker builds cleanly

### Frontend Issues  
- **API calls fail**: Verify `NEXT_PUBLIC_API_URL` matches your DigitalOcean URL
- **CORS errors**: Check backend CORS settings include your Vercel domain

### Database Issues
- **Connection fails**: Verify `DATABASE_URL` is correct
- **Migrations needed**: Run `npx drizzle-kit push`

## 💰 Pricing

### DigitalOcean App Platform
- **Basic Plan**: $5/month
- **Professional**: $12/month (auto-scaling)

### Vercel
- **Hobby**: Free (perfect for personal projects)
- **Pro**: $20/month (custom domains, analytics)

### Total Monthly Cost
- **Minimal**: $5/month (DigitalOcean Basic + Vercel Free)
- **Professional**: $32/month (DigitalOcean Pro + Vercel Pro)

## 🚀 Why DigitalOcean App Platform?

- ✅ **Docker support** - Uses our Dockerfile exactly as-is
- ✅ **No dependency issues** - Standard Docker builds
- ✅ **Reliable** - Battle-tested platform
- ✅ **Simple pricing** - Predictable costs
- ✅ **Full feature support** - All our packages work

## 🎉 Success!

Your Dumpstr app is now live!
- **Frontend**: `https://dumpstr.vercel.app`  
- **Backend**: `https://dumpstr-backend-xyz.ondigitalocean.app`

## 📝 Post-Deployment

1. **Update Clerk**: Add production URLs to allowed origins
2. **Custom Domain**: Configure in Vercel if desired
3. **Monitor**: Use DigitalOcean and Vercel dashboards

## 🔄 Updates

To deploy updates:
```bash
git push origin feature/rename-to-dumpstr
```

Both DigitalOcean and Vercel will auto-deploy!