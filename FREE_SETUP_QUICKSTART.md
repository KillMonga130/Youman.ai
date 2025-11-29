# 🆓 Free Deployment Quick Start

**Deploy Youman.ai for FREE in 30 minutes!**

## What You'll Get

- ✅ Frontend hosted on Vercel (FREE)
- ✅ Backend on Railway (FREE $5/month credit)
- ✅ PostgreSQL on Supabase (FREE 500MB)
- ✅ MongoDB on Atlas (FREE 512MB)
- ✅ Redis on Upstash (FREE 10K/day)
- ✅ Storage on Cloudflare R2 (FREE 10GB)

**Total Cost: $0/month** 🎉

## Step-by-Step (30 minutes)

### 1. Frontend → Vercel (5 min)

```bash
# Option A: CLI
npm i -g vercel
cd packages/frontend
vercel

# Option B: GitHub (easier)
# 1. Go to vercel.com
# 2. Import GitHub repo
# 3. Root: packages/frontend
# 4. Build: npm run build
# 5. Output: dist
# 6. Deploy!
```

### 2. Database → Supabase (5 min)

1. Go to [supabase.com](https://supabase.com) → Sign up
2. New Project → Create
3. Settings → Database → Copy connection string
4. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
   ```
5. Run migrations:
   ```bash
   cd packages/backend
   npx prisma migrate deploy
   ```

### 3. MongoDB → Atlas (5 min)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Sign up
2. Create free cluster (M0)
3. Database Access → Create user
4. Network Access → Add IP: `0.0.0.0/0`
5. Connect → Get connection string
6. Update `.env`:
   ```env
   MONGODB_URI=mongodb+srv://[USER]:[PASSWORD]@cluster0.xxxxx.mongodb.net/ai_humanizer
   ```

### 4. Redis → Upstash (2 min)

1. Go to [upstash.com](https://upstash.com) → Sign up
2. Create Redis database
3. Copy REST URL and token
4. Update `.env`:
   ```env
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

### 5. Storage → Cloudflare R2 (5 min)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Sign up
2. R2 → Create bucket
3. Manage R2 API Tokens → Create API token
4. Update `.env`:
   ```env
   S3_BUCKET=your-bucket
   S3_REGION=auto
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...
   S3_ENDPOINT=https://[ACCOUNT_ID].r2.cloudflarestorage.com
   ```

### 6. Backend → Railway (10 min)

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables:
   ```env
   NODE_ENV=production
   PORT=$PORT
   DATABASE_URL=... (from Supabase)
   MONGODB_URI=... (from MongoDB)
   UPSTASH_REDIS_REST_URL=... (from Upstash)
   S3_BUCKET=... (from Cloudflare)
   S3_ACCESS_KEY=...
   S3_SECRET_KEY=...
   S3_ENDPOINT=...
   AWS_REGION=us-east-1
   AWS_BEDROCK_ENABLED=true
   JWT_SECRET=your-random-secret
   CORS_ORIGINS=https://your-app.vercel.app
   ```
5. Deploy!

### 7. Configure URLs (5 min) ⚠️ CRITICAL!

#### 7.1: Update Backend CORS

In Railway/Render, add environment variable:
```env
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

#### 7.2: Update Frontend API URL

**Option A: Vercel Dashboard** (Easiest)
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add: `VITE_API_URL` = `https://your-backend.railway.app`
3. Redeploy

**Option B: .env.production file**
Create `packages/frontend/.env.production`:
```env
VITE_API_URL=https://your-backend.railway.app
```
Then rebuild and redeploy.

**See `URL_CONFIGURATION_GUIDE.md` for detailed URL setup!**

### 8. Configure Custom Domain (Optional - 10 min)

If you want `youman.droidver130.com`:

1. **Vercel**: Settings → Domains → Add `youman.droidver130.com`
2. **Squarespace**: DNS Settings → Add CNAME:
   - Host: `youman`
   - Data: `cname.vercel-dns.com` (or what Vercel shows)
3. **Update CORS**: Add `https://youman.droidver130.com` to backend CORS
4. **Wait**: DNS propagation (5-60 min)

**See `URL_CONFIGURATION_GUIDE.md` for full domain setup!**

### 9. Test! (5 min)

- ✅ Backend health: `curl https://your-backend.railway.app/api/v1/health`
- ✅ Frontend: `https://your-app.vercel.app` (or custom domain)
- ✅ Check browser console (F12):
  - Should see: `🔗 API Base URL: https://your-backend.railway.app/api/v1`
  - No CORS errors
- ✅ Login works
- ✅ API calls work
- ✅ Everything works!

**Quick validation:**
```bash
# From your local machine
npm run validate:urls
```

## 🎯 That's It!

Your app is now live for **FREE**! 🎉

## 📊 Free Tier Limits

| Service | Free Limit | Enough For |
|---------|-----------|------------|
| Vercel | Unlimited | ✅ Yes |
| Railway | $5/month credit | ✅ Small apps |
| Supabase | 500MB DB | ✅ Small-medium |
| MongoDB | 512MB | ✅ Small |
| Upstash | 10K/day | ✅ Caching |
| Cloudflare R2 | 10GB | ✅ Documents |

## 💡 Pro Tips

1. **Monitor usage** in each service dashboard
2. **Use Railway** instead of Render (no cold starts)
3. **Cloudflare R2** has no egress fees (huge savings!)
4. **Supabase** is the best free PostgreSQL
5. **Upstash** is perfect for Redis caching

## 🆘 Need Help?

- Check service dashboards for errors
- Verify environment variables
- Check Railway logs
- Test each service individually

---

**You're done! Enjoy your free deployment!** 🚀

