@echo off
setlocal enabledelayedexpansion
title OND Launcher
echo.
echo  ========================================
echo    OND - Odyssey and Dragons
echo    Your Local DnD Companion
echo  ========================================
echo.

:START
:: ─── Check Node.js ──────────────────────────────────
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [SETUP] Node.js is not installed.
    echo  Opening download page...
    start "" "https://nodejs.org/en/download"
    echo.
    echo  Install Node.js LTS, then press any key to continue.
    pause
    echo.
    goto START
)

:: ─── Check Git ──────────────────────────────────────
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [SETUP] Git is not installed.
    echo  Opening download page...
    start "" "https://git-scm.com/downloads"
    echo.
    echo  Install Git with default settings, then press any key to continue.
    pause
    echo.
    goto START
)

:: ─── Check if app files exist ───────────────────────
cd /d "%~dp0"
if not exist "%~dp0client" if not exist "%~dp0server" (
    echo  [SETUP] App files not found. Downloading...
    echo.
    git clone https://github.com/Newton667/Odyssey-and-Dungeons.git "%~dp0OND-App"
    if %ERRORLEVEL% neq 0 (
        echo.
        echo  [ERROR] Download failed. Check your internet.
        echo  Press any key to retry...
        pause
        goto START
    )
    copy "%~f0" "%~dp0OND-App\start.bat" >nul 2>nul
    echo.
    echo  Download complete! Launching from OND-App...
    cd /d "%~dp0OND-App"
    goto START
)

:: ─── Init git if needed ─────────────────────────────
cd /d "%~dp0"
git rev-parse --git-dir >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [SETUP] Setting up auto-updates...
    git init >nul 2>nul
    git remote add origin https://github.com/Newton667/Odyssey-and-Dungeons.git >nul 2>nul
    git fetch origin main >nul 2>nul
    git reset --mixed origin/main >nul 2>nul
    git branch -M main >nul 2>nul
    git branch --set-upstream-to=origin/main main >nul 2>nul
    echo  Done. Auto-updates enabled.
    echo.
)

:: ─── Check for updates ──────────────────────────────
echo  [1/4] Checking for updates...
git fetch origin main >nul 2>nul
for /f %%i in ('git rev-parse HEAD 2^>nul') do set LOCAL=%%i
for /f %%i in ('git rev-parse origin/main 2^>nul') do set REMOTE=%%i
if "!LOCAL!"=="!REMOTE!" (
    echo  Already up to date.
) else if "!REMOTE!"=="" (
    echo  Already up to date.
) else (
    echo  [UPDATE] New version available!
    echo.
    set /p DOUPDATE="  Do you want to update? (y/n): "
    if /i "!DOUPDATE!"=="y" (
        git reset --hard origin/main >nul 2>nul
        git pull origin main
    )
)

:: ─── Install dependencies ───────────────────────────
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

:: ─── Start server ───────────────────────────────────
echo.
echo  [3/4] Starting backend server...
start "OND Server" cmd /k "cd /d "%~dp0server" && node server.js"
timeout /t 2 >nul

:: ─── Start client ───────────────────────────────────
echo  [4/4] Starting frontend...
start "OND Client" cmd /k "cd /d "%~dp0client" && npx vite"
timeout /t 5 >nul

:: ─── Open browser ───────────────────────────────────
start "" "http://localhost:5173"
echo.
echo  ========================================
echo    OND is running!
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:3001
echo  ========================================
echo.
echo  Close this window anytime.
echo  The app runs in the other windows.
echo.
echo  Press any key to exit this launcher...
pause >nul
