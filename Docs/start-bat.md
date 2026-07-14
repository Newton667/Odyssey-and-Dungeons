# start.bat Reference

## Purpose
Windows batch launcher that handles first-time setup, dependency installation, auto-updates, and starting both servers.

## Flow

```
User double-clicks start.bat
│
├─ Check Node.js installed?
│  └─ No → Open nodejs.org, wait for install, relaunch script
│
├─ Check Git installed?
│  └─ No → Open git-scm.com, wait for install, relaunch script
│
├─ Check if app files exist (server/, client/ dirs)?
│  └─ No → git clone repo into OND-App/ subfolder
│          Copy start.bat into OND-App/
│          Relaunch from OND-App/
│
├─ Check for updates (git fetch origin main)
│  ├─ Update available → Ask user y/n
│  │  └─ Yes → git reset --hard origin/main, relaunch
│  └─ Up to date → Continue
│
├─ Install dependencies (always runs npm install in both server/ and client/)
│
├─ Start Express server (node server.js) in new window
├─ Wait 2 seconds for server startup
├─ Start Vite dev server (npx vite) in new window
├─ Wait 5 seconds, then open browser to http://localhost:5173
│
└─ Launcher window shows status and waits for keypress to exit
    Server and client run in their own windows
```

## Key Features
- **Self-bootstrapping**: Can clone the entire repo from just the bat file
- **Auto-updates**: Checks GitHub for new commits on every launch
- **Safe directory**: Adds git safe.directory config to avoid Windows permission errors
- **Never closes**: Wraps everything in error handling so the window stays open for debugging
- **Relaunch pattern**: After installing Node/Git, uses `goto START` loop to retry checks

## For Users
1. Download `start.bat` from the repo (or receive from DM)
2. Double-click it
3. Follow prompts to install Node.js and Git if needed
4. App opens at http://localhost:5173

## For Developers
- Edit `start.bat` at project root
- Test by running it from a folder without Node/Git to simulate first-time user
- The git clone URL is hardcoded — update if repo URL changes
