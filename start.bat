@echo off
title OND - Odyssey ^& Dragons
echo.
echo  ========================================
echo    OND - Odyssey ^& Dragons
echo    Your Local D^&D Companion
echo  ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed!
    echo  Opening download page...
    start "" "https://nodejs.org/en/download"
    echo.
    echo  Install Node.js, then run this script again.
    echo.
    pause
    exit /b 1
)
echo  Node.js found:
node --version

:: Check for updates from GitHub (only if git repo)
echo.
echo  [1/4] Checking for updates...
cd /d "%~dp0"
git rev-parse --git-dir >nul 2>nul
if %ERRORLEVEL% equ 0 (
    git fetch origin main >nul 2>nul
    for /f %%i in ('git rev-parse HEAD') do set LOCAL=%%i
    for /f %%i in ('git rev-parse origin/main 2^>nul') do set REMOTE=%%i
    if not "%LOCAL%"=="%REMOTE%" (
        echo  [UPDATE] New version available!
        echo.
        set /p DOUPDATE="  Do you want to update? (y/n): "
        if /i "%DOUPDATE%"=="y" (
            echo  Pulling latest changes...
            git pull origin main
            echo  Updated successfully!
            echo.
        ) else (
            echo  Skipping update.
            echo.
        )
    ) else (
        echo  Already up to date.
    )
) else (
    echo  Not a git repo - skipping update check.
    echo  (Tip: use "git clone" instead of downloading zip for auto-updates)
)

:: Install dependencies (always run to ensure everything is installed)
echo.
echo  [2/4] Installing dependencies...
echo  Installing server dependencies...
cd /d "%~dp0server"
call npm install --silent 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] Server npm install had issues, retrying...
    call npm install
)
echo  Installing client dependencies...
cd /d "%~dp0client"
call npm install --silent 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] Client npm install had issues, retrying...
    call npm install
)
cd /d "%~dp0"
echo  Dependencies ready.

:: Start server
echo.
echo  [3/4] Starting backend server...
start "OND Server" cmd /k "cd /d %~dp0server && node server.js"
timeout /t 2 >nul

:: Start client
echo  [4/4] Starting frontend...
start "OND Client" cmd /k "cd /d %~dp0client && npx vite"
timeout /t 5 >nul

:: Open browser
start "" "http://localhost:5173"

echo.
echo  ========================================
echo    OND is running!
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:3001
echo  ========================================
echo.
echo  Press any key to close this window.
echo  (The app will keep running in the other windows)
pause >nul
