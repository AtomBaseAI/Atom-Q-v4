@echo off
REM Quiz User - Windows Batch Script
REM This script starts a quiz user terminal

REM Check if required arguments are provided
if "%1"=="" (
    echo ========================================================================
    echo Error: Activity key is required!
    echo ========================================================================
    echo.
    echo Usage: user.bat ^<activity-key^> ^<nickname^> [user-id]
    echo.
    echo Example:
    echo   user.bat quiz-a1b2c3d4 Alice
    echo   user.bat quiz-a1b2c3d4 Bob user-bob-123
    echo.
    echo Note: Start the admin first to get the activity key
    echo ========================================================================
    echo.
    pause
    exit /b 1
)

if "%2"=="" (
    echo ========================================================================
    echo Error: Nickname is required!
    echo ========================================================================
    echo.
    echo Usage: user.bat ^<activity-key^> ^<nickname^> [user-id]
    echo.
    echo Example:
    echo   user.bat quiz-a1b2c3d4 Alice
    echo   user.bat quiz-a1b2c3d4 Bob user-bob-123
    echo.
    echo ========================================================================
    echo.
    pause
    exit /b 1
)

echo ========================================================================
echo Starting Quiz User...
echo ========================================================================
echo.

REM Check if optional user-id was provided
if "%3"=="" (
    npx tsx simulate/server-user.ts %1 %2
) else (
    npx tsx simulate/server-user.ts %1 %2 %3
)

if errorlevel 1 (
    echo.
    echo Error: Failed to start user. Make sure you have installed dependencies.
    echo Run: npm install
    echo.
    pause
)
