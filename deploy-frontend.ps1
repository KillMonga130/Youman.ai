# Deploy Frontend to Vercel
$ErrorActionPreference = "Continue"
$logFile = "deploy-log.txt"

Write-Host "🚀 Starting Frontend Deployment..." -ForegroundColor Cyan
"=== Deployment Log $(Get-Date) ===" | Out-File $logFile

# Navigate to frontend
Set-Location packages\frontend
"Changed to: $(Get-Location)" | Out-File -Append $logFile

# Build
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
"Building..." | Out-File -Append $logFile
npm run build 2>&1 | Tee-Object -Append $logFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Check deploy-log.txt" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful!" -ForegroundColor Green

# Check Vercel
Write-Host "🔍 Checking Vercel..." -ForegroundColor Yellow
"Checking Vercel..." | Out-File -Append $logFile
$vercelCheck = npx vercel whoami 2>&1 | Tee-Object -Append $logFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in. Please run: npx vercel login" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 0
}

# Deploy
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
"Deploying..." | Out-File -Append $logFile
npx vercel --prod --yes 2>&1 | Tee-Object -Append $logFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment initiated! Check deploy-log.txt for URL" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed! Check deploy-log.txt" -ForegroundColor Red
}

Set-Location ..\..

