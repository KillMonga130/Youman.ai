# Frontend URL Configuration

## Quick Setup

### For Production (Vercel)

1. **Set Environment Variable in Vercel Dashboard**:
   - Go to: Project → Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend.railway.app`
   - Redeploy

### For Local Development

No configuration needed! The app uses a proxy (see `vite.config.ts`).

## Environment Variables

### `.env.production`
```env
VITE_API_URL=https://your-backend.railway.app
```

### `.env.local` (for local overrides)
```env
VITE_API_URL=http://localhost:3001
```

## How It Works

1. **Production**: Uses `VITE_API_URL` if set, otherwise falls back to `/api/v1`
2. **Development**: Uses Vite proxy to `http://localhost:3001` (see `vite.config.ts`)

## Testing

Check browser console Network tab to verify API calls go to correct URL.

