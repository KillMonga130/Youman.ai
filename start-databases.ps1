# Start all required databases
Write-Host "Starting PostgreSQL, MongoDB, and Redis..." -ForegroundColor Cyan

docker-compose up -d postgres mongodb redis

Write-Host ""
Write-Host "Waiting for databases to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Checking container status..." -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "✅ Databases should be running now!" -ForegroundColor Green
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan

