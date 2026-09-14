@echo off
setlocal enabledelayedexpansion
title OND Launcher
set "REPO_URL=https://github.com/Newton667/Odyssey-and-Dungeons.git"
if defined OND_REPO_URL set "REPO_URL=%OND_REPO_URL%"
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
if exist "%~dp0client" goto APP_PRESENT
if exist "%~dp0server" goto APP_PRESENT
if exist "%~dp0OND-App\client" goto HANDOFF
echo  [SETUP] App files not found. Downloading...
echo.
git clone "!REPO_URL!" "%~dp0OND-App"
if !ERRORLEVEL! neq 0 (
    echo.
    echo  [ERROR] Download failed. Check your internet.
    echo  Press any key to retry...
    pause >nul
    goto START
)
:HANDOFF
if not exist "%~dp0OND-App\start.bat" copy "%~f0" "%~dp0OND-App\start.bat" >nul 2>nul
echo.
echo  Launching the app from OND-App...
start "OND Launcher" /D "%~dp0OND-App" "%~dp0OND-App\start.bat"
:DELETE_ME
echo.
echo  ========================================
echo    The app has been downloaded to:
echo    %~dp0OND-App
echo.
echo    You can delete this start.bat now.
echo    From now on, run OND-App\start.bat
echo.
echo    (Close this window when you're done.)
echo  ========================================
timeout /t 3 /nobreak >nul
goto DELETE_ME
:APP_PRESENT

:: ─── Mark directory as safe for git ────────────────
cd /d "%~dp0"
git config --global --add safe.directory "%cd:\=/%"  >nul 2>nul

:: ─── Init git if needed ─────────────────────────────
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
:: Only offer an update when HEAD is strictly BEHIND origin/main. When HEAD is ahead or has
:: diverged, `git reset --hard origin/main` would silently drop local commits that are not on
:: GitHub. Each check sits on its own line with goto labels, so ERRORLEVEL is read at run time.
echo  [1/4] Checking for updates...
git fetch origin main >nul 2>nul
set "LOCAL="
set "REMOTE="
set "BEHIND=0"
for /f %%i in ('git rev-parse --verify --quiet HEAD 2^>nul') do set LOCAL=%%i
for /f %%i in ('git rev-parse --verify --quiet origin/main 2^>nul') do set REMOTE=%%i
if "!LOCAL!"=="" goto UPDATE_NONE
if "!REMOTE!"=="" goto UPDATE_NONE
if "!LOCAL!"=="!REMOTE!" goto UPDATE_NONE
git merge-base --is-ancestor HEAD origin/main >nul 2>nul
if !ERRORLEVEL! neq 0 goto UPDATE_LOCAL_COMMITS
for /f %%i in ('git rev-list --count HEAD..origin/main 2^>nul') do set BEHIND=%%i
if !BEHIND! gtr 0 goto UPDATE_OFFER
:UPDATE_LOCAL_COMMITS
echo  [UPDATE] Skipped: this folder has local commits that are not on GitHub.
goto UPDATE_DONE
:UPDATE_NONE
echo  Already up to date.
goto UPDATE_DONE
:UPDATE_OFFER
echo  [UPDATE] New version available!
echo.
set "DOUPDATE="
set /p DOUPDATE="  Do you want to update? (y/n): "
if /i "!DOUPDATE!"=="y" (
    git reset --hard origin/main >nul 2>nul
    git pull origin main
    :: The update just rewrote THIS file. cmd.exe resumes a running .bat by byte offset, so
    :: continuing here would execute whatever now sits at the old offset. Relaunch the fresh
    :: file from the top and let this window close instead.
    echo.
    echo  Updated. Restarting the launcher...
    start "OND Launcher" /D "%~dp0" "%~f0"
    exit
)
:UPDATE_DONE

:: ─── Install dependencies ───────────────────────────
echo.
echo  [2/4] Installing dependencies...
call node "%~dp0scripts\ensure-deps.js"
if !ERRORLEVEL! neq 0 (
    echo  [ERROR] Dependency install failed. See messages above.
    pause
    exit /b 1
)
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
