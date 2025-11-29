# Deployment Checklist - Free Tier

Use this checklist to ensure everything is configured correctly.

## Pre-Deployment

- [ ] All code committed to GitHub
- [ ] Environment variables documented
- [ ] Database migrations ready

## Backend Deployment

- [ ] Railway/Render account created
- [ ] Backend deployed
- [ ] Backend URL obtained: `https://...`
- [ ] Health check works: `curl https://backend-url/api/v1/health`
- [ ] Environment variables set:
  - [ ] `DATABASE_URL` (Supabase)
  - [ ] `MONGODB_URI` (MongoDB Atlas)
  - [ ] `REDIS_URL` (Upstash)
  - [ ] `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (Cloudflare R2)
  - [ ] `CORS_ORIGINS` (include frontend URLs!)
  - [ ] `JWT_SECRET`
  - [ ] `AWS_BEDROCK_ENABLED=true`

## Frontend Deployment

- [ ] Vercel account created
- [ ] Frontend deployed
- [ ] Frontend URL obtained: `https://...`
- [ ] Environment variable set:
  - [ ] `VITE_API_URL` = backend URL
- [ ] Frontend redeployed after setting `VITE_API_URL`

## URL Configuration ⚠️ CRITICAL

- [ ] Backend CORS includes frontend URL
- [ ] Frontend `VITE_API_URL` points to backend
- [ ] **Validate URLs**: Run `npm run validate:urls`
- [ ] Test: Frontend can call backend API
- [ ] No CORS errors in browser console
- [ ] Browser console shows: `🔗 API Base URL: ...` (check F12)

## Custom Domain (Optional)

- [ ] Domain added to Vercel
- [ ] DNS CNAME record added in Squarespace
- [ ] DNS propagated (check with `nslookup`)
- [ ] SSL certificate active (green padlock)
- [ ] Custom domain added to backend CORS
- [ ] Backend redeployed with updated CORS

## Testing

- [ ] Backend health endpoint works
- [ ] Frontend loads without errors
- [ ] Login/Register works
- [ ] API calls succeed (check Network tab)
- [ ] No CORS errors
- [ ] No console errors

## Post-Deployment

- [ ] Monitor logs for errors
- [ ] Test all major features
- [ ] Check free tier usage limits
- [ ] Set up monitoring/alerts (optional)

## Troubleshooting

If something doesn't work:

1. **CORS Errors**: Check `CORS_ORIGINS` includes exact frontend URL
2. **API Failures**: Verify `VITE_API_URL` is correct
3. **Domain Issues**: Check DNS propagation, wait 5-60 minutes
4. **SSL Issues**: Wait for certificate provisioning (Vercel auto-handles)

## Quick Commands

```bash
# Validate URL configuration
npm run validate:urls

# Test backend
curl https://your-backend.railway.app/api/v1/health

# Test CORS
curl -H "Origin: https://your-frontend.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://your-backend.railway.app/api/v1/health

# Check DNS
nslookup youman.droidver130.com
```

---

**Check everything twice! URLs are the most common issue.** ✅

