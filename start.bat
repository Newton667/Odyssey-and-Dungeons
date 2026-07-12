@echo off
setlocal enabledelayedexpansion
title OND Launcher
echo.
echo  ========================================
echo    OND - Odyssey and Dragons
echo    Your Local DnD Companion
echo  ========================================
echo.

:: ─── Check Node.js ──────────────────────────────────
where node >nul 2>nul
if %ERRORLEVEL% neq 0 goto NEED_NODE

:: ─── Check Git ──────────────────────────────────────
where git >nul 2>nul
if %ERRORLEVEL% neq 0 goto NEED_GIT

:: ─── Check if app files exist ───────────────────────
cd /d "%~dp0"
if not exist "%~dp0client" if not exist "%~dp0server" goto NEED_CLONE

:: ─── Init git if needed ─────────────────────────────
cd /d "%~dp0"
git rev-parse --git-dir >nul 2>nul
if %ERRORLEVEL% neq 0 goto INIT_GIT

:CHECK_UPDATES
:: ─── Check for updates ──────────────────────────────
echo  [1/4] Checking for updates...
git fetch origin main >nul 2>nul
for /f %%i in ('git rev-parse HEAD 2^>nul') do set LOCAL=%%i
for /f %%i in ('git rev-parse origin/main 2^>nul') do set REMOTE=%%i
if "!LOCAL!"=="!REMOTE!" goto UP_TO_DATE
if "!REMOTE!"=="" goto UP_TO_DATE
echo  [UPDATE] New version available!
echo.
set /p DOUPDATE="  Do you want to update? (y/n): "
if /i "!DOUPDATE!"=="y" git pull origin main
goto INSTALL_DEPS

:UP_TO_DATE
echo  Already up to date.

:INSTALL_DEPS
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
pause >nul
goto :EOF

:: ═══════════════════════════════════════════════════════
:: SETUP ROUTINES
:: ═══════════════════════════════════════════════════════

:NEED_NODE
echo  [SETUP] Node.js is not installed.
echo  Opening download page...
start "" "https://nodejs.org/en/download"
echo.
echo  Install Node.js LTS, then press any key.
pause >nul
echo  Restarting...
start "" "%~f0"
goto :EOF

:NEED_GIT
echo  [SETUP] Git is not installed.
echo  Opening download page...
start "" "https://git-scm.com/downloads"
echo.
echo  Install Git with default settings, then press any key.
pause >nul
echo  Restarting...
start "" "%~f0"
goto :EOF

:NEED_CLONE
echo  [SETUP] App files not found. Downloading...
echo.
git clone https://github.com/Newton667/Odyssey-and-Dungeons.git "%~dp0OND-App"
if %ERRORLEVEL% neq 0 goto CLONE_FAIL
copy "%~f0" "%~dp0OND-App\start.bat" >nul 2>nul
echo.
echo  Download complete! Relaunching...
start "" "%~dp0OND-App\start.bat"
goto :EOF

:CLONE_FAIL
echo.
echo  [ERROR] Download failed. Check your internet.
pause >nul
goto :EOF

:INIT_GIT
echo  [SETUP] Setting up auto-updates...
git init >nul 2>nul
git remote add origin https://github.com/Newton667/Odyssey-and-Dungeons.git >nul 2>nul
git fetch origin main >nul 2>nul
git reset --mixed origin/main >nul 2>nul
git branch -M main >nul 2>nul
git branch --set-upstream-to=origin/main main >nul 2>nul
echo  Done. Auto-updates enabled.
echo.
goto CHECK_UPDATES
