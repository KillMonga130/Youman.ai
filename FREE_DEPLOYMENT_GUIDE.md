# Free Deployment Guide for Youman.ai

This guide uses **100% free tier services** to deploy your application at zero cost.

## 🆓 Free Services Stack

### Frontend
- **Vercel** - Free hosting with automatic deployments
- **Netlify** - Alternative free option

### Backend
- **Railway** - Free tier: $5 credit/month (enough for small apps)
- **Render** - Free tier with limitations
- **Fly.io** - Free tier available

### Databases
- **Supabase** - Free PostgreSQL (500MB, unlimited API requests)
- **MongoDB Atlas** - Free tier (512MB storage)
- **Upstash** - Free Redis (10K commands/day)

### Storage
- **Cloudflare R2** - Free 10GB storage, no egress fees
- **Supabase Storage** - Free 1GB storage

### LLM (Still need something)
- **AWS Bedrock Haiku** - Very cheap ($0.25/$1.25 per 1M tokens)
- Or use **Hugging Face Inference API** (free tier available)
- Or **Groq** (very fast, very cheap)

## ⚠️ IMPORTANT: URL Configuration

**Before deploying, read `URL_CONFIGURATION_GUIDE.md`!**

URLs are critical:
- Backend CORS must include frontend URLs
- Frontend must have `VITE_API_URL` set
- Custom domain requires DNS configuration

## 🚀 Quick Setup (Recommended: Vercel + Railway + Supabase)

### Step 1: Deploy Frontend to Vercel (FREE)

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   cd packages/frontend
   vercel
   ```
   
   Or use GitHub integration:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repo
   - Set root directory to `packages/frontend`
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Get your Vercel URL**: `https://your-app.vercel.app`

### Step 2: Set Up Supabase (FREE PostgreSQL)

