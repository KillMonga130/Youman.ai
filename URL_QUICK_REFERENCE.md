# URL Configuration Quick Reference

## 🚀 Quick Setup Checklist

### 1. Backend CORS (Railway/Render)
```env
CORS_ORIGINS=https://youman.droidver130.com,https://your-app.vercel.app,http://localhost:3000
```
**Location**: Railway/Render Dashboard → Environment Variables

### 2. Frontend API URL (Vercel)
```env
VITE_API_URL=https://youman-backend.railway.app
```
**Location**: Vercel Dashboard → Settings → Environment Variables

### 3. After Setting Variables
- **Backend**: Restart/Redeploy service
- **Frontend**: Redeploy (Vercel auto-deploys on env change)

## 📝 URL Format Rules

### Frontend API URL (`VITE_API_URL`)
- ✅ **Correct**: `https://youman-backend.railway.app`
- ✅ **Correct**: `https://api.youman.droidver130.com`
- ❌ **Wrong**: `https://youman-backend.railway.app/api/v1` (don't include `/api/v1`)
- ❌ **Wrong**: `youman-backend.railway.app` (must include `http://` or `https://`)

### Backend CORS (`CORS_ORIGINS`)
- ✅ **Correct**: `https://youman.droidver130.com,https://your-app.vercel.app,http://localhost:3000`
- ✅ **Correct**: Single origin: `https://youman.droidver130.com`
- ❌ **Wrong**: `https://youman.droidver130.com, https://your-app.vercel.app` (spaces are OK, but avoid them)
- **Note**: Spaces are automatically trimmed, but best practice is no spaces

## 🔍 Testing URLs

### Test Backend
```bash
curl https://youman-backend.railway.app/api/v1/health
```

### Test CORS
```bash
curl -H "Origin: https://youman.droidver130.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://youman-backend.railway.app/api/v1/health
```

### Test Frontend
1. Open browser console (F12)
2. Check Network tab for API requests
3. Look for CORS errors in Console tab

## 🐛 Common Issues

### CORS Error: "Not allowed by CORS"
**Fix**: Add exact frontend URL to `CORS_ORIGINS` (including `https://`)

### API 404 Error
**Fix**: Check `VITE_API_URL` doesn't include `/api/v1` at the end

### API Connection Refused
**Fix**: Verify backend URL is correct and backend is running

### Mixed Content Error (HTTP/HTTPS)
**Fix**: Ensure both frontend and backend use HTTPS in production

## 📚 Full Documentation

- **Complete Guide**: See `URL_CONFIGURATION_GUIDE.md`
- **Deployment**: See `FREE_SETUP_QUICKSTART.md`
- **Environment Variables**: See `packages/frontend/env.example` and `packages/backend/env.example`

