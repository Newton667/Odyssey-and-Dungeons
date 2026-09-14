# start.bat / start.sh Reference

## Purpose
One-file launchers that handle first-time setup, dependency installation, auto-updates, and starting both servers. `start.bat` is the Windows launcher; `start.sh` is the Linux launcher and mirrors it step for step. Both call `scripts/ensure-deps.js` for dependencies, so one checkout on a shared disk can be used from either OS.

## Flow

```
User runs start.bat (double-click) / start.sh (./start.sh)
│
├─ Check Node.js installed?
│  └─ No → Open nodejs.org, wait for install, retry the check
│
├─ Check Git installed?
│  └─ No → Open git-scm.com, wait for install, retry the check
│
├─ Check if app files exist (server/, client/ dirs next to the launcher)?
│  └─ No → git clone repo into OND-App/ (skipped if OND-App/client already exists)
│          Copy the launcher into OND-App/ only if the clone lacks one
│          START the copy in OND-App/ — a real process hand-off, never cd + goto
│            bat: `start "OND Launcher" /D "…\OND-App" "…\OND-App\start.bat"` opens a new window,
│                 then the ORIGINAL window loops "You can delete this start.bat now" every 3 s
│                 (`:DELETE_ME`, paced by `timeout /t 3 /nobreak`) until the user closes it — deliberate
│            sh:  `exec bash OND-App/start.sh` replaces the process, so the message shows once
│
├─ Add git safe.directory for this folder (before any other git call)
├─ Init git if the folder has no .git (clone-less download)
│
├─ Check for updates (git fetch origin main)
│  ├─ HEAD ahead of / diverged from origin/main → "Skipped: local commits", no prompt
│  ├─ Update available (HEAD strictly behind: merge-base --is-ancestor + rev-list count > 0) → Ask user y/n
│  │  └─ Yes → git reset --hard origin/main, git pull, then
│  │           (bat only) relaunch the fresh start.bat in a new window and exit —
│  │           cmd.exe resumes a rewritten .bat by byte offset, so the old
│  │           process must not keep running. bash keeps the old file open, so
│  │           start.sh simply continues.
│  └─ Up to date → Continue
│
├─ Install dependencies: `node scripts/ensure-deps.js`
│    Wipes and reinstalls node_modules if it was built for another platform
│    (marker node_modules/.ond-platform, e.g. linux-x64 / win32-x64), then
│    `npm install --loglevel=error --no-audit --no-fund` in server/ and client/
│
├─ Start Express server (node server.js)
├─ Wait 2 seconds for server startup
├─ Start Vite dev server (npx vite)
├─ Wait 5 seconds, then open browser to http://localhost:5173
│
└─ bat: server and client run in their own windows; launcher waits for a keypress
   sh:  both run in the one terminal; Ctrl+C stops both
```

## Key Features
- **Self-bootstrapping**: Can clone the entire repo from just the launcher file
- **Auto-updates**: Checks GitHub for new commits on every launch, and only offers one when this copy is strictly behind `origin/main` — a checkout with unpushed commits is never `reset --hard`. Refs are read with `git rev-parse --verify --quiet` (without `--verify` a missing ref echoes the literal `origin/main`). In `start.bat` each check is its own line with `goto` labels, so `ERRORLEVEL` is read at run time
- **Platform-aware dependencies**: `scripts/ensure-deps.js` rebuilds `node_modules` when the OS/arch changes, so a folder set up on Windows works on Linux and back
- **Safe directory**: Adds git safe.directory config to avoid "dubious ownership" errors (Windows permissions, FUSE-mounted NTFS on Linux)
- **Never closes silently**: Every failure prints a message and waits, so the window stays open for debugging
- **Retry pattern**: After installing Node/Git, `start.bat` uses a `goto START` loop and `start.sh` a `while ! command -v …` loop to retry the checks
- **`OND_REPO_URL` override**: Both launchers clone from `OND_REPO_URL` when it is set (defaults to the GitHub repo) — for testing the bootstrap against a local repo

## Windows (`start.bat`)
- Run by double-clicking. Server and client open in their own `cmd` windows; the launcher window shows the URLs and waits for a keypress.
- **Standalone download**: after the clone, the outer window hands off to `OND-App\start.bat` in a new window and then repeats "You can delete this start.bat now" every 3 seconds until you close it. **This repetition is intentional** — it makes the outer window impossible to mistake for a stalled download. The app keeps running in the other windows when the outer one is closed. Double-clicking the outer `start.bat` again later does not re-download; it hands off again.
- If you already had an older standalone `start.bat`, download it once more; the copy inside `OND-App` is kept current by the update check.

