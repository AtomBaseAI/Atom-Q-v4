# Quiz User - PowerShell Script
# This script starts a quiz user terminal

if ($args.Count -lt 2) {
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host "Error: Activity key and nickname are required!" -ForegroundColor Red
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage: .\start-user.ps1 <activity-key> <nickname> [user-id]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Cyan
    Write-Host "  .\start-user.ps1 quiz-a1b2c3d4 Alice" -ForegroundColor White
    Write-Host "  .\start-user.ps1 quiz-a1b2c3d4 Bob user-bob-123" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: Start the admin first to get the activity key" -ForegroundColor Yellow
    Write-Host "========================================================================" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "Starting Quiz User..." -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if optional user-id was provided
if ($args.Count -eq 2) {
    npx tsx simulate/server-user.ts $args[0] $args[1]
} else {
    npx tsx simulate/server-user.ts $args[0] $args[1] $args[2]
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Error: Failed to start user." -ForegroundColor Red
    Write-Host "Make sure dependencies are installed: npm install" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
