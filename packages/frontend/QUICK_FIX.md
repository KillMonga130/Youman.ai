# Quick Fix for Site Not Loading

## Immediate Steps

1. **Open Browser Console (F12)**
   - Check for red error messages
   - Look for failed network requests

2. **Clear Browser Data**:
   ```
   Press F12 → Application tab → Clear storage → Clear site data
   Or in console: localStorage.clear(); location.reload();
   ```

3. **Check if Backend is Running**:
   - Backend should be on http://localhost:3001
   - Test: Open http://localhost:3001/api/v1/health in browser

4. **Restart Dev Server**:
   ```bash
   # Stop current server (Ctrl+C)
   cd packages/frontend
   npm run dev
   ```

5. **Check Network Tab**:
   - Look for `/api/v1/auth/me` request
   - If it's failing, backend might not be running

## Common Solutions

### White Screen
- **Fix**: Check browser console for JavaScript errors
- Usually a missing import or syntax error

### Infinite Loading
- **Fix**: Backend not responding
- Check if backend is running on port 3001
- Check CORS settings

### Redirect Loop
- **Fix**: Clear localStorage and reload
- ```javascript
  localStorage.clear();
  sessionStorage.clear();
  location.reload();
  ```

## Deployment Readiness

✅ **Ready for deployment** - The app is configured for production:

1. **API URL**: Uses environment variable `VITE_API_URL` or falls back to relative paths
2. **Build**: `npm run build` works correctly
3. **TypeScript**: No type errors
4. **Dependencies**: All installed

### To Deploy:

1. Set environment variable:
   ```env
   VITE_API_URL=https://your-api-domain.com/api/v1
   ```

2. Build:
   ```bash
   npm run build
   ```

3. Deploy `dist` folder to your hosting service

See `DEPLOYMENT.md` for detailed instructions.

