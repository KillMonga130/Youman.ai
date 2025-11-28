# Quick Test Script for AI Humanizer App
# Run this script to check if everything is set up correctly

Write-Host "🧪 AI Humanizer - Quick Test Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "📦 Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($nodeVersion) {
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js >= 18.0.0" -ForegroundColor Red
    exit 1
}

# Check npm version
Write-Host "📦 Checking npm version..." -ForegroundColor Yellow
$npmVersion = npm --version
if ($npmVersion) {
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

# Check if dependencies are installed
Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Root dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Root dependencies not found. Run: npm install" -ForegroundColor Yellow
}

if (Test-Path "packages/backend/node_modules") {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend dependencies not found. Run: npm install" -ForegroundColor Yellow
}

if (Test-Path "packages/frontend/node_modules") {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend dependencies not found. Run: npm install" -ForegroundColor Yellow
}

# Check for .env files
Write-Host ""
Write-Host "⚙️  Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path "packages/backend/.env") {
    Write-Host "✅ Backend .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend .env file not found. You may need to create one." -ForegroundColor Yellow
}

if (Test-Path "packages/frontend/.env") {
    Write-Host "✅ Frontend .env file exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend .env file not found. You may need to create one." -ForegroundColor Yellow
}

# Check Docker (optional)
Write-Host ""
Write-Host "🐳 Checking Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if ($dockerVersion) {
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
    Write-Host "💡 Tip: You can use 'docker-compose up -d' to start all services" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Docker not found (optional - only needed for Docker deployment)" -ForegroundColor Yellow
}

# Type checking
Write-Host ""
Write-Host "🔍 Running type checks..." -ForegroundColor Yellow
Write-Host "Checking backend types..." -ForegroundColor Gray
$backendTypeCheck = cd packages/backend; npm run typecheck 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend type check passed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend type check failed" -ForegroundColor Red
    Write-Host $backendTypeCheck -ForegroundColor Red
}

Write-Host "Checking frontend types..." -ForegroundColor Gray
$frontendTypeCheck = cd packages/frontend; npm run typecheck 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend type check passed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend type check failed" -ForegroundColor Red
    Write-Host $frontendTypeCheck -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Make sure databases are running (PostgreSQL, MongoDB, Redis)" -ForegroundColor White
Write-Host "2. Run database migrations: cd packages/backend && npx prisma migrate dev" -ForegroundColor White
Write-Host "3. Start the app: npm run dev" -ForegroundColor White
Write-Host "4. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host ""
Write-Host "📖 See TESTING_GUIDE.md for detailed testing instructions" -ForegroundColor Cyan
Write-Host ""