1. Go to [supabase.com](https://supabase.com)
2. Create free account
3. Create new project
4. Get connection string from Settings > Database
5. Run migrations:
   ```bash
   cd packages/backend
   # Update DATABASE_URL in .env
   npx prisma migrate deploy
   ```

### Step 3: Set Up MongoDB Atlas (FREE)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0 - Free tier)
3. Get connection string
4. Whitelist IP: `0.0.0.0/0` (or Railway's IPs)

### Step 4: Set Up Upstash Redis (FREE)

1. Go to [upstash.com](https://upstash.com)
2. Create free account
3. Create Redis database
4. Get REST API URL and token

### Step 5: Set Up Cloudflare R2 (FREE Storage)

1. Go to [cloudflare.com](https://dash.cloudflare.com)
2. Enable R2 (free 10GB)
3. Create bucket
4. Get API credentials

### Step 6: Deploy Backend to Railway (FREE $5/month credit)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your repo
5. Railway auto-detects Node.js
6. Add environment variables:
   ```env
   NODE_ENV=production
   PORT=$PORT
   DATABASE_URL=postgresql://... (from Supabase)
   MONGODB_URI=mongodb://... (from MongoDB Atlas)
   REDIS_URL=redis://... (from Upstash)
   S3_BUCKET=your-r2-bucket
   S3_REGION=auto
   S3_ACCESS_KEY=... (from Cloudflare)
   S3_SECRET_KEY=... (from Cloudflare)
   AWS_REGION=us-east-1
   AWS_BEDROCK_ENABLED=true
   JWT_SECRET=your-secret
   CORS_ORIGINS=https://your-app.vercel.app
   ```
7. Deploy!

### Step 7: Configure URLs ⚠️ CRITICAL

#### 7.1: Update Backend CORS

In Railway/Render environment variables, add:
```env
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

**Important**: Add ALL frontend URLs (Vercel URL + custom domain if using)

#### 7.2: Update Frontend API URL

**Vercel Dashboard** (Recommended):
1. Go to Project → Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://your-backend.railway.app`
3. Redeploy

**Or create `.env.production`**:
```env
VITE_API_URL=https://your-backend.railway.app
```

**See `URL_CONFIGURATION_GUIDE.md` for complete URL setup guide!**

## 🎯 Alternative: Render (100% Free)

### Backend on Render (Free Tier)

1. Go to [render.com](https://render.com)
2. Sign up
3. New > Web Service
4. Connect GitHub repo
5. Settings:
   - Root Directory: `packages/backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. Add environment variables (same as Railway)
7. Deploy!

**Note**: Render free tier spins down after 15min inactivity (takes ~30s to wake up)

## 💰 Cost Breakdown

### Option 1: Vercel + Railway + Supabase
- **Vercel**: FREE (unlimited)
- **Railway**: FREE ($5 credit/month - enough for small apps)
- **Supabase**: FREE (500MB DB, unlimited API)
- **MongoDB Atlas**: FREE (512MB)
- **Upstash**: FREE (10K commands/day)
- **Cloudflare R2**: FREE (10GB storage)
- **AWS Bedrock**: ~$0.25 per 1M tokens (very cheap)

**Total: $0/month** (or ~$1-5 if you exceed free tiers)

### Option 2: Vercel + Render + Supabase
- **Vercel**: FREE
- **Render**: FREE (with cold starts)
- **Supabase**: FREE
- **MongoDB Atlas**: FREE
- **Upstash**: FREE
- **Cloudflare R2**: FREE

**Total: $0/month**

## 🔧 Quick Setup Scripts

### Setup Script for Railway

Create `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Vercel Configuration

Create `vercel.json` in root:
```json
{
  "builds": [
    {
      "src": "packages/frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "packages/frontend/dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "packages/frontend/$1"
    }
  ]
}
```

## 📝 Environment Variables Template

### Backend (.env)
```env
# App
NODE_ENV=production
PORT=3001

# Database (Supabase - FREE)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres

# MongoDB (Atlas - FREE)
MONGODB_URI=mongodb+srv://[USER]:[PASSWORD]@cluster0.xxxxx.mongodb.net/ai_humanizer?retryWrites=true&w=majority

# Redis (Upstash - FREE)
REDIS_URL=https://[ENDPOINT].upstash.io
# Or REST API:
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Storage (Cloudflare R2 - FREE)
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_ENDPOINT=https://[ACCOUNT_ID].r2.cloudflarestorage.com

# AWS Bedrock (still cheap)
AWS_REGION=us-east-1
AWS_BEDROCK_ENABLED=true

# JWT
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGINS=https://your-app.vercel.app
```

## 🚀 Deployment Steps Summary

1. ✅ Deploy frontend to Vercel (5 min)
2. ✅ Set up Supabase database (5 min)
3. ✅ Set up MongoDB Atlas (5 min)
4. ✅ Set up Upstash Redis (2 min)
5. ✅ Set up Cloudflare R2 (5 min)
6. ✅ Deploy backend to Railway/Render (10 min)
7. ✅ Update frontend API URL (2 min)
8. ✅ Test everything (5 min)

**Total time: ~40 minutes**

## 🎯 Recommended Stack (Best Free Option)

- **Frontend**: Vercel (best free hosting)
- **Backend**: Railway (better than Render, $5 free credit)
- **PostgreSQL**: Supabase (best free PostgreSQL)
- **MongoDB**: MongoDB Atlas (industry standard)
- **Redis**: Upstash (best free Redis)
- **Storage**: Cloudflare R2 (no egress fees!)
- **LLM**: AWS Bedrock Haiku (very cheap) or Hugging Face (free tier)

## ⚠️ Free Tier Limitations

### Railway
- $5 free credit/month
- Enough for small-medium apps
- Auto-scales

### Render
- Free tier spins down after 15min
- ~30s cold start
- Good for low-traffic apps

### Supabase
- 500MB database
- Unlimited API requests
- 2GB bandwidth/month

### MongoDB Atlas
- 512MB storage
- Shared cluster (slower)

### Upstash
- 10K commands/day
- Enough for caching

### Cloudflare R2
- 10GB storage
- No egress fees (huge!)

## 🆘 Troubleshooting

### Railway deployment fails
- Check build logs
- Ensure `package.json` has correct start script
- Verify environment variables

### Render cold starts
- Use Railway instead (no cold starts)
- Or upgrade to paid ($7/month)

### Database connection issues
- Check connection strings
- Verify IP whitelist (MongoDB Atlas)
- Check Supabase connection pooling

## 📚 Next Steps

1. Choose your stack (I recommend Vercel + Railway + Supabase)
2. Follow setup steps above
3. Deploy!
4. Monitor usage to stay within free tiers
5. Upgrade only if needed

---

**You can deploy this for FREE!** 🎉

