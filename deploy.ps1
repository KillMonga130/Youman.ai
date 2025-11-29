# Youman.ai Deployment Script
# Deploys frontend to Vercel and provides backend deployment instructions

Write-Host "🚀 Youman.ai Deployment Script" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "packages\frontend")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Build frontend
Write-Host "📦 Step 1: Building frontend..." -ForegroundColor Yellow
Set-Location packages\frontend

try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Build error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Check Vercel CLI
Write-Host ""
Write-Host "🔍 Step 2: Checking Vercel CLI..." -ForegroundColor Yellow

$vercelInstalled = $false
try {
    $vercelVersion = npx vercel --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $vercelInstalled = $true
        Write-Host "✅ Vercel CLI available" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Vercel CLI not found, will use npx" -ForegroundColor Yellow
}

# Step 3: Deploy to Vercel
Write-Host ""
Write-Host "🚀 Step 3: Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "   (You may need to login if not already logged in)" -ForegroundColor Gray
Write-Host ""

try {
    # Check if logged in
    $whoami = npx vercel whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Not logged in to Vercel. Please login first:" -ForegroundColor Yellow
        Write-Host "   npx vercel login" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Then run this script again, or deploy manually:" -ForegroundColor Yellow
        Write-Host "   npx vercel --prod" -ForegroundColor Cyan
        exit 0
    }
    
    Write-Host "✅ Logged in as: $whoami" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deploying to production..." -ForegroundColor Yellow
    
    # Deploy
    npx vercel --prod --yes
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Deployment error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try deploying manually:" -ForegroundColor Yellow
    Write-Host "   npx vercel --prod" -ForegroundColor Cyan
    exit 1
}

# Step 4: Instructions
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Get your Vercel deployment URL from the output above" -ForegroundColor White
Write-Host "2. Deploy backend to Railway:" -ForegroundColor White
Write-Host "   - Go to https://railway.app" -ForegroundColor Gray
Write-Host "   - New Project → Deploy from GitHub" -ForegroundColor Gray
Write-Host "   - Select your repository" -ForegroundColor Gray
Write-Host "   - Set environment variables (see FREE_SETUP_QUICKSTART.md)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure URLs:" -ForegroundColor White
Write-Host "   - Backend: Set CORS_ORIGINS with your Vercel URL" -ForegroundColor Gray
Write-Host "   - Frontend: Set VITE_API_URL with your Railway URL" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Validate configuration:" -ForegroundColor White
Write-Host "   npm run validate:urls" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 See FREE_SETUP_QUICKSTART.md for complete guide" -ForegroundColor Yellow

Set-Location ..\..