## Linux (`start.sh`)
- `chmod +x start.sh && ./start.sh` (or `bash start.sh`). Same steps as Windows.
- Both servers run in the one terminal you launched from; **Ctrl+C stops both** (a `trap` kills the server and client processes and then the whole process group, so Vite's child goes too).
- The browser is opened with `xdg-open` (falls back to `open` on macOS, otherwise prints the URL).
- `read` prompts replace `pause`; the Node/Git checks loop until the tool is found.
- The bootstrap message shows once, then `exec` replaces the outer script with `OND-App/start.sh`.
- Distro hints for missing tools: `sudo dnf install nodejs npm` / `sudo apt install nodejs npm`.

## Linux desktop entry (`OND.desktop`)
- `OND.desktop` at the repo root opens a terminal (`Terminal=true`, so KDE uses Konsole) and runs `scripts/ond-desktop.sh`. Double-click it in the file manager, or copy/symlink it into `~/.local/share/applications/` to get it in the app menu.
- `scripts/ond-desktop.sh` exists because a desktop entry is started by the session, not a login shell: nothing from `~/.bashrc` is on PATH, so nvm's Node.js is missing and `start.sh` would loop on "Node.js is not installed". The wrapper sources `$NVM_DIR/nvm.sh` when `node` is not already on PATH, `cd`s to the repo root (found relative to itself, so the script is relocatable), then `exec`s `start.sh`. From there the flow is exactly the Linux launcher above, including the update prompt.
- The `.desktop` file itself holds **absolute paths** (`Path=`, `Exec=`, `Icon=`) — the desktop entry spec resolves `Exec` against PATH, not against the file's own folder, so they cannot be relative. If the checkout moves, edit those three lines. `desktop-file-validate OND.desktop` checks the syntax.
- Icon: `client/public/assets/ond-icon.png` (a d20, 256px). The same file is the app's favicon (`<link rel="icon">` in `client/index.html`), so Windows users see the logo in the browser tab even though `start.bat` itself cannot carry an icon. The SVG next to it is the editable source; KDE showed a blank icon when `Icon=` pointed at the SVG directly, even though the file renders fine in Inkscape, so the `.desktop` uses the PNG. Regenerate after editing the SVG: `python3 -c "import cairosvg; cairosvg.svg2png(url='client/public/assets/ond-icon.svg', write_to='client/public/assets/ond-icon.png', output_width=256, output_height=256)"`.
- Both `OND.desktop` and `scripts/ond-desktop.sh` have their executable bit set in the index (`git update-index --chmod=+x`), same as `start.sh`.

## For Users
1. Download `start.bat` (Windows) or `start.sh` (Linux) from the repo (or receive from DM)
2. Run it
3. Follow prompts to install Node.js and Git if needed
4. App opens at http://localhost:5173

## For Developers
- Edit `start.bat` / `start.sh` at project root; keep the steps in the same order in both
- Dependencies go through `node scripts/ensure-deps.js` — never add a bare `npm install` to a launcher (it would not fix a `node_modules` built for the other OS)
- `.gitattributes` pins `start.sh` to LF (`text eol=lf`) and `start.bat` to CRLF on checkout (`text eol=crlf`). The LF pin is load-bearing: a Windows checkout with `autocrlf=true` would otherwise write a CRLF `start.sh` onto a shared disk and bash fails with `$'\r': command not found`. The `start.bat` blob stays LF in the repo; `eol=crlf` only affects checkouts. **Known limit:** the standalone `start.bat` downloaded from GitHub's raw view is the LF blob byte-for-byte — that is the file that runs the `:DELETE_ME` loop, and it has worked that way for the existing `goto START` retries too
- The executable bit on `start.sh` is set in the index with `git update-index --chmod=+x start.sh` — this checkout has `core.filemode=false` (NTFS mount), so a working-tree `chmod +x` is invisible to git. Check with `git ls-files -s start.sh` (`100755`)
- Test the bootstrap by copying **only** the launcher into an empty folder and running it: expect one clone, the hand-off box, and the inner launcher continuing to `[1/4] Checking for updates…`; run it again and expect no second clone. Until your changes are pushed, point `OND_REPO_URL` at a repo that contains them (`git clone <local path>` clones HEAD, not the working tree)
- Test the "first-time user" path by running from a machine/folder without Node/Git
- The default clone URL is set once at the top of each launcher (`REPO_URL`); the `git remote add origin …` in the git-init block is a second copy — update both if the repo URL changes
- Batch traps that caused the old infinite "Downloading… / Download complete!" loop: `%VAR%` inside a `( … )` block is expanded when the block is parsed (use `!VAR!` or `goto` labels), and `%~dp0` never changes (you cannot `cd` + `goto` to "relaunch from another folder"). See `known-patterns-and-gotchas.md`
