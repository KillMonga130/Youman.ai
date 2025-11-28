# 🚀 Quick Start - Testing the App

## Prerequisites Check
Run the test script to verify your setup:
```powershell
.\test-app.ps1
```

## Option 1: Docker (Easiest)
```bash
# Start everything with one command
docker-compose up -d --build

# View logs
docker-compose logs -f

# Access the app
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## Option 2: Local Development

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Databases
Make sure you have:
- PostgreSQL running on port 5432
- MongoDB running on port 27017
- Redis running on port 6379

Or use Docker for databases only:
```bash
docker-compose up -d postgres mongodb redis
```

### Step 3: Configure Environment
Create `.env` files:

**packages/backend/.env:**
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_humanizer
MONGODB_URI=mongodb://localhost:27017/ai_humanizer
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
```

**packages/frontend/.env:**
```env
VITE_API_URL=http://localhost:3001
```

### Step 4: Setup Database
```bash
cd packages/backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed  # Optional: adds test data
```

### Step 5: Start the App
```bash
# From root directory - starts both backend and frontend
npm run dev

# Or start separately:
# Terminal 1: Backend
cd packages/backend && npm run dev

# Terminal 2: Frontend  
cd packages/frontend && npm run dev
```

## 🧪 Quick Test Checklist

### 1. Basic Functionality (5 minutes)
- [ ] Open http://localhost:3000
- [ ] Register a new account
- [ ] Login with your account
- [ ] Create a new project
- [ ] Go to Editor and humanize some text
- [ ] Check Analytics page loads
- [ ] Check Comparison page works

### 2. API Testing (5 minutes)
```bash
# Get your token first by logging in
TOKEN="your-jwt-token-here"

# Test projects endpoint
curl http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer $TOKEN"

# Test usage endpoint
curl http://localhost:3001/api/v1/subscription/usage \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Full Feature Test (15 minutes)
Follow the detailed checklist in `TESTING_GUIDE.md`

## 🐛 Troubleshooting

### Backend won't start
- Check database connections in `.env`
- Verify PostgreSQL/MongoDB/Redis are running
- Run `npx prisma migrate dev` again

### Frontend shows errors
- Check browser console (F12)
- Verify `VITE_API_URL` in frontend `.env`
- Make sure backend is running

### CORS errors
- Add `http://localhost:3000` to `CORS_ORIGINS` in backend `.env`
- Restart backend after changing `.env`

### No data showing
- Run database seed: `cd packages/backend && npx prisma db seed`
- Create test projects through the UI
- Check API responses in browser Network tab

## 📊 What to Test

### Core Features
1. ✅ Authentication (Register/Login/Logout)
2. ✅ Project Management (Create/Edit/Delete)
3. ✅ Text Humanization
4. ✅ Analytics Dashboard
5. ✅ Version Comparison
6. ✅ Search Functionality

### API Endpoints
- `/api/v1/auth/*` - Authentication
- `/api/v1/projects/*` - Projects
- `/api/v1/transformations/*` - Humanization
- `/api/v1/usage/*` - Usage stats
- `/api/v1/versions/*` - Version control
- `/api/v1/search/*` - Search

## 🎯 Success Indicators

You'll know everything is working when:
- ✅ You can register and login
- ✅ You can create projects
- ✅ Text humanization returns results
- ✅ Analytics shows data (even if zeros)
- ✅ Comparison page works
- ✅ No errors in browser console
- ✅ No errors in backend logs

## 📖 More Details

See `TESTING_GUIDE.md` for comprehensive testing instructions.

