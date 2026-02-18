@echo off
REM Quiz User - Windows Command Script
REM This script starts a quiz user terminal

if "%~1"=="" (
    echo ========================================================================
    echo Error: Activity key is required!
    echo ========================================================================
    echo.
    echo Usage: user.cmd ^<activity-key^> ^<nickname^> [user-id]
    echo.
    echo Example:
    echo   user.cmd quiz-a1b2c3d4 Alice
    echo   user.cmd quiz-a1b2c3d4 Bob user-bob-123
    echo.
    echo Note: Start the admin first to get the activity key
    echo ========================================================================
    echo.
    pause
    exit /b 1
)

if "%~2"=="" (
    echo ========================================================================
    echo Error: Nickname is required!
    echo ========================================================================
    echo.
    echo Usage: user.cmd ^<activity-key^> ^<nickname^> [user-id]
    echo.
    echo Example:
    echo   user.cmd quiz-a1b2c3d4 Alice
    echo   user.cmd quiz-a1b2c3d4 Bob user-bob-123
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

if "%~3"=="" (
    npx tsx simulate/server-user.ts %~1 %~2
) else (
    npx tsx simulate/server-user.ts %~1 %~2 %~3
)

if errorlevel 1 (
    echo.
    echo Error: Failed to start user.
    echo Make sure dependencies are installed: npm install
    echo.
    pause
    exit /b 1
)
