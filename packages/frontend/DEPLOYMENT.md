# Deployment Guide

## Frontend Deployment

### Prerequisites
- Node.js 18+ and npm
- Backend API running and accessible

### Build for Production

```bash
cd packages/frontend
npm install
npm run build
```

The build output will be in `packages/frontend/dist/`

### Environment Variables

Create a `.env.production` file:

```env
VITE_API_URL=https://your-api-domain.com/api/v1
```

If `VITE_API_URL` is not set, the app will use relative URLs (`/api/v1`), which works if:
- The frontend and backend are on the same domain
- You have a reverse proxy (nginx, etc.) routing `/api/*` to the backend

### Deployment Options

#### Option 1: Static Hosting (Vercel, Netlify, etc.)

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service

3. Configure environment variables in your hosting dashboard:
   - `VITE_API_URL`: Your backend API URL

4. Configure redirects (for SPA routing):
   - **Vercel**: Create `vercel.json`:
     ```json
     {
       "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
     }
     ```
   - **Netlify**: Create `netlify.toml`:
     ```toml
     [[redirects]]
       from = "/*"
       to = "/index.html"
       status = 200
     ```

#### Option 2: Nginx Reverse Proxy

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Copy `dist` folder to your server

3. Configure nginx:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       # Frontend
       root /var/www/youman-ai/dist;
       index index.html;

       # API proxy
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # SPA routing
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

#### Option 3: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/frontend ./packages/frontend
RUN npm install
RUN cd packages/frontend && npm run build

FROM nginx:alpine
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Deployment

1. Set environment variables:
   ```env
   NODE_ENV=production
   DATABASE_URL=postgresql://...
   MONGODB_URI=mongodb://...
   REDIS_URL=redis://...
   JWT_SECRET=your-secret-key
   PORT=3001
   ```

2. Build and run:
   ```bash
   cd packages/backend
   npm install
   npm run build
   npm start
   ```

### CORS Configuration

If frontend and backend are on different domains, configure CORS in the backend:

```typescript
// packages/backend/src/api/middleware/cors.ts
const allowedOrigins = [
  'https://your-frontend-domain.com',
  'http://localhost:3000', // for development
];
```

### Health Checks

- Frontend: `http://your-domain.com/`
- Backend API: `http://your-api-domain.com/api/v1/health`

### Troubleshooting

1. **Site not loading**: Check browser console for errors
2. **API calls failing**: Verify `VITE_API_URL` is set correctly
3. **404 on routes**: Ensure SPA redirect is configured
4. **CORS errors**: Check backend CORS configuration

