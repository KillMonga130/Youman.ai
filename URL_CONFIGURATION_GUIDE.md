# URL Configuration Guide for Free Deployment

This guide covers all URL-related configurations for deploying Youman.ai on free services.

## 🌐 URL Structure

After deployment, you'll have:
- **Frontend**: `https://youman.droidver130.com` (or Vercel URL)
- **Backend**: `https://youman-backend.railway.app` (or Render URL)

## 📋 Step-by-Step URL Configuration

### Step 1: Deploy Backend First (Get Backend URL)

1. **Deploy to Railway**:
   ```bash
   # Go to railway.app
   # Deploy from GitHub
   # Get your URL: https://youman-backend-production.up.railway.app
   ```

2. **Or Deploy to Render**:
   ```bash
   # Go to render.com
   # Create web service
   # Get your URL: https://youman-backend.onrender.com
   ```

3. **Save your backend URL** - you'll need it!

### Step 2: Configure Backend CORS

Update backend environment variables (Railway/Render):

```env
# CORS - Add your frontend URLs
CORS_ORIGINS=https://youman.droidver130.com,https://your-app.vercel.app,http://localhost:3000
```

**Important**: Add ALL possible frontend URLs:
- Your custom domain (if configured)
- Vercel URL (temporary)
- Localhost (for development)

### Step 3: Configure Frontend API URL

#### Option A: Using Vercel Environment Variables (Recommended)

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   ```
   Name: VITE_API_URL
   Value: https://youman-backend.railway.app
   ```
3. Redeploy frontend

#### Option B: Using .env.production File

Create `packages/frontend/.env.production`:

```env
VITE_API_URL=https://youman-backend.railway.app
```

Then rebuild and deploy.

#### Option C: Using Vercel CLI

```bash
cd packages/frontend
vercel env add VITE_API_URL production
# Enter: https://youman-backend.railway.app
vercel --prod
```

### Step 4: Configure Custom Domain (youman.droidver130.com)

#### 4.1: Add Domain to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Click "Add Domain"
3. Enter: `youman.droidver130.com`
4. Vercel will show DNS instructions

#### 4.2: Configure DNS in Squarespace

1. Log in to Squarespace
2. Go to Settings → Domains → droidver130.com
3. Click "DNS Settings"
4. Add CNAME record:
   - **Type**: CNAME
   - **Host**: `youman`
   - **Data**: `cname.vercel-dns.com` (or what Vercel shows)
5. Save

#### 4.3: Update CORS (Again)

After domain is live, update backend CORS:

```env
CORS_ORIGINS=https://youman.droidver130.com,https://your-app.vercel.app,http://localhost:3000
```

Redeploy backend.

### Step 5: Update Frontend API URL for Custom Domain

If you want the frontend to use the custom domain's API:

1. **Option A**: Use subdomain for backend too
   - Backend: `api.youman.droidver130.com` (requires Railway custom domain)
   - Frontend: `VITE_API_URL=https://api.youman.droidver130.com`

2. **Option B**: Keep Railway URL (easier)
   - Frontend: `VITE_API_URL=https://youman-backend.railway.app`
   - Works fine, just not as pretty

## 🔧 Environment Variables Checklist

### Backend (Railway/Render)

```env
# App
NODE_ENV=production
PORT=3001

# CORS - CRITICAL!
CORS_ORIGINS=https://youman.droidver130.com,https://your-app.vercel.app,http://localhost:3000

# Database URLs
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb://...
REDIS_URL=redis://...

# Storage
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# AWS
AWS_REGION=us-east-1
AWS_BEDROCK_ENABLED=true

# JWT
JWT_SECRET=...
```

### Frontend (Vercel)

```env
# API URL - CRITICAL!
VITE_API_URL=https://youman-backend.railway.app
```

## 🧪 Testing URLs

### Test Backend Health

```bash
curl https://youman-backend.railway.app/api/v1/health
```

Should return: `{"status":"ok"}`

### Test CORS

```bash
curl -H "Origin: https://youman.droidver130.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: authorization" \
     -X OPTIONS \
     https://youman-backend.railway.app/api/v1/health
```

Should return CORS headers.

### Test Frontend → Backend

1. Open browser console on frontend
2. Check Network tab
3. API calls should go to: `https://youman-backend.railway.app/api/v1/...`

## 🐛 Common URL Issues

### Issue: CORS Error

**Error**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Fix**:
1. Check `CORS_ORIGINS` in backend includes your frontend URL
2. Make sure URL matches exactly (including https/http)
3. Redeploy backend after changing CORS

### Issue: API Calls Fail

**Error**: `Failed to fetch` or `Network error`

**Fix**:
1. Check `VITE_API_URL` is set correctly
2. Verify backend is running: `curl https://your-backend-url/api/v1/health`
3. Check browser console for exact error
4. Verify CORS is configured

### Issue: Domain Not Working

**Error**: Domain doesn't resolve or shows error

**Fix**:
1. Wait for DNS propagation (5-60 minutes)
2. Check DNS record in Squarespace
3. Verify domain in Vercel dashboard
4. Check SSL certificate status in Vercel

### Issue: Mixed Content (HTTP/HTTPS)

**Error**: Mixed content warnings

**Fix**:
- Always use HTTPS URLs
- Update `VITE_API_URL` to use `https://`
- Update `CORS_ORIGINS` to use `https://`

## 📝 Quick Reference

### Backend URLs
- Railway: `https://[project-name].up.railway.app`
- Render: `https://[service-name].onrender.com`

### Frontend URLs
- Vercel: `https://[project-name].vercel.app`
- Custom: `https://youman.droidver130.com`

### Environment Variables

**Backend**:
```env
CORS_ORIGINS=https://youman.droidver130.com,https://your-app.vercel.app
```

**Frontend**:
```env
VITE_API_URL=https://your-backend.railway.app
```

## ✅ Final Checklist

Before going live:

- [ ] Backend deployed and accessible
- [ ] Backend health check works: `/api/v1/health`
- [ ] CORS configured with all frontend URLs
- [ ] Frontend `VITE_API_URL` set correctly
- [ ] Frontend deployed to Vercel
- [ ] Custom domain configured (if using)
- [ ] DNS propagated (check with `nslookup`)
- [ ] SSL certificates active (check padlock icon)
- [ ] Test login/register works
- [ ] Test API calls from frontend work

## 🚀 Deployment Order

1. **Deploy Backend** → Get backend URL
2. **Configure Backend CORS** → Add frontend URLs
3. **Deploy Frontend** → Set `VITE_API_URL`
4. **Configure Domain** → Add to Vercel + DNS
5. **Update CORS** → Add custom domain
6. **Test Everything** → Verify all URLs work

---

**URLs are critical!** Make sure all URLs are configured correctly before testing. 🎯

