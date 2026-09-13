# Cross-Platform Launcher and Platform-Aware Dependencies

**Status:** Done
**Created:** 2026-09-13
**Plan review:** 2026-09-13 — APPROVED WITH FIXES (0 blocking). Applied: copy the launcher into `OND-App` only when missing (no downgrade of the clone's tracked copy); `OND_REPO_URL` override in both launchers so the bootstrap gates can run before the branch is pushed; `npm install --loglevel=error --no-audit --no-fund` instead of `--silent`; `rmSync` with retries inside `try/catch` and a "close any running OND windows" message; `--check` prints per-directory status so Verify #1 asserts on text; `exec` inside the `start.sh` subshells plus `kill 0` in the trap; macOS-gated `open` fallback; documented that `.gitattributes` cannot reach the raw-download `start.bat`; CHANGELOG tells holders of the old standalone `start.bat` to re-download once.
**Revised:** 2026-09-13 — user decision: the outer `start.bat` must **repeat** the "you can delete this start.bat now" message (a paced `:DELETE_ME` loop after a single `start … /D` hand-off), not print it once and exit. Increment 2, its Verify steps, the CHANGELOG entry, the `start-bat.md` wording and gotcha #3 were updated to match. `start.sh` keeps a single message because `exec` replaces the process (see Increment 3).
**Scope:** Makes one checkout of OND runnable from both Windows and Linux (dev, test and build), adds a Linux `start.sh` with the same bootstrap/update/install/launch behaviour as `start.bat`, and fixes the infinite "Downloading… / Download complete!" loop that `start.bat` falls into when it self-bootstraps into `OND-App/`. Does **not** touch the React app, the Express routes (the `/api/pull-update` endpoint keeps its plain `npm install`), packaging (no Electron/installer), or macOS support beyond a free `open` fallback in `start.sh`.

## Goal

A player or developer on Linux gets a `start.sh` that does exactly what `start.bat` does on Windows: check Node and Git, clone the app into `OND-App/` when run standalone, offer updates, install dependencies, start both servers and open the browser. The same checkout can be used from Windows one day and Linux the next (this repo lives on a shared NTFS partition, `/mnt/Stuff`) without `vite`, `vitest` or `vite build` dying on a missing native binary. And a Windows user who downloads only `start.bat` sees one message repeated until they close the window — the app has been downloaded, you can delete this `start.bat` — while the copy inside `OND-App/` takes over in its own window, instead of the terminal filling with repeated clone errors. **The repetition is deliberate** (user decision): the outer window should be impossible to misread as "still working" or "still needed".

## Current state

### The `node_modules` tree is platform-specific, and this checkout is currently Windows-flavoured

- `client/node_modules/@rollup/` contains **only** `rollup-win32-x64-gnu` and `rollup-win32-x64-msvc` (`file` confirms both are `PE32+ … MS Windows` DLLs); `client/node_modules/@esbuild/` contains only `win32-x64`. There is no Linux binary at all.
- Consequence on Linux, verified today: `node -e "require('rollup')"`, `import('vite')` and `import('vitest/node')` all throw `Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try npm i again after removing both package-lock.json and node_modules directory.` So `npx vite`, `npx vite build` and `npx vitest run` are all broken on Linux until `node_modules` is rebuilt — the exact remedy rollup's own error message recommends.
- The lockfiles are fine: `client/package-lock.json` is `lockfileVersion: 3` and already contains `node_modules/@esbuild/linux-x64` (`:577`), `@esbuild/win32-x64` (`:730`), `@rollup/rollup-linux-x64-gnu` (`:1051`) and `@rollup/rollup-win32-x64-msvc` (`:1149`) — 25 `@rollup/rollup-*` entries in total. Both lockfiles are tracked (`git ls-files` lists `client/package-lock.json` and `server/package-lock.json` despite the `package-lock.json` line in `.gitignore:10`; they were added before/around the ignore). Nothing in the lockfile needs to change; only the installed tree does.
- `server/node_modules` has no native modules (express, mongoose, cors, dotenv, multer), so the server runs on either OS today. Its `.bin` still carries Windows `.cmd`/`.ps1` shims, which are harmless.
- Root `package.json:10` — `"postinstall": "cd server && npm install && cd ../client && npm install"` — is the "Manual setup (any OS)" path documented in `README.md:31-40`. It does nothing about a stale foreign-platform tree.
- `server/server.js:81-91` (`POST /api/pull-update`) runs `npm install --silent` in both folders after a pull. It runs in-process on whatever OS the server is already on, so a platform switch cannot happen there; left as is.

### Filesystem facts that shape the Linux launcher

- The repo is on `/dev/nvme0n1p2 … type fuseblk` (NTFS via FUSE) and `git config core.filemode` is `false`. Every file shows as `-rwxr-xr-x` regardless of what git thinks, so a `chmod +x start.sh` will **not** be recorded — the executable bit must be staged with `git update-index --chmod=+x`.
- No `.gitattributes` exists and `core.autocrlf` is unset on this Linux side. Git for Windows defaults to `autocrlf=true`, so if the Windows side ever checks out `start.sh` it will land on the shared disk with CRLF endings and bash will fail with `$'\r': command not found`. `start.bat` is stored LF in the repo (`od -c` finds no `\r`), which is what Windows users currently get converted by autocrlf.

### `start.bat` bootstrap loop (the "spam")

`start.bat:38-56`:

```bat
:: ─── Check if app files exist ───────────────────────
cd /d "%~dp0"
if not exist "%~dp0client" if not exist "%~dp0server" (
    echo  [SETUP] App files not found. Downloading...
    echo.
    git clone https://github.com/Newton667/Odyssey-and-Dungeons.git "%~dp0OND-App"
    if %ERRORLEVEL% neq 0 (
        ...
        goto START
    )
    copy "%~f0" "%~dp0OND-App\start.bat" >nul 2>nul
    echo.
    echo  Download complete! Launching from OND-App...
    cd /d "%~dp0OND-App"
    goto START
)
```

Two batch-language traps combine into an infinite loop:

1. **`%~dp0` is the directory of the script file, not the current directory.** It never changes. `cd /d "%~dp0OND-App"` (`:54`) followed by `goto START` (`:55`) re-enters the check at `:39`, which does `cd /d "%~dp0"` — straight back to the original folder — and `:40` finds no `client`/`server` there again, so it clones again.
2. **`%ERRORLEVEL%` inside a parenthesised block is expanded when the block is parsed**, i.e. before `git clone` runs, so `:44` always compares the pre-block value (`0` from `cd`). `setlocal enabledelayedexpansion` is on (`:2`) but the script uses `%ERRORLEVEL%` rather than `!ERRORLEVEL!`. The "Download failed" branch is therefore unreachable.

Second pass: `git clone` refuses (`fatal: destination path 'OND-App' already exists and is not an empty directory`), the failure is not detected, `copy` runs again, "Download complete! Launching from OND-App..." prints again, `goto START` — forever, with no `pause`. That is the terminal spam the user sees. The app *was* cloned correctly on the first pass; only the hand-off is broken.

The checks at `:14` and `:27` are **not** affected: there `%ERRORLEVEL%` is on the `if` line itself, evaluated after `where` has run.

### Related documentation

- `Docs/known-patterns-and-gotchas.md:216-217` "Git Safe Directory" — `safe.directory` must be added before any git operation (the server does it at `server/server.js:64-66`; `start.bat:60` does it too). Keep this in `start.sh`; a FUSE-mounted NTFS partition is exactly where "dubious ownership" appears on Linux.
- `Docs/start-bat.md` documents the Windows flow only. `Docs/architecture.md:8` and `:34`, `README.md:21`, `:25-27`, `:78`, `:93` all say "Windows start.bat launcher".

## Approach

**One cross-platform dependency script, called by both launchers and by root `npm install`.** Add `scripts/ensure-deps.js` (plain CommonJS, Node built-ins only — no dependencies, since it runs before anything is installed). For each of `server/` and `client/` it compares a marker file `node_modules/.ond-platform` (content `process.platform + '-' + process.arch`, e.g. `linux-x64` / `win32-x64`) against the running platform; if the marker is missing or differs and `node_modules` exists, it deletes `node_modules` with `fs.rmSync(..., { recursive: true, force: true })`, then runs `npm install`, then writes the marker. Both launchers replace their inline `npm install` steps with `node scripts/ensure-deps.js`, and root `package.json`'s `postinstall` does the same, so `npm install` at the root — the documented manual path — also heals a foreign-platform tree. The marker lives inside `node_modules`, which is already gitignored and is deleted together with the tree, so it can never go stale on its own.

**Why a wipe rather than a targeted install.** The lockfile already lists both platforms' optional binaries, so `npm install` on Linux *might* add `@rollup/rollup-linux-x64-gnu` next to the Windows ones — but npm also prunes packages that fail the current platform's `os`/`cpu` check as extraneous, and npm/cli#4828 is precisely the class of case where an existing foreign `node_modules` + lockfile leaves the current platform's optional dep uninstalled. Wiping is deterministic, is what rollup's error text prescribes, only happens on an actual platform switch, and is implemented once in Node instead of twice in batch and bash.

**Bootstrap hand-off.** In `start.bat`, replace the `cd` + `goto START` relaunch with a real process hand-off: after the clone (checked with `!ERRORLEVEL!`), copy the script into `OND-App\`, print the "downloaded — you can delete this start.bat" message, `start` the copy in `OND-App` (so its own `%~dp0` is `OND-App\`), and exit the original script. Also short-circuit when `OND-App\client` already exists (a user double-clicking the outer `start.bat` again) so it hands off without cloning. `start.sh` gets the same shape using `exec`, which replaces the process and therefore cannot loop.

**Alternatives considered.**
- *Per-platform marker logic duplicated in batch and bash* — rejected; batch quoting for `for /f` + `node -p` is a trap, and two implementations drift.
- *Adding `@rollup/rollup-linux-x64-gnu` / `@esbuild/linux-x64` etc. as explicit `optionalDependencies`* — rejected; they are already in the lockfile, and it does not address the pruning of the other platform's binaries or the stale-tree case.
- *Running both launchers through root `npm run dev` (concurrently)* — rejected for the launchers; they must work before root `node_modules` exists and users are used to the two-window layout on Windows. `start.sh` runs both processes in one terminal with a trap, which is the Linux-idiomatic equivalent.

## Increments

### Increment 1: `scripts/ensure-deps.js` — platform-aware dependency install
**Status:** not active
**What:** Add a dependency-free Node script that wipes `node_modules` when it was built for another platform, runs `npm install` in `server/` and `client/`, and writes a platform marker. Wire it into root `package.json` as the `postinstall` and as an explicit `deps` script.
**Where:**
- `scripts/ensure-deps.js` — **new file** (repo has no `scripts/` directory today; verified with `ls`).
- `package.json:10` — `"postinstall": "cd server && npm install && cd ../client && npm install"` → `"postinstall": "node scripts/ensure-deps.js"`; add `"deps": "node scripts/ensure-deps.js"` next to `"dev"` (`:8`).
**Details:**
- CommonJS (`require`), no `"type": "module"` at root so `.js` is CJS. Uses only `fs`, `path`, `child_process`, `os`.
- `const ROOT = path.join(__dirname, '..');` `const PLATFORM = \`${process.platform}-${process.arch}\`;` `const MARKER = '.ond-platform';`
- `for (const dir of ['server', 'client'])`:
  1. `const nm = path.join(ROOT, dir, 'node_modules'); const markerPath = path.join(nm, MARKER);`
  2. `const existing = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf8').trim() : null;`
  3. If `fs.existsSync(nm) && existing !== PLATFORM` → log `[deps] ${dir}/node_modules was built for ${existing ?? 'an unknown platform'}, rebuilding for ${PLATFORM}…` and `fs.rmSync(nm, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 })` **inside a `try/catch`**; on failure print `[deps] Could not remove ${dir}/node_modules — close any running OND windows and run the launcher again.` and `process.exit(1)`. (On Windows the first launch after this ships wipes an in-use tree if the previous "OND Client" window is still serving Vite — `esbuild.exe` holds files open and `rmSync` throws `EBUSY`/`EPERM`; the user must see an instruction, not a stack trace. A missing marker on an existing tree counts as foreign — see Risks for the one-time cost.)
  4. `const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--loglevel=error', '--no-audit', '--no-fund'], { cwd: path.join(ROOT, dir), stdio: 'inherit', shell: process.platform === 'win32' });` — `shell: true` on Windows is required for `.cmd` resolution under Node ≥ 18.20 / 20.12 (`spawn EINVAL` otherwise). **Not `--silent`**: that is `--loglevel=silent` and hides npm's own error report (ENOTFOUND, EACCES, EBUSY…), so the launchers' "See messages above" would point at nothing. `--loglevel=error` is quiet on success and prints the error on failure. If `r.status !== 0` → `console.error` and `process.exit(r.status || 1)` so the launchers can detect failure.
  5. `fs.mkdirSync(nm, { recursive: true }); fs.writeFileSync(markerPath, PLATFORM + '\n');`
- Accept an optional `--check` flag that only reports (`exit 0` if all markers match, `1` otherwise) without installing — cheap, and gives the `Verify:` line below something deterministic to assert. It prints one line per directory, e.g. `[deps] client: no marker (want linux-x64)`, `[deps] client: built for win32-x64 (want linux-x64)`, or `[deps] client OK (linux-x64)`, so a gate can assert on the text and not just the exit code (a bare `node <missing file>` also exits 1).
- Do **not** delete `package-lock.json` (rollup's message suggests it, but the tracked lockfile is complete and deleting it would resolve fresh versions).
- Print one line per directory on the happy path (`[deps] client OK (linux-x64)`) so the launcher output stays quiet.
**Verify:**
1. `node scripts/ensure-deps.js --check` from the repo root exits `1` before install **and** its output contains `no marker` for both `server` and `client` — check with `node scripts/ensure-deps.js --check; echo $?` and `grep`. (Exit code alone is not enough: a missing script file also exits 1.)
2. `node scripts/ensure-deps.js` completes; then `cat client/node_modules/.ond-platform` prints `linux-x64`, `ls client/node_modules/@rollup/` lists `rollup-linux-x64-gnu`, and `cd client && node -e "require('rollup'); console.log('ok')"` prints `ok` (this exact command fails today).
3. `cd client && npx vitest run` passes (six test files under `client/src/**/*.test.js`; all currently fail to even start on Linux).
4. Simulate a platform switch: `echo win32-x64 > client/node_modules/.ond-platform && node scripts/ensure-deps.js` — output must include `rebuilding for linux-x64`, and afterwards the marker reads `linux-x64` again.
5. `grep -n "postinstall\|\"deps\"" package.json` shows both scripts pointing at `scripts/ensure-deps.js`; `grep -rn "cd server && npm install" package.json` returns nothing.

### Increment 2: `start.bat` — clean hand-off to `OND-App\start.bat`, and use `ensure-deps.js`
**Status:** not active
**What:** Replace the `cd` + `goto START` relaunch with a real process hand-off followed by a **deliberate message loop** ("you can delete this start.bat now", repeated every few seconds until the window is closed), fix the stale `%ERRORLEVEL%`, skip the clone when `OND-App` already holds the app, and replace the inline `npm install` block with a call to `scripts\ensure-deps.js`.
**Where:**
- `start.bat:38-56` — the "Check if app files exist" block (rewritten).
- `start.bat:95-105` — the "Install dependencies" block (replaced).
**Details:**
- Rewrite `:38-56` with `goto` labels instead of a parenthesised block, so no `ERRORLEVEL` is evaluated at parse time:

  ```bat
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
  ```

  - Preserves the original semantics: clone only when **both** `client` and `server` are missing (`:40`).
  - `start … /D "%~dp0OND-App" "…\start.bat"` launches the copy as a separate `cmd` whose own `%~dp0` is `OND-App\`, so its checks see `client`/`server` and it proceeds to the normal flow. The outer script never re-enters `:START` after a clone.
  - **The `:DELETE_ME` loop is intentional, not a bug.** The user asked for the message to repeat so nobody can mistake the outer window for a stalled download or a window that still matters. The `start` line runs **once, before** the loop, so the inner launcher is spawned exactly one time; the loop only prints. `timeout /t 3 /nobreak` keeps the repetition readable and stops the loop from pegging a CPU core (`timeout` is available on every supported Windows; `>nul` hides its countdown). There is no `pause` and no `exit /b` on this path — the window closes when the user closes it, and the inner launcher is a separate process so closing the outer window does not stop the app.
  - `if exist "%~dp0OND-App\client" goto HANDOFF` handles the user who double-clicks the outer `start.bat` again later: no second clone, same message loop, same hand-off.
  - **Copy only when the target is missing.** `start.bat` is tracked upstream, so the clone already contains the current launcher; unconditionally copying the downloaded file over it would replace HEAD's launcher with whatever (possibly older) version the user downloaded and dirty the working tree — and the update check only runs `git reset --hard` when `LOCAL != REMOTE`, which is false right after a clone, so the downgrade would persist until the next upstream commit. The `if not exist` guard keeps the clone's copy and only fills the gap for a repo that somehow lacks one.
  - `REPO_URL` is a variable, not a literal: `set "REPO_URL=https://github.com/Newton667/Odyssey-and-Dungeons.git"` then `if defined OND_REPO_URL set "REPO_URL=%OND_REPO_URL%"` near the top of the file, and `git clone "!REPO_URL!" "%~dp0OND-App"`. This lets the bootstrap be tested against a local checkout before the branch is pushed (the same override exists in `start.sh`).
- Replace `:95-105` with:

  ```bat
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
  ```

  (`call` is not strictly needed for `node`, but keeps the existing `call npm …` habit and is harmless.) `!ERRORLEVEL!` here is on its own line after `call`, so `%ERRORLEVEL%` would also be correct; use `!…!` for consistency.
- Leave `:11-36` (Node/Git checks), `:58-93` (safe.directory, git init, update check) and `:107-131` (start server/client, browser) untouched.
- Preserve LF line endings in the committed file (Increment 3's `.gitattributes` decides the checkout form).
**Verify:**
1. `grep -n "goto START" start.bat` lists only the Node-missing (`:22`), Git-missing (`:35`) and clone-failed retries — **no** `goto START` after the `copy` line.
2. `grep -n "%ERRORLEVEL%" start.bat` shows no occurrence inside a `( … )` block; `grep -n "cd /d \"%~dp0OND-App\"" start.bat` returns nothing.
3. `grep -n "npm install" start.bat` returns nothing; `grep -n "ensure-deps" start.bat` returns the one `call node` line.
4. `grep -n "goto DELETE_ME" start.bat` returns exactly one line, and `grep -n 'start "OND Launcher"' start.bat` returns exactly one line that appears **before** the `:DELETE_ME` label (the launcher is spawned once; only the message repeats). `grep -n "git clone" start.bat` returns one line that appears **before** `:HANDOFF`.
5. Manual on Windows (no Windows box is available in this environment; `wine` exists at `/usr/bin/wine` but its `cmd.exe` does not implement `where`/`for /f` faithfully, so it is **not** a gate). **Until the branch is pushed, `origin/main` has no `scripts/` directory, so a real GitHub clone would fail at the dependency step** — test with `set OND_REPO_URL=<path to this checkout>` first, or after pushing. Copy only `start.bat` into an empty folder, double-click → one clone, then the "You can delete this start.bat now" box repeats every ~3 seconds in the outer window, and **one** second launcher window opens from `OND-App\` and continues to `[1/4] Checking for updates…`. Closing the outer window leaves the app running. Double-click the outer `start.bat` again → no clone, same repeating message, one new inner launcher.

### Increment 3: `start.sh` for Linux, `.gitattributes`, executable bit
**Status:** not active
**What:** Add a bash launcher mirroring `start.bat` step for step, pin line endings so the shared checkout cannot corrupt either launcher, and stage the executable bit in git.
**Where:**
- `start.sh` — **new file** at repo root (next to `start.bat`).
- `.gitattributes` — **new file** at repo root (none exists; `ls -la` verified).
- Git index only: `git update-index --chmod=+x start.sh` (no working-tree effect on this NTFS mount; `core.filemode=false`).
**Details:**
- `start.sh` skeleton (`#!/usr/bin/env bash`, `set -u`, **not** `set -e` — the flow deliberately continues past failures and prompts, like the bat):
  1. `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`; `SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"`; `REPO_URL="${OND_REPO_URL:-https://github.com/Newton667/Odyssey-and-Dungeons.git}"` (same default URL as `start.bat` and `git remote -v`; the `OND_REPO_URL` override lets the bootstrap be tested against a local checkout before the branch is pushed).
  2. Banner identical in wording to `start.bat:5-8`.
  3. `open_url()` helper: `xdg-open "$1" >/dev/null 2>&1 || { [ "$(uname)" = Darwin ] && open "$1" >/dev/null 2>&1; } || echo "  Open this in your browser: $1"`. The `open` fallback is gated on macOS because on several Linux distros `/usr/bin/open` is `openvt`, which opens a virtual console.
  4. Node check: `while ! command -v node >/dev/null 2>&1; do` print `[SETUP] Node.js is not installed.` plus distro hints (`sudo dnf install nodejs npm` / `sudo apt install nodejs npm` / nodejs.org), `open_url https://nodejs.org/en/download`, `read -rp "  Install Node.js LTS, then press Enter to continue… "`; `done`. Same for `git` (`https://git-scm.com/downloads`). This mirrors `start.bat:12-36` (the loop replaces `goto START`).
  5. Bootstrap: `if [ ! -d "$SCRIPT_DIR/client" ] && [ ! -d "$SCRIPT_DIR/server" ]; then` — if `"$SCRIPT_DIR/OND-App/client"` does not exist, `git clone "$REPO_URL" "$SCRIPT_DIR/OND-App"` in a retry loop (`until … ; do read -rp "Download failed. Check your internet. Press Enter to retry… "; done`). Then `[ -f "$SCRIPT_DIR/OND-App/start.sh" ] || cp "$SCRIPT_DIR/$SCRIPT_NAME" "$SCRIPT_DIR/OND-App/start.sh"; chmod +x "$SCRIPT_DIR/OND-App/start.sh"` — copy **only when the clone lacks one** (same reasoning as the bat: the clone already holds the tracked, current launcher, and overwriting it with the downloaded file would be a downgrade vector that the update check does not repair until the next upstream commit; use `$SCRIPT_DIR/$SCRIPT_NAME` rather than bare `${BASH_SOURCE[0]}`, which is cwd-relative when invoked as `bash start.sh`), print the same "The app has been downloaded to … You can delete this start.sh now. From now on, run OND-App/start.sh" box, then `exec bash "$SCRIPT_DIR/OND-App/start.sh"`. `exec` replaces the process, so the outer script cannot loop; the inner script's `SCRIPT_DIR` is `OND-App`. **Note the asymmetry with `start.bat`:** the bat repeats its "you can delete this start.bat" message on purpose (Increment 2) because Windows opens the inner launcher in a second window and the first window would otherwise sit there looking idle. On Linux everything runs in the one terminal the user already has open, so the message prints once and the inner launcher's own output follows it. The user asked for the repeat on `start.bat` specifically; this is not an omission.
  6. `cd "$SCRIPT_DIR"`; `git config --global --add safe.directory "$SCRIPT_DIR" >/dev/null 2>&1` (mirrors `start.bat:60`; required on FUSE/NTFS mounts).
  7. Git init if `! git rev-parse --git-dir >/dev/null 2>&1` — same six commands as `start.bat:66-71`.
  8. Update check — same as `start.bat:77-93`: `git fetch origin main`, `LOCAL=$(git rev-parse HEAD 2>/dev/null)`, `REMOTE=$(git rev-parse origin/main 2>/dev/null)`; if both non-empty and differ → `read -rp "  Do you want to update? (y/n): "`; on `y|Y` → `git reset --hard origin/main >/dev/null 2>&1 && git pull origin main`.
  9. Dependencies: `node "$SCRIPT_DIR/scripts/ensure-deps.js" || { echo "  [ERROR] Dependency install failed."; read -rp "  Press Enter to exit… "; exit 1; }`.
  10. Start: `(cd "$SCRIPT_DIR/server" && exec node server.js) & SERVER_PID=$!`; `sleep 2`; `(cd "$SCRIPT_DIR/client" && exec npx vite) & CLIENT_PID=$!`; `trap 'trap - TERM; kill $SERVER_PID $CLIENT_PID 2>/dev/null; kill 0 2>/dev/null' INT TERM EXIT`; `sleep 5`; — the `exec` inside each subshell makes `$!` the node process itself rather than the subshell wrapper (otherwise the trap path on SIGTERM / a script error orphans `node server.js` on port 3001), and `kill 0` signals the whole process group so `npx`'s vite child goes too. The `cd` into `server/` is required, not cosmetic: `server/server.js:1` is `require('dotenv').config()`, which reads `.env` from `process.cwd()`; `open_url http://localhost:5173`; print the same "OND is running / Frontend / Backend" box with "Press Ctrl+C to stop both servers."; `wait`.
  - Ports and URLs come from the existing config: Vite `5173` (`client/vite.config.js:7`), Express `3001` (`server/server.js:16`).
- `.gitattributes`:
  ```
  start.sh  text eol=lf
  start.bat text eol=crlf
  ```
  `eol=lf` is the load-bearing line: it overrides Git for Windows' `autocrlf=true` so the Windows side can never write a CRLF `start.sh` onto the shared disk. `eol=crlf` for `start.bat` makes explicit what Windows users already get via autocrlf (the blob stays LF in the repo). **Known limit:** `.gitattributes` does not touch the standalone `start.bat` a player downloads from GitHub's raw view — that is the repo blob byte-for-byte, i.e. LF — and that is exactly the file that runs the `:DELETE_ME` loop. cmd's intermittent label-lookup bug is specific to LF files, but the existing LF `start.bat` has used `goto START` for raw downloaders without reports, so this is accepted; note it in `Docs/start-bat.md`. (The alternative — commit CRLF bytes and mark `start.bat -text` so every checkout and the raw download get CRLF — is left as Open question 2.) Run `git add --renormalize start.bat start.sh` after adding the file so the index is consistent; on this Linux checkout `git status` may then show `start.bat` as modified purely by line endings — that is expected and is not a content change (`git diff --ignore-cr-at-eol start.bat` must be empty apart from Increment 2's edits).
**Verify:**
1. `bash -n start.sh` exits 0 (syntax). `shellcheck start.sh` if available (not required; `command -v shellcheck` was not checked).
2. `file start.sh` reports no CRLF; `grep -c $'\r' start.sh` prints `0`.
3. `git ls-files -s start.sh` shows mode `100755`.
4. `cat .gitattributes` matches the two lines above; `git check-attr eol start.sh` prints `start.sh: eol: lf`.
5. Bootstrap path, in a scratch directory (`/tmp/claude-1000/…/scratchpad/bootstrap-test`): copy only `start.sh` there, run `OND_REPO_URL=/mnt/Stuff/Stuff/DND/OND bash start.sh` (**the override is required until the branch is pushed** — `origin/main` has no `scripts/` directory yet, so a real GitHub clone would fail at the dependency step and never reach the servers) → exactly one `git clone`, the "You can delete this start.sh now" box, then the inner script continues to `[1/4] Checking for updates...` from `OND-App/`. Ctrl+C once the servers start. Run `bash start.sh` in the scratch dir again → no second clone (the `OND-App/client` short-circuit), same message and hand-off. Delete the scratch dir afterwards.
6. In-repo path: `./start.sh` from the repo root → `[deps] … OK`, server log line from `server/server.js` and Vite's `Local: http://localhost:5173/`; Ctrl+C stops both (`pgrep -f "node server.js"` and `pgrep -f vite` return nothing afterwards).

### Increment 4: Docs + changelog
**Status:** not active
**What:** Document the Linux launcher, the platform marker and the two batch traps; update every "Windows-only launcher" statement.
**Where:**
- `CHANGELOG.md:28` — the `## vX.X.X — Unreleased` block (currently empty).
- `Docs/start-bat.md` — whole file (currently Windows-only; keep the filename, it is referenced from `CLAUDE.md`, `CHANGELOG.md:22` and `README.md:93`).
- `Docs/architecture.md:8` ("Deployment: Windows start.bat launcher…") and `:34` (project tree).
- `README.md:21`, `:25-27` (Getting Started), `:78` (tree), `:93` (docs link text).
- `Docs/known-patterns-and-gotchas.md` — new entries (see "Docs & changelog" below).
**Details:** exact text in the "Docs & changelog" section.
**Verify:** `grep -rn "Windows start.bat launcher\|Windows launcher" README.md Docs/architecture.md` returns nothing; `grep -n "start.sh" README.md Docs/start-bat.md Docs/architecture.md Docs/known-patterns-and-gotchas.md CHANGELOG.md` finds at least one hit in each; `grep -n "ensure-deps" Docs/start-bat.md Docs/known-patterns-and-gotchas.md CHANGELOG.md` finds at least one hit in each.

## Rules & data notes

No D&D rules are involved. No character data is touched; `char.ruleset` is irrelevant here.

## Risks & gotchas

- **The first run after this change rebuilds `node_modules` once for every existing user.** Existing trees have no `.ond-platform` marker, and Increment 1 treats "no marker" as foreign. On Windows that is a delete + reinstall of `client/node_modules` (three.js, React, Vite — a minute or two). This is a one-time cost and is the price of not guessing; it is called out in the CHANGELOG entry. If the user prefers, the script can instead probe for a foreign `@rollup/rollup-*` directory when the marker is absent — see Open questions.
- **Running Increment 1 on this machine flips the shared checkout to Linux.** Until `start.bat` also calls `ensure-deps.js` (Increment 2), booting Windows and running the *old* `start.bat` would run plain `npm install` on a Linux-built tree. Do Increments 1 and 2 in the same session.
- **`spawnSync('npm')` on Windows** needs `shell: true` (or `npm.cmd`) — Node 18.20+/20.12+ throw `EINVAL` for `.cmd` files without a shell. Increment 1 specifies both.
- **Batch: `%VAR%` inside `( … )` is expanded at parse time.** This is the root cause of the loop and the reason the rewrite uses `goto` labels and `!ERRORLEVEL!`. Add it to `known-patterns-and-gotchas.md` so the next `start.bat` edit does not reintroduce it.
- **Batch: `%~dp0` is fixed for the life of the script.** Never `cd` + `goto` to "relaunch from another folder"; `start` the other copy.
- **Shared-disk line endings.** Without `.gitattributes`, a Windows checkout with `autocrlf=true` writes CRLF into `start.sh` on the shared NTFS partition and bash fails with `$'\r': command not found`. Increment 3's `.gitattributes` is what prevents this; do not drop it as "cosmetic".
- **`core.filemode=false` on this checkout.** `chmod +x` is invisible to git here; only `git update-index --chmod=+x` records the mode. Verify with `git ls-files -s`.
- **`Docs/known-patterns-and-gotchas.md` "Git Safe Directory"** — keep `safe.directory` in `start.sh` before any `git` call; FUSE-mounted NTFS (`user_id=0` in the mount options) is a classic "dubious ownership" trigger.
- **Do not `set -e` in `start.sh`.** The update prompt, the retry loops and the optional `xdg-open` are all expected to fail sometimes; the script must keep going like the bat does.
- **`server/server.js:86-87` (`/api/pull-update`) still runs a plain `npm install`.** Fine — it cannot see a platform switch — but if a future change makes it run the shared script, remember the endpoint has a 60 s timeout per install and a wipe would exceed it.

## Verification

- Build/test on Linux after Increment 1: `cd client && npx vitest run` (all six test files green) and `cd client && npx vite build` (writes `client/dist`, which is gitignored). Both fail before the change with the `@rollup/rollup-linux-x64-gnu` error.
- Marker round-trip: `cat client/node_modules/.ond-platform` → `linux-x64`; `cat server/node_modules/.ond-platform` → `linux-x64`.
- Simulated switch: overwrite the marker with `win32-x64`, run `node scripts/ensure-deps.js`, confirm the "rebuilding" line and that the marker is back to `linux-x64`.
- `start.sh` bootstrap: standalone copy in a scratch folder → one clone, hand-off box, inner launcher runs; second run → no clone.
- `start.sh` in-repo: `./start.sh` → deps OK, both servers up, browser opens `http://localhost:5173`, Ctrl+C stops both.
- `start.bat`: static checks in Increment 2's Verify (no `goto START` after copy, no `%ERRORLEVEL%` in a block, no `npm install`, one `start "OND Launcher"` before the single `goto DELETE_ME`). The double-click behaviour itself must be confirmed on a Windows machine by the user — see Open questions.
- `.gitattributes`: `git check-attr eol start.sh start.bat` → `lf` / `crlf`.

## Docs & changelog

**CHANGELOG.md** — under `## vX.X.X — Unreleased`:

```markdown
### Added
- **Linux launcher (`start.sh`).** The same one-file bootstrap as `start.bat`: checks for Node.js and Git, clones the app into `OND-App/` when run on its own, offers updates, installs dependencies, starts both servers in one terminal and opens the browser. Ctrl+C stops everything.
- **One checkout now runs on both Windows and Linux.** Installed dependencies are platform-specific (Vite's bundler ships a native binary per OS), so a folder set up on Windows could not run `vite`, `vitest` or a build on Linux, and vice versa. A new `scripts/ensure-deps.js` — used by both launchers and by `npm install` at the repo root — records which platform the dependencies were installed for and rebuilds them when the platform changes. The first launch after this update rebuilds dependencies once.

### Fixed
- **`start.bat` no longer floods the terminal with download errors after downloading the app.** When only `start.bat` was downloaded, it cloned the app into `OND-App` correctly and then looped forever printing "Downloading…" and "Download complete!" — the relaunch jumped back to the original folder, tried to clone again, and never noticed the clone had failed. It now opens the real launcher inside `OND-App` in its own window, and the original window repeats one clear message instead: "The app has been downloaded — you can delete this start.bat now." That repetition is on purpose, so the window can't be mistaken for a stuck download; close it whenever you like. Double-clicking the outer `start.bat` again just hands off to `OND-App` without re-downloading. If you already have an older standalone `start.bat`, download it again once; the copy inside `OND-App` is updated automatically.
```

**Docs/start-bat.md** — retitle to "start.bat / start.sh Reference" (keep the filename). Update the flow diagram: the bootstrap branch becomes "git clone into OND-App/ → copy launcher in → **start** the copy in OND-App (bat: `start … /D` in a new window, then the original window loops 'you can delete this start.bat now' every 3 s until closed — deliberate; sh: `exec`, which replaces the process, so the message shows once)"; the dependencies step becomes "`node scripts/ensure-deps.js` — wipes and reinstalls `node_modules` if it was built for another platform (marker `node_modules/.ond-platform`), then `npm install` in `server/` and `client/`". Add a "Linux (`start.sh`)" section: same steps, both servers in one terminal, Ctrl+C stops both, `xdg-open` for the browser, `read` prompts replace `pause`. Add to "For Developers": `.gitattributes` pins `start.sh` to LF / `start.bat` to CRLF; the executable bit is set with `git update-index --chmod=+x start.sh` because this checkout has `core.filemode=false`; test the bootstrap by copying only the launcher into an empty folder.

**Docs/architecture.md** — `:8` → "Deployment: `start.bat` (Windows) / `start.sh` (Linux) launchers with git auto-updates; `scripts/ensure-deps.js` keeps `node_modules` matched to the running platform"; `:34` tree → add `start.sh`, `scripts/ensure-deps.js`, `.gitattributes`.

**README.md** — `:21` same wording as architecture; `:25-27` add a "### Linux" subsection (`chmod +x start.sh && ./start.sh`, or `bash start.sh`; same behaviour as Windows, servers run in the one terminal, Ctrl+C stops both); note under "Manual setup (any OS)" that root `npm install` now rebuilds dependencies when the OS changes; `:78` tree; `:93` link text "launcher script reference (Windows and Linux)".

**Docs/known-patterns-and-gotchas.md** — add three entries:
1. **"`node_modules` is platform-specific — never share it across OSes without rebuilding."** Vite's rollup and esbuild install a native binary for the current OS as optional dependencies; a tree built on Windows fails on Linux with `Cannot find module @rollup/rollup-linux-x64-gnu` (and vice versa). `scripts/ensure-deps.js` owns the fix (marker `node_modules/.ond-platform`, wipe on mismatch). Both launchers and root `postinstall` call it; do not add a bare `npm install` to a launcher.
2. **"Batch: `%VAR%` inside a parenthesised block is expanded when the block is parsed."** `if %ERRORLEVEL% neq 0` after a command inside `( … )` tests the value from *before* the block. Use `!ERRORLEVEL!` (delayed expansion is on) or restructure with `goto` labels. This is what made `start.bat`'s "Download failed" branch unreachable.
3. **"Batch: `%~dp0` never changes."** It is the script file's own directory, not the current directory; `cd` + `goto START` cannot relaunch "from another folder". To hand off to a copy elsewhere, `start "" /D "<dir>" "<dir>\start.bat"` and then either `exit /b` or, as `start.bat` does on purpose, fall into a `timeout`-paced message loop. **The `:DELETE_ME` loop in `start.bat` is intentional** — do not "fix" it into a single message; the `start` line must stay outside (before) the loop so the inner launcher is spawned once. In bash the equivalent hand-off is `exec`, which cannot loop afterwards because it replaces the process.

## Open questions

1. **Treat "no marker" as foreign (one-time full reinstall for every existing user) or probe for a foreign `@rollup/rollup-*` directory instead?** The plan recommends the simple rule (deterministic, one-time cost). If the user would rather spare existing Windows installs the reinstall, Increment 1 step 3 can add: when the marker is absent, wipe only if `client/node_modules/@rollup` contains a directory whose name does not start with `rollup-${process.platform}-`.
2. **Should `start.bat`'s checkout form become CRLF (`.gitattributes` `eol=crlf`)?** It is what Windows users already get via `autocrlf=true`, and cmd.exe's `goto` is known to misbehave in LF-only files, but it is a behaviour change for anyone with `autocrlf=false`. Recommendation: yes. Drop that line if the user disagrees; `start.sh text eol=lf` must stay either way. Note that `eol=crlf` does **not** reach the raw GitHub download (the blob stays LF); if "always CRLF, including the raw download" is wanted, the stronger option is to commit CRLF bytes and mark `start.bat -text`. The plan ships the `eol=crlf` form and documents the limit.
3. **Windows confirmation.** No Windows machine is available here; Increment 2's double-click behaviour can only be statically checked in this environment. The user should run the bootstrap once on Windows (copy only `start.bat` into an empty folder) before pushing.
4. **`start.sh` on macOS** is not in scope; the `open` fallback in `open_url` is free but untested. Leave the doc wording as "Linux".
