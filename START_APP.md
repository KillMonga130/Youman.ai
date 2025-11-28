# 🚀 Quick Start Commands

## All databases are running! Now:

### 1. Setup Database (if not done)
```powershell
cd packages\backend
npx prisma generate
npx prisma migrate dev
```

### 2. Start the App
```powershell
# From root directory
npm run dev
```

This will start:
- ✅ Backend on http://localhost:3001
- ✅ Frontend on http://localhost:3000

### 3. Access the App
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/v1/docs

### 4. First Steps
1. Open http://localhost:3000
2. Register a new account
3. Create your first project
4. Start humanizing text!

## If you see errors:

### Database connection errors
- Check Docker containers: `docker-compose ps`
- Restart databases: `docker-compose restart postgres mongodb redis`

### Port already in use
- Change PORT in `packages/backend/.env`
- Or stop the process using the port

### Frontend can't connect
- Check `VITE_API_URL` in `packages/frontend/.env`
- Make sure backend is running first

