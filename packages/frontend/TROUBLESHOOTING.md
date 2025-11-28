# Troubleshooting Guide

## Site Not Loading

### Check Browser Console
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

### Common Issues

#### 1. White Screen / Blank Page
- **Cause**: JavaScript error preventing React from rendering
- **Fix**: Check browser console for errors
- **Common causes**:
  - Missing environment variables
  - API connection issues
  - CSS compilation errors

#### 2. Infinite Loading Spinner
- **Cause**: API call hanging or failing
- **Fix**: 
  - Check if backend is running on port 3001
  - Check browser Network tab for `/api/v1/auth/me` request
  - Verify CORS is configured correctly

#### 3. Redirect Loop
- **Cause**: Authentication check failing repeatedly
- **Fix**: Clear localStorage:
  ```javascript
  localStorage.clear();
  location.reload();
  ```

#### 4. CSS Not Loading
- **Cause**: Tailwind compilation error
- **Fix**: 
  - Check terminal for CSS errors
  - Verify `tailwind.config.js` is correct
  - Restart dev server

### Quick Fixes

1. **Clear browser cache and localStorage**:
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Restart dev servers**:
   ```bash
   # Stop both servers (Ctrl+C)
   # Then restart:
   npm run dev
   ```

3. **Check if backend is accessible**:
   ```bash
   curl http://localhost:3001/api/v1/health
   ```

4. **Verify ports are not in use**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

### Development vs Production

**Development**:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Vite proxy handles `/api/*` → `localhost:3001`

**Production**:
- Set `VITE_API_URL` environment variable
- Or use same domain with reverse proxy

### Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

### Performance Issues

If the site is slow:
1. Check Network tab for slow requests
2. Verify database connections
3. Check for memory leaks in browser
4. Disable browser extensions that might interfere

