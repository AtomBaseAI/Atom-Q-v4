# Quiz Admin - PowerShell Script
# This script starts the quiz admin terminal

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Starting Quiz Admin..." -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if an argument was provided for question interval
if ($args.Count -eq 0) {
    npx tsx simulate/server-admin.ts
} else {
    npx tsx simulate/server-admin.ts $args[0]
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Error: Failed to start admin." -ForegroundColor Red
    Write-Host "Make sure dependencies are installed: npm install" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
