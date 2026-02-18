@echo off
REM Quiz Admin - Windows Batch Script
REM This script starts the quiz admin terminal

echo ========================================================================
echo Starting Quiz Admin...
echo ========================================================================
echo.

REM Check if an argument was provided for question interval
if "%1"=="" (
    npx tsx simulate/server-admin.ts
) else (
    npx tsx simulate/server-admin.ts %1
)

if errorlevel 1 (
    echo.
    echo Error: Failed to start admin. Make sure you have installed dependencies.
    echo Run: npm install
    echo.
    pause
)
