@echo off
:: Keep window open if double-clicked
if "%~1"=="" cmd /k "%~f0" run
if "%~1"=="" exit /b
setlocal enabledelayedexpansion
title OND - Odyssey ^& Dragons
echo.
echo  ========================================
echo    OND - Odyssey ^& Dragons
echo    Your Local D^&D Companion
echo  ========================================
echo.

:: ─── Step 1: Check Node.js ───────────────────────────
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [SETUP] Node.js is not installed.
    echo  Opening download page...
    start "" "https://nodejs.org/en/download"
    echo.
    echo  Install Node.js LTS version.
    echo  After installing, press any key and this script will restart.
    echo.
    pause
    start "" "%~f0"
    exit /b 0
)

:: ─── Step 2: Check Git ───────────────────────────────
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [SETUP] Git is not installed.
    echo  Opening download page...
    start "" "https://git-scm.com/downloads"
    echo.
    echo  Install Git (use default settings).
    echo  After installing, press any key and this script will restart.
    echo.
    pause
    start "" "%~f0"
    exit /b 0
)

:: ─── Step 3: Clone repo if not present ───────────────
cd /d "%~dp0"
if not exist "%~dp0client" (
    if not exist "%~dp0server" (
        echo  [SETUP] App files not found. Downloading from GitHub...
        echo.
        git clone https://github.com/Newton667/Odyssey-and-Dungeons.git "%~dp0OND-App"
        if %ERRORLEVEL% neq 0 (
            echo.
            echo  [ERROR] Failed to download. Check your internet connection.
            pause
            exit /b 1
        )
        copy "%~f0" "%~dp0OND-App\start.bat" >nul 2>nul
        echo.
        echo  Download complete! Launching from OND-App folder...
        echo.
        cd /d "%~dp0OND-App"
        start "" "%~dp0OND-App\start.bat"
        exit /b 0
    )
)

:: ─── Step 4: Initialize git if downloaded as zip ─────
cd /d "%~dp0"
git rev-parse --git-dir >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [SETUP] Setting up git for auto-updates...
    git init >nul 2>nul
    git remote add origin https://github.com/Newton667/Odyssey-and-Dungeons.git >nul 2>nul
    git fetch origin main >nul 2>nul
    git reset --mixed origin/main >nul 2>nul
    git branch -M main >nul 2>nul
    git branch --set-upstream-to=origin/main main >nul 2>nul
    echo  Git initialized. Auto-updates will work from now on.
    echo.
)

:: ─── Step 5: Check for updates ───────────────────────
echo  [1/4] Checking for updates...
git fetch origin main >nul 2>nul
for /f %%i in ('git rev-parse HEAD 2^>nul') do set LOCAL=%%i
for /f %%i in ('git rev-parse origin/main 2^>nul') do set REMOTE=%%i
if not "!LOCAL!"=="!REMOTE!" (
    if not "!REMOTE!"=="" (
        echo  [UPDATE] New version available!
        echo.
        set /p DOUPDATE="  Do you want to update? (y/n): "
        if /i "!DOUPDATE!"=="y" (
            echo  Pulling latest changes...
            git pull origin main
            echo  Updated successfully!
            echo.
        ) else (
            echo  Skipping update.
            echo.
        )
    )
) else (
    echo  Already up to date.
)

:: ─── Step 6: Install dependencies ────────────────────
echo.
echo  [2/4] Installing dependencies...
echo  Server...
cd /d "%~dp0server"
call npm install --silent 2>nul
echo  Client...
cd /d "%~dp0client"
call npm install --silent 2>nul
cd /d "%~dp0"
echo  Dependencies ready.

:: ─── Step 7: Start server ────────────────────────────
echo.
echo  [3/4] Starting backend server...
start "OND Server" cmd /k "cd /d %~dp0server && node server.js"
timeout /t 2 >nul

:: ─── Step 8: Start client ────────────────────────────
echo  [4/4] Starting frontend...
start "OND Client" cmd /k "cd /d %~dp0client && npx vite"
timeout /t 5 >nul

:: ─── Open browser ────────────────────────────────────
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
