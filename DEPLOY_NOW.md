# 🚀 Deploy Now - Quick Commands

Run these commands in order to deploy:

## Frontend Deployment (Vercel)

```powershell
# 1. Navigate to frontend
cd packages\frontend

# 2. Build (verify it works)
npm run build

# 3. Login to Vercel (if not already)
npx vercel login

# 4. Deploy to production
npx vercel --prod
```

**After deployment:**
- Copy your Vercel URL (e.g., `https://your-app.vercel.app`)
- You'll need this for backend CORS configuration

## Backend Deployment (Railway)

### Option 1: Railway Dashboard (Easier)
1. Go to https://railway.app
2. Sign up/Login with GitHub
3. New Project → Deploy from GitHub
4. Select your repository
5. Railway will auto-detect the backend
6. Add environment variables (see below)

### Option 2: Railway CLI
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to backend
cd packages\backend

# Deploy
railway up
```

## Environment Variables

### Backend (Railway) - Set these:
```env
NODE_ENV=production
PORT=$PORT
DATABASE_URL=your-supabase-url
MONGODB_URI=your-mongodb-url
REDIS_URL=your-redis-url
S3_BUCKET=your-r2-bucket
S3_ACCESS_KEY=your-r2-key
S3_SECRET_KEY=your-r2-secret
S3_ENDPOINT=your-r2-endpoint
JWT_SECRET=your-random-secret-key
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
AWS_REGION=us-east-1
AWS_BEDROCK_ENABLED=true
```

### Frontend (Vercel) - Set in Dashboard:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - Name: `VITE_API_URL`
   - Value: `https://your-backend.railway.app` (your Railway URL)
3. Redeploy

## Quick Deploy Script

Or run the automated script:
```powershell
.\deploy.ps1
```

## Validate After Deployment

```powershell
npm run validate:urls
```

## Need Help?

- See `FREE_SETUP_QUICKSTART.md` for detailed steps
- See `URL_CONFIGURATION_GUIDE.md` for URL setup
- See `DEPLOYMENT_CHECKLIST.md` for complete checklist

