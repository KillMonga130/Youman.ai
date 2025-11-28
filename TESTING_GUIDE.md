# Testing Guide - AI Humanizer App

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (or Docker)
- MongoDB (or Docker)
- Redis (or Docker)

### Option 1: Docker (Recommended)
```bash
# Start all services (backend, frontend, databases)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Local Development
```bash
# 1. Install dependencies
npm install

# 2. Setup databases (if not using Docker)
# PostgreSQL: Create database 'ai_humanizer'
# MongoDB: Start MongoDB service
# Redis: Start Redis service

# 3. Setup environment variables
# Copy .env.example to .env in packages/backend and packages/frontend
# Update with your database credentials

# 4. Run database migrations
cd packages/backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # Optional: seed with test data

# 5. Start development servers
# From root directory:
npm run dev

# Or start separately:
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Frontend
cd packages/frontend
npm run dev
```

## 📍 Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001 (or check your .env)
- **API Docs**: http://localhost:3001/api/v1/docs (Swagger)
- **Prisma Studio**: `cd packages/backend && npx prisma studio`

## ✅ Testing Checklist

### 1. Authentication
- [ ] Register a new user
  - Go to `/register`
  - Fill in email, password, name
  - Should redirect to dashboard after successful registration
- [ ] Login
  - Go to `/login`
  - Use registered credentials
  - Should redirect to dashboard
- [ ] Logout
  - Click logout button
  - Should redirect to login page
  - Token should be cleared

### 2. Dashboard
- [ ] View dashboard
  - Should show project list
  - Should display usage statistics
  - Should show recent projects
- [ ] Create new project
  - Click "New Project" button
  - Fill in project name and description
  - Should appear in project list
- [ ] View project details
  - Click on a project
  - Should navigate to project/editor page

### 3. Editor
- [ ] Open editor
  - Navigate to `/editor` or click on a project
  - Should show text editor interface
- [ ] Humanize text
  - Enter some AI-generated text
  - Click "Humanize" button
  - Should show loading state
  - Should display humanized text
  - Should show metrics (detection score, perplexity, etc.)
- [ ] Save project
  - Make changes to text
  - Click save
  - Should persist changes

### 4. Comparison Page
- [ ] Editor mode comparison
  - Humanize some text in editor
  - Navigate to `/comparison`
  - Should show side-by-side comparison
  - Should highlight differences
  - Test "Accept/Reject" changes
  - Test "Apply Selected Changes"
- [ ] Version comparison
  - Switch to "Versions" mode
  - Select a project
  - Select two versions to compare
  - Click "Compare Versions"
  - Should show version differences
  - Should display similarity percentage

### 5. Analytics Page
- [ ] View analytics
  - Navigate to `/analytics`
  - Should load without errors
  - Should show:
    - Total words processed
    - Average detection score
    - Projects completed
    - Usage limit percentage
- [ ] Check recent activity
  - Should show today's and yesterday's activity
  - Should display projects and words processed
- [ ] Check detection score trend
  - Should show chart for last 7 days
  - Should display actual data (or placeholder if no data)

### 6. History Page
- [ ] View version history
  - Navigate to `/history`
  - Select a project
  - Should show list of versions
  - Should display version numbers and dates
- [ ] Restore version
  - Click on a version
  - Should show version details
  - Test restore functionality (if implemented)

### 7. Search Page
- [ ] Search projects
  - Navigate to `/search`
  - Enter search query
  - Should return matching projects
  - Should highlight search terms
- [ ] Apply filters
  - Test status filters
  - Test date range filters
  - Should filter results correctly
- [ ] Save search
  - Create a search with filters
  - Save the search
  - Should appear in saved searches

### 8. API Endpoints (Using Postman/curl)

#### Authentication
```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Save the token from response
```

#### Projects
```bash
# Get projects (replace TOKEN with actual token)
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer TOKEN"

# Create project
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Test description"}'
```

#### Usage
```bash
# Get usage
curl http://localhost:3001/api/v1/subscription/usage \
  -H "Authorization: Bearer TOKEN"

# Get usage history
curl http://localhost:3001/api/v1/usage/history?days=7 \
  -H "Authorization: Bearer TOKEN"

# Get usage trends
curl http://localhost:3001/api/v1/usage/trends \
  -H "Authorization: Bearer TOKEN"
```

#### Transformations
```bash
# Humanize text
curl -X POST http://localhost:3001/api/v1/transformations/humanize \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"This is AI generated text.","level":3,"strategy":"professional"}'
```

#### Versions
```bash
# Get project versions
curl http://localhost:3001/api/v1/versions/project/PROJECT_ID \
  -H "Authorization: Bearer TOKEN"

# Compare versions
curl -X POST http://localhost:3001/api/v1/versions/compare \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"versionId1":"VERSION_ID_1","versionId2":"VERSION_ID_2"}'
```

## 🐛 Common Issues & Solutions

### Backend won't start
- **Issue**: Database connection error
- **Solution**: 
  - Check PostgreSQL/MongoDB/Redis are running
  - Verify DATABASE_URL, MONGODB_URI, REDIS_URL in .env
  - Run `npx prisma migrate dev` to setup database

### Frontend can't connect to backend
- **Issue**: CORS errors or 404s
- **Solution**:
  - Check VITE_API_URL in frontend .env
  - Verify backend is running on correct port
  - Check CORS_ORIGINS in backend .env includes frontend URL

### Authentication not working
- **Issue**: Token errors or redirects
- **Solution**:
  - Check JWT_SECRET is set in backend .env
  - Clear browser localStorage
  - Verify token is being sent in Authorization header

### No data showing
- **Issue**: Empty lists or "No data" messages
- **Solution**:
  - Run database seed: `cd packages/backend && npx prisma db seed`
  - Create test projects through the UI
  - Check browser console for API errors

## 📊 Performance Testing

### Load Testing
```bash
# Install Apache Bench (ab) or use k6
# Test API endpoints with multiple concurrent requests
ab -n 1000 -c 10 -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/v1/projects
```

### Memory/CPU Monitoring
- Use `docker stats` if using Docker
- Monitor backend logs for memory usage
- Check for memory leaks in long-running sessions

## 🔍 Debugging Tips

1. **Backend Logs**: Check console output for errors
2. **Frontend Console**: Open browser DevTools → Console
3. **Network Tab**: Check API requests/responses
4. **Prisma Studio**: `cd packages/backend && npx prisma studio` to inspect database
5. **Redis CLI**: `redis-cli` to check cache
6. **MongoDB Shell**: `mongosh` to inspect documents

## ✅ Success Criteria

The app is working correctly if:
- ✅ User can register and login
- ✅ User can create and manage projects
- ✅ Text humanization works and returns results
- ✅ Analytics page shows real data
- ✅ Comparison page works for both editor and version modes
- ✅ All API endpoints return expected responses
- ✅ No console errors in browser or backend
- ✅ Database operations complete successfully

## 🎯 Next Steps After Testing

1. Fix any bugs found
2. Add missing features
3. Improve error handling
4. Add more test data
5. Optimize performance
6. Deploy to staging environment

