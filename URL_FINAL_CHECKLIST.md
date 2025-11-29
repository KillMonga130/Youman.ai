# URL Configuration - Final Checklist

Use this checklist before deploying to ensure URLs are configured correctly.

## ✅ Pre-Deployment Checklist

### 1. Backend CORS Configuration
- [ ] `CORS_ORIGINS` includes your frontend Vercel URL
- [ ] `CORS_ORIGINS` includes `http://localhost:3000` (for local testing)
- [ ] If using custom domain, include it in `CORS_ORIGINS`
- [ ] Format: `https://your-app.vercel.app,http://localhost:3000`
- [ ] No trailing slashes
- [ ] No `/api/v1` in URLs

**Example:**
```env
CORS_ORIGINS=https://youman.droidver130.com,https://your-app.vercel.app,http://localhost:3000
```

### 2. Frontend API URL Configuration
- [ ] `VITE_API_URL` set to your backend URL
- [ ] Includes `https://` or `http://`
- [ ] Does NOT include `/api/v1` (added automatically)
- [ ] No trailing slashes

**Example:**
```env
VITE_API_URL=https://youman-backend.railway.app
```

### 3. Validation
- [ ] Run `npm run validate:urls` - all checks pass
- [ ] Backend logs show CORS origins on startup
- [ ] Frontend console (F12) shows: `🔗 API Base URL: ...`

## 🧪 Testing Checklist

### Backend Tests
- [ ] Health endpoint works: `curl https://your-backend.railway.app/api/v1/health`
- [ ] CORS preflight works:
  ```bash
  curl -H "Origin: https://your-frontend.vercel.app" \
       -H "Access-Control-Request-Method: GET" \
       -X OPTIONS \
       https://your-backend.railway.app/api/v1/health
  ```

### Frontend Tests
- [ ] Open browser console (F12)
- [ ] See: `🔗 API Base URL: https://your-backend.railway.app/api/v1`
- [ ] No CORS errors in console
- [ ] API requests succeed (check Network tab)
- [ ] Login/Register works
- [ ] All API calls return 200/201 (not 404 or CORS errors)

## 🐛 Common Issues

### CORS Error: "Not allowed by CORS"
**Fix:**
1. Check `CORS_ORIGINS` includes exact frontend URL (with `https://`)
2. Restart backend after changing `CORS_ORIGINS`
3. Verify no typos in URL

### API 404 Error
**Fix:**
1. Check `VITE_API_URL` doesn't include `/api/v1`
2. Verify backend URL is correct
3. Check backend is running

### Connection Refused
**Fix:**
1. Verify backend is deployed and running
2. Check backend URL is accessible
3. Test with `curl` first

### Mixed Content (HTTP/HTTPS)
**Fix:**
1. Ensure both frontend and backend use HTTPS in production
2. Don't mix HTTP and HTTPS

## 📋 Quick Commands

```bash
# Validate URLs
npm run validate:urls

# Test backend
curl https://your-backend.railway.app/api/v1/health

# Test CORS
curl -H "Origin: https://your-frontend.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://your-backend.railway.app/api/v1/health

# Check DNS (if using custom domain)
nslookup youman.droidver130.com
```

## 📚 Documentation

- **Quick Reference**: `URL_QUICK_REFERENCE.md`
- **Complete Guide**: `URL_CONFIGURATION_GUIDE.md`
- **Setup Summary**: `URL_SETUP_SUMMARY.md`
- **Deployment Guide**: `FREE_SETUP_QUICKSTART.md`

## ✨ After Deployment

1. ✅ Test all major features
2. ✅ Monitor backend logs for CORS warnings
3. ✅ Check browser console for errors
4. ✅ Verify API calls in Network tab
5. ✅ Test on different browsers/devices

**If everything passes, you're good to go!** 🎉

