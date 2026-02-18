@echo off
REM Quiz Admin - Windows Command Script
REM This script starts the quiz admin terminal

echo ========================================================================
echo Starting Quiz Admin...
echo ========================================================================
echo.

if "%~1"=="" (
    npx tsx simulate/server-admin.ts
) else (
    npx tsx simulate/server-admin.ts %~1
)

if errorlevel 1 (
    echo.
    echo Error: Failed to start admin.
    echo Make sure dependencies are installed: npm install
    echo.
    pause
    exit /b 1
)
