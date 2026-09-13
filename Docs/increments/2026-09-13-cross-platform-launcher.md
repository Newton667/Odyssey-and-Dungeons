# Execution: Cross-Platform Launcher and Platform-Aware Dependencies

**Plan:** `Docs/plans/2026-09-13-cross-platform-launcher.md`
**Prepared:** 2026-09-13
**Overall status:** complete
**Test command:** `cd client && npm test` (vitest — **not runnable on this machine until Increment 1 is green**, see below)
**Increment 1 test command:** `node --test scripts/ensure-deps.test.js` (Node's built-in runner, bare Node, no dependencies)
**Build command:** `cd client && npx vite build`

> This plan passed plan review (APPROVED WITH FIXES, fixes applied) and was then revised on a
> user decision. **Do not re-derive it.** Two decisions are binding and must not be "corrected":
> 1. The outer `start.bat` deliberately **repeats** its "you can delete this start.bat now"
>    message in a `timeout`-paced `:DELETE_ME` loop after a **single** `start … /D` hand-off.
>    The `start` line runs once, before the loop; only the message repeats.
> 2. `start.sh` shows the same message **once**, because it hands off with `exec`, which replaces
>    the process and therefore cannot loop. The asymmetry is intentional.

## Test-infrastructure facts that constrain every spec below

- The only vitest setup is in `client/` (`vitest run`, bare Node, no jsdom). Vitest's include
  pattern is rooted at `client/`, so nothing under `scripts/` is ever collected by it.
- **Vitest cannot run today on this Linux machine.** `client/node_modules/@rollup/` holds only
  `rollup-win32-x64-gnu` and `rollup-win32-x64-msvc`; `client/node_modules/@esbuild/` holds only
  `win32-x64`. Verified 2026-09-13: `cd client && node -e "require('rollup')"` throws from
  `node_modules/rollup/dist/native.js:121` (`Cannot find module @rollup/rollup-linux-x64-gnu`), so
  `npx vitest run`, `npx vite` and `npx vite build` all fail before running a single test.
  **Increment 1 is the thing that fixes this.** Its gates are therefore shell-level checks on
  `scripts/ensure-deps.js` plus one dependency-free `node:test` file — not vitest. The header
  `Test command` first becomes runnable at Increment 1's GREEN step 4.
- `scripts/ensure-deps.js` is a plain CommonJS script at the repo root (root `package.json` has
  no `"type": "module"`), deliberately outside the client toolchain because it must run before
  anything is installed. Its unit test lives beside it (`scripts/ensure-deps.test.js`) and runs
  with `node --test`, for the same reason. **Do not put that test under `client/`** — vitest
  would collect it, and `node:test` inside vitest is not a supported combination.
- Increments 2 and 3 are a batch file and a bash script. There is no assertable pure function in
  either; their gates are static greps, `bash -n`, and the scratch-directory bootstrap run.
  **Do not invent vitest tests for batch/bash files.** No Windows box is available; `wine`
  exists but its `cmd.exe` is not faithful enough to be a gate (plan Verify 2.5).
- Environment facts verified today: Node `v24.18.0`, npm `11.16.0`, `rsync` and `xdg-open`
  present, `shellcheck` **absent**, `core.filemode=false`, `core.autocrlf` unset, no
  `.gitattributes`, `start.bat` tracked as `100644` with zero `\r` bytes, HEAD `2136b83` ==
  `origin/main`, working tree clean apart from the untracked plan file.

## Progress

| # | Increment | Status | Red | Green |
|---|-----------|--------|-----|-------|
| 1 | `scripts/ensure-deps.js` — platform-aware dependency install | done | ☑ | ☑ |
| 2 | `start.bat` — clean hand-off to `OND-App\start.bat`, use `ensure-deps.js` | done | n/a | ☑ |
| 3 | `start.sh` for Linux, `.gitattributes`, executable bit | done | n/a | ☑ |
| 4 | Docs + changelog | done | n/a | ☑ |

**Line references verified 2026-09-13** against the working tree. `start.bat:38-56` (bootstrap
block), `:95-105` (install block), `:14`/`:27` (`where` checks with `%ERRORLEVEL%` on the `if`
line), `:44` (the parse-time `%ERRORLEVEL%` inside the block — the bug), `:54-55` (`cd` +
`goto START`), `:60` (`safe.directory`), `:66-71` (git init), `:77-93` (update check),
`:107-131` (start/browser) — all confirmed. `package.json:8` `dev`, `:10` `postinstall` —
confirmed. `server/server.js:1` `dotenv`, `:16` `PORT`, `:64-66` `safe.directory`, `:81-92`
`/api/pull-update` with `npm install --silent` at `:86-87` — confirmed. `client/vite.config.js:7`
port `5173` — confirmed. `client/package-lock.json:577/:730/:1051/:1149` and 25
`@rollup/rollup-*` entries, `lockfileVersion: 3` — confirmed. `README.md:21`, `:25-27`, `:78`,
`:93`; `Docs/architecture.md:8`, `:34`; `Docs/known-patterns-and-gotchas.md:216-217`;
`CHANGELOG.md:22` — confirmed. **One off-by-one:** the `## vX.X.X — Unreleased` heading is at
**`CHANGELOG.md:29`**, not `:28` (`:28` is blank). No `scripts/` directory exists.

---

## Increment 1: `scripts/ensure-deps.js` — platform-aware dependency install
**Status:** done
**Started:** 11:04  **Finished:** 11:06

**What:** Add a dependency-free Node script that wipes `node_modules` when it was built for
another platform, runs `npm install` in `server/` and `client/`, and writes a platform marker.
Wire it into root `package.json` as the `postinstall` and as an explicit `deps` script.

**Where:**
- `scripts/ensure-deps.js` — **new file** (no `scripts/` directory exists today).
- `scripts/ensure-deps.test.js` — **new file** (see Test spec; this document's one addition to
  the plan's letter — see Concerns 2).
- `package.json:10` — `"postinstall": "cd server && npm install && cd ../client && npm install"`
  → `"postinstall": "node scripts/ensure-deps.js"`; add `"deps": "node scripts/ensure-deps.js"`
  next to `"dev"` (`:8`).

**Details** (from the plan, with the export shape this document adds):
- CommonJS. `fs`, `path`, `child_process`, `os` only — no dependencies, it runs before anything
  is installed.
- `const ROOT = path.join(__dirname, '..')`; `const PLATFORM = \`${process.platform}-${process.arch}\``
  (`linux-x64` here, `win32-x64` on the user's Windows side); `const MARKER = '.ond-platform'`.
- **Extract the decision into one pure function** so it can be asserted without touching disk:
  ```js
  // existing: trimmed marker contents, or null when the marker file is absent
  // platform: the running `${process.platform}-${process.arch}`
  // nmExists: whether <dir>/node_modules exists at all
  function assessTree(existing, platform, nmExists) {
    const ok = existing === platform;
    return {
      ok,
      wipe: nmExists && !ok,                      // plan step 3: existing tree + mismatch/no marker → delete
      status: ok ? `OK (${platform})`
            : existing == null ? `no marker (want ${platform})`
            : `built for ${existing} (want ${platform})`,
    };
  }
  module.exports = { assessTree, PLATFORM, MARKER };
  if (require.main === module) main();          // requiring the module must have NO side effects
  ```
  `main()` then does, per directory `['server', 'client']`: read the marker (trim), call
  `assessTree`, and:
  - `--check` mode: print `[deps] ${dir}: ${status}` for mismatches / `[deps] ${dir} OK (${PLATFORM})`
    when ok; exit `0` only if every directory is ok, else `1`. No install, no delete.
  - normal mode: if `wipe` → log
    `[deps] ${dir}/node_modules was built for ${existing ?? 'an unknown platform'}, rebuilding for ${PLATFORM}…`
    and `fs.rmSync(nm, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 })` **inside
    `try/catch`**; on failure print
    `[deps] Could not remove ${dir}/node_modules — close any running OND windows and run the launcher again.`
    and `process.exit(1)`. Then **always** `spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['install', '--loglevel=error', '--no-audit', '--no-fund'], { cwd, stdio: 'inherit', shell: process.platform === 'win32' })`
    (**not** `--silent` — that hides npm's own error report; `shell: true` on Windows is required
    for `.cmd` resolution under Node ≥ 18.20 / 20.12). If `r.status !== 0` → `console.error` and
    `process.exit(r.status || 1)`. Then `fs.mkdirSync(nm, { recursive: true })` and write
    `PLATFORM + '\n'` to the marker. Happy path prints one line per directory:
    `[deps] client OK (linux-x64)`.
- **"No marker" on an existing tree counts as foreign** (plan Risks / Open question 1, decided as
  the simple rule). This is why the first run on every existing install rebuilds once.
- Do **not** delete `package-lock.json` (the tracked lockfile is complete and already lists both
  platforms' optional binaries).
- Root `node_modules/` (`concurrently`) is outside the script's scope; it has no native modules.

**Test spec**
- **File:** `scripts/ensure-deps.test.js` (new) — `const test = require('node:test'); const assert = require('node:assert/strict');`
  CommonJS, beside the script, **outside `client/`**. Run with `node --test scripts/ensure-deps.test.js`.
- **Why `node:test` and not vitest:** vitest cannot run until this very increment has rebuilt
  `client/node_modules`, so a vitest RED gate for Increment 1 could only be observed after the
  implementation exists — a gate that cannot go red first. The root script is CommonJS outside
  the client's vite root, which vitest 4 + vite 5 may or may not inline correctly; a failure there
  would be a false red. Node's built-in runner has neither problem and needs nothing installed.
- **Asserts** (`const { assessTree, PLATFORM, MARKER } = require('./ensure-deps.js')`):
  - `assessTree('linux-x64', 'linux-x64', true)` → `{ ok: true, wipe: false, status: 'OK (linux-x64)' }`
  - `assessTree('win32-x64', 'linux-x64', true)` → `{ ok: false, wipe: true, status: 'built for win32-x64 (want linux-x64)' }`
    ← the shared-NTFS case this plan exists for (Windows-built tree, Linux boot)
  - `assessTree('linux-x64', 'win32-x64', true)` → `{ ok: false, wipe: true, status: 'built for linux-x64 (want win32-x64)' }`
    ← the return trip (Linux-built tree, Windows boot)
  - `assessTree(null, 'linux-x64', true)` → `{ ok: false, wipe: true, status: 'no marker (want linux-x64)' }`
    ← **this checkout today**: tree exists, no marker, must rebuild (the one-time cost in Risks)
  - `assessTree(null, 'linux-x64', false)` → `{ ok: false, wipe: false, status: 'no marker (want linux-x64)' }`
    ← fresh clone: install, but nothing to delete
  - `assessTree('win32-x64', 'linux-x64', false)` → `wipe === false` (never ask to delete a
    directory that does not exist, whatever a stray marker says)
  - `assessTree('linux-arm64', 'linux-x64', true)` → `wipe === true` (arch is part of the key,
    not just OS)
  - `PLATFORM` → `` `${process.platform}-${process.arch}` `` (on this machine `'linux-x64'`);
    `MARKER` → `'.ond-platform'`
  - The `require` at the top of the test must return **immediately with no `[deps]` output** —
    if `main()` runs on require, the test itself would start an `npm install`. Node's runner will
    show this as a multi-minute test with npm output; treat that as a failure.
- **Must fail before implementation because:** `scripts/ensure-deps.js` does not exist, so the
  test's `require('./ensure-deps.js')` throws `Cannot find module` and `node --test` reports the
  file as failed. A partial implementation without `module.exports` fails with
  `assessTree is not a function`; one that calls `main()` unconditionally spawns npm during the
  test (see the last assert).

**Gates**
- ☑ **RED** — `scripts/ensure-deps.test.js` written; `node --test scripts/ensure-deps.test.js`
  observed **failing** with `Cannot find module '…/scripts/ensure-deps.js'`. Also record the
  pre-state that the shell gates below will flip: `node scripts/ensure-deps.js --check` →
  `Cannot find module` (script absent); `cd client && node -e "require('rollup'); console.log('ok')"`
  → throws `Cannot find module @rollup/rollup-linux-x64-gnu`; `ls client/node_modules/@rollup/`
  → only `rollup-win32-x64-gnu rollup-win32-x64-msvc`; no `.ond-platform` in either
  `node_modules`.
- ☑ **GREEN** — all of the following, **in this order** (steps 2 and 3 are order-sensitive:
  once the install has run, the markers exist and `--check` exits 0):
  1. `node --test scripts/ensure-deps.test.js` → every test passes; the run takes well under a
     second (proves the `require.main` guard).
  2. Plan Verify 1.1, **before** the first install:
     `node scripts/ensure-deps.js --check; echo "exit=$?"` → `exit=1` **and** the output contains
     `server: no marker (want linux-x64)` and `client: no marker (want linux-x64)`. (Exit code
     alone is not enough — a missing script file also exits 1.)
  3. Plan Verify 1.2: `node scripts/ensure-deps.js` completes with exit 0. **This wipes both
     Windows-built trees and reinstalls from the registry — network required, a few minutes.**
     Expect the `rebuilding for linux-x64` line for **both** directories (no marker on existing
     trees). Then: `cat client/node_modules/.ond-platform` → `linux-x64`;
     `cat server/node_modules/.ond-platform` → `linux-x64`;
     `ls client/node_modules/@rollup/` lists `rollup-linux-x64-gnu`;
     `cd client && node -e "require('rollup'); console.log('ok')"` → `ok`;
     `node scripts/ensure-deps.js --check; echo "exit=$?"` → `[deps] server OK (linux-x64)`,
     `[deps] client OK (linux-x64)`, `exit=0`.
  4. Plan Verify 1.3: `cd client && npm test` → all **6** test files pass
     (`src/data/localDataService.test.js`, `src/utils/charSync.test.js`,
     `src/utils/diceFormula.test.js`, `src/utils/dndHelpers.test.js`,
     `src/utils/homebrew.test.js`, `src/utils/spellAccess.test.js`); `npx vite build` → built.
     This is the first time either command has run on Linux in this checkout.
  5. Plan Verify 1.4, simulated platform switch:
     `echo win32-x64 > client/node_modules/.ond-platform && node scripts/ensure-deps.js` → output
     contains `client/node_modules was built for win32-x64, rebuilding for linux-x64` and **no**
     rebuilding line for `server` (its marker still matches); afterwards
     `cat client/node_modules/.ond-platform` → `linux-x64` and `cd client && npm test` still passes.
  6. Plan Verify 1.5: `grep -n 'postinstall\|"deps"' package.json` → both lines point at
     `scripts/ensure-deps.js`; `grep -n "cd server && npm install" package.json` → nothing.
  7. `node -e "require('./scripts/ensure-deps.js'); console.log('no side effects')"` → prints only
     `no side effects`, immediately.

**Verify:** the seven steps above; then `cd client && npm test` + `npx vite build`.

**Log:**
- 11:05 RED observed. `node --test scripts/ensure-deps.test.js` →
  ```
  Error: Cannot find module './ensure-deps.js'   (code: 'MODULE_NOT_FOUND', requireStack: [ '/mnt/Stuff/Stuff/DND/OND/scripts/ensure-deps.test.js' ], thrown at ensure-deps.test.js:10:42 — the require line)
  ✖ scripts/ensure-deps.test.js (25.67986ms)
  ℹ tests 1  ℹ pass 0  ℹ fail 1
  ```
  Pre-state: `node scripts/ensure-deps.js --check; echo exit=$?` → `Error: Cannot find module '/mnt/Stuff/Stuff/DND/OND/scripts/ensure-deps.js'`, `exit=1`.
  `cd client && node -e "require('rollup'); console.log('ok')"` → throws from `client/node_modules/rollup/dist/native.js:121`.
  `ls client/node_modules/@rollup/` → `rollup-win32-x64-gnu rollup-win32-x64-msvc` only. No `.ond-platform` in either `node_modules`.
- 11:06 GREEN observed, steps in order:
  1. `node --test scripts/ensure-deps.test.js` → `ℹ tests 8  ℹ pass 8  ℹ fail 0  ℹ duration_ms 39.09`; wall clock `real 0m0.062s`.
  2. `node scripts/ensure-deps.js --check; echo exit=$?` (before install) →
     `[deps] server: no marker (want linux-x64)` / `[deps] client: no marker (want linux-x64)` / `exit=1`.
  3. `node scripts/ensure-deps.js` → `[deps] server/node_modules was built for an unknown platform, rebuilding for linux-x64…` /
     `added 129 packages in 691ms` / `[deps] server OK (linux-x64)` / `[deps] client/node_modules was built for an unknown platform, rebuilding for linux-x64…` /
     `added 100 packages in 2s` / `[deps] client OK (linux-x64)`; exit 0 (3.1 s total — npm cache was warm).
     `cat client/node_modules/.ond-platform` → `linux-x64`; `cat server/node_modules/.ond-platform` → `linux-x64`;
     `ls client/node_modules/@rollup/` → `rollup-linux-x64-gnu rollup-linux-x64-musl`; `ls client/node_modules/@esbuild/` → `linux-x64`;
     `cd client && node -e "require('rollup'); console.log('ok')"` → `ok`;
     `--check` → `[deps] server OK (linux-x64)` / `[deps] client OK (linux-x64)` / `exit=0`.
  4. `cd client && npm test` → `Test Files  6 passed (6)` / `Tests  143 passed (143)` / `Duration 267ms` (first Linux run in this checkout).
     `npx vite build` → `✓ built in 1.74s` (pre-existing >500 kB chunk advisory only).
  5. `echo win32-x64 > client/node_modules/.ond-platform && node scripts/ensure-deps.js` →
     `[deps] server OK (linux-x64)` (no rebuilding line) / `[deps] client/node_modules was built for win32-x64, rebuilding for linux-x64…` /
     `[deps] client OK (linux-x64)`; marker afterwards `linux-x64`; `npm test` → `6 passed (6)` / `143 passed (143)`.
  6. `grep -n 'postinstall\|"deps"' package.json` → `10: "deps": "node scripts/ensure-deps.js"`, `11: "postinstall": "node scripts/ensure-deps.js"`;
     `grep -n "cd server && npm install" package.json` → nothing (exit 1).
  7. `node -e "require('./scripts/ensure-deps.js'); console.log('no side effects')"` → `no side effects`, immediately.

**Changed:**
- `scripts/ensure-deps.js` — new. `assessTree(existing, platform, nmExists)` pure decision + `main()` (`--check` mode, wipe with
  `rmSync` retries in try/catch and the "close any running OND windows" message, `npm install --loglevel=error --no-audit --no-fund`
  via `spawnSync` with `npm.cmd`/`shell:true` on win32, marker write). Exports `{ assessTree, PLATFORM, MARKER }`; `main()` only under `require.main === module`.
- `scripts/ensure-deps.test.js` — new, 8 `node:test` cases (all seven `assessTree` rows from the spec + the constants).
- `package.json:10-11` — `"deps"` added, `postinstall` → `node scripts/ensure-deps.js`.

**Notes:** `package-lock.json` files untouched. Working tree is now Linux-flavoured (`client/dist` written by the build gate; gitignored).
Increment 2 must follow in this session (plan Risks). The `--check` output format is `[deps] <dir>: <status>` on mismatch and `[deps] <dir> OK (<platform>)` on match, exactly as specified.

---

## Increment 2: `start.bat` — clean hand-off to `OND-App\start.bat`, and use `ensure-deps.js`
**Status:** done
**Started:** 11:06  **Finished:** 11:08

**What:** Replace the `cd` + `goto START` relaunch with a real process hand-off followed by the
**deliberate** `:DELETE_ME` message loop, fix the parse-time `%ERRORLEVEL%`, skip the clone when
`OND-App` already holds the app, make the clone URL overridable via `OND_REPO_URL`, and replace
the inline `npm install` block with one call to `scripts\ensure-deps.js`.

**Where:**
- `start.bat:38-56` — the "Check if app files exist" block (rewritten with `goto` labels).
- `start.bat:95-105` — the "Install dependencies" block (replaced).
- Near the top (after `:3` `title`, before `:11` `:START`): `set "REPO_URL=https://github.com/Newton667/Odyssey-and-Dungeons.git"`
  and `if defined OND_REPO_URL set "REPO_URL=%OND_REPO_URL%"`.
- Leave `:11-36`, `:58-93` and `:107-131` untouched (the `git remote add origin https://…` literal
  at `:67` stays as is).

**Details:** use the plan's block verbatim (plan Increment 2, "Rewrite `:38-56`"):
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
and for `:95-105`:
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
- The two batch traps being removed: `%VAR%` inside `( … )` is expanded at parse time (so
  `:44`'s `%ERRORLEVEL%` always saw `0`), and `%~dp0` is fixed for the life of the script (so
  `cd /d "%~dp0OND-App"` + `goto START` re-entered the check in the original folder and cloned
  again). The rewrite has **no** `%ERRORLEVEL%` inside a block and **no** `cd` + `goto` relaunch.
- **The `:DELETE_ME` loop is intentional.** `start "OND Launcher" /D …` runs **once, before** the
  label; the loop only prints, paced by `timeout /t 3 /nobreak >nul`. No `pause`, no `exit /b`
  on this path. The inner launcher is a separate process, so closing the outer window does not
  stop the app.
- Copy the launcher into `OND-App\` **only when missing** (`if not exist … copy`) — the clone
  already contains the tracked, current `start.bat`; overwriting it with the downloaded file is a
  downgrade vector the update check would not repair until the next upstream commit.
- Preserve LF line endings in the file (Increment 3's `.gitattributes` decides the checkout form).

**Test spec:** n/a — a Windows batch file. There is no pure function to extract and no way to
execute `cmd.exe` faithfully here (`wine`'s `cmd` does not implement `where` / `for /f`
correctly; plan Verify 2.5). The gates are static and mechanical; the double-click behaviour is
user-owned (plan Open question 3).

**Pre-state (observed 2026-09-13, so the GREEN greps below are meaningful):**
`grep -n "goto START" start.bat` → `:22 :35 :49 :55` (four; `:55` is the bug);
`grep -n "%ERRORLEVEL%" start.bat` → `:14 :27 :44 :64` (`:44` is inside a block — the bug);
`grep -c 'cd /d "%~dp0OND-App"' start.bat` → `1`; `grep -n "npm install" start.bat` → `:100 :103`;
`grep -c "DELETE_ME\|OND Launcher\|ensure-deps\|REPO_URL\|HANDOFF\|APP_PRESENT" start.bat` → `0`.

**Gates**
- ☑ **GREEN** — every check below holds:
  1. Plan Verify 2.1: `grep -n "goto START" start.bat` → exactly **3** hits: the Node-missing
     retry, the Git-missing retry, and the clone-failed retry inside the `if !ERRORLEVEL! neq 0 (`
     block. None after the `copy` line; none after `:HANDOFF`.
  2. Plan Verify 2.2: `grep -n "%ERRORLEVEL%" start.bat` → exactly **3** hits, each an
     `if %ERRORLEVEL% neq 0 (` line that directly follows a command *outside* any block (the
     `where node`, `where git` and `git rev-parse --git-dir` checks). `grep -n "!ERRORLEVEL!" start.bat`
     → exactly **2** hits (clone check, `ensure-deps` check).
     `grep -c 'cd /d "%~dp0OND-App"' start.bat` → `0`.
  3. Plan Verify 2.3: `grep -n "npm install" start.bat` → nothing;
     `grep -n "ensure-deps" start.bat` → exactly one line, `call node "%~dp0scripts\ensure-deps.js"`.
  4. Plan Verify 2.4: `grep -n "goto DELETE_ME" start.bat` → exactly one line.
     `grep -n ':DELETE_ME\|start "OND Launcher"' start.bat` → two lines, and the `start "OND Launcher"`
     line number is **smaller** than the `:DELETE_ME` label's (spawned once, before the loop).
     `grep -n 'git clone\|:HANDOFF' start.bat` → two lines, `git clone` first.
     `grep -c "timeout /t 3 /nobreak" start.bat` → `1`.
  5. `grep -n "REPO_URL" start.bat` → the `set "REPO_URL=…"` default, the
     `if defined OND_REPO_URL set "REPO_URL=%OND_REPO_URL%"` override, and `git clone "!REPO_URL!"`;
     `grep -c "Odyssey-and-Dungeons.git" start.bat` → `2` (the `set` default and the untouched
     `git remote add origin` at the git-init block).
  6. `grep -c $'\r' start.bat` → `0` (LF preserved in the working tree at this point; after
     Increment 3 the equivalent check is on the index blob — see there).
  7. `git diff --stat start.bat` shows a single-file change and `git diff start.bat` has hunks
     only in the header (`REPO_URL` lines), the bootstrap block and the install block; the
     Node/Git checks, `safe.directory`, git init, update check and start/browser sections are
     byte-identical.
  8. Windows double-click (plan Verify 2.5) — **not gateable in this environment**; the user
     runs it once on Windows before pushing: copy only `start.bat` into an empty folder,
     `set OND_REPO_URL=<origin>` (see Concerns 1 — a local checkout path only works once the
     changes are committed), double-click → one clone, the "You can delete this start.bat now"
     box repeats every ~3 s in the outer window, **one** inner launcher window opens from
     `OND-App\` and continues to `[1/4] Checking for updates…`; closing the outer window leaves
     the app running; double-clicking the outer `start.bat` again → no clone, same loop, one new
     inner window. Record "not run here" in the Log rather than ticking it.

**Verify:** the greps above. Do Increment 2 in the **same session** as Increment 1: once
Increment 1 has flipped this checkout's `node_modules` to Linux, the *old* `start.bat` would run a
bare `npm install` on a Linux-built tree from Windows (plan Risks).

**Log:**
- 11:08 Test: n/a (batch file) — no RED gate. Pre-state confirmed as documented except the combined
  `grep -c "DELETE_ME\|OND Launcher\|…"` returned `1`, not `0`: line 3 `title OND Launcher` already matched
  `OND Launcher` — the gate asserts on `start "OND Launcher"` specifically, so no impact.
- 11:08 GREEN observed after the edit:
  1. `grep -n "goto START" start.bat` → `24`, `37`, `53` (Node retry, Git retry, clone-failed retry inside `if !ERRORLEVEL! neq 0 (`; `:53` < `:HANDOFF` at `:55`).
  2. `grep -n "%ERRORLEVEL%"` → `16`, `29`, `81` (`where node`, `where git`, `git rev-parse --git-dir` — none inside a block);
     `grep -n "!ERRORLEVEL!"` → `48`, `116`; `grep -c 'cd /d "%~dp0OND-App"'` → `0`.
  3. `grep -n "npm install"` → nothing (exit 1); `grep -n "ensure-deps"` → `115:call node "%~dp0scripts\ensure-deps.js"`.
  4. `grep -n "goto DELETE_ME"` → `72` only; `start "OND Launcher" /D …` at `59`, `:DELETE_ME` at `60` (spawned once, before the loop);
     `git clone "!REPO_URL!"` at `47`, `:HANDOFF` at `55`; `grep -c "timeout /t 3 /nobreak"` → `1`.
  5. `grep -n "REPO_URL"` → `4:set "REPO_URL=https://github.com/Newton667/Odyssey-and-Dungeons.git"`, `5:if defined OND_REPO_URL set "REPO_URL=%OND_REPO_URL%"`, `47:git clone "!REPO_URL!" "%~dp0OND-App"`;
     `grep -c "Odyssey-and-Dungeons.git"` → `2`.
  6. `grep -c $'\r' start.bat` → `0`.
  7. `git diff --stat start.bat` → `1 file changed, 37 insertions(+), 21 deletions(-)`; hunks `@@ -1,6 +1,8 @@`, `@@ -37,23 +39,38 @@`, `@@ -95,13 +112,12 @@` only (header, bootstrap block, install block).
  8. Windows double-click: **not run here** (no Windows box, no faithful `cmd.exe`). User-owned before push; use a committed/pushed origin for `OND_REPO_URL` (Concerns 1).
  Full suite: `cd client && npm test` → `Test Files  6 passed (6) /       Tests  143 passed (143)`; `npx vite build` → `✓ built in 1.57s`.

**Changed:**
- `start.bat:4-5` — `REPO_URL` default + `OND_REPO_URL` override.
- `start.bat:40-73` — bootstrap block rewritten with `goto` labels: `APP_PRESENT` short-circuits, `OND-App\client` → `HANDOFF` without cloning, `git clone "!REPO_URL!"` checked with `!ERRORLEVEL!`, copy launcher only when missing, single `start "OND Launcher" /D`, then the deliberate `:DELETE_ME` loop paced by `timeout /t 3 /nobreak`.
- `start.bat:112-121` — install block now `call node "%~dp0scripts\ensure-deps.js"` with an `!ERRORLEVEL!` check; no inline `npm install`.

**Notes:** Plan block used verbatim (it has `pause >nul` in the clone-failed branch where the old code had `pause`; that is the plan's text). LF preserved in the working tree; Increment 3's `.gitattributes` takes over from here.

---

## Increment 3: `start.sh` for Linux, `.gitattributes`, executable bit
**Status:** done
**Started:** 11:08  **Finished:** 11:13

**What:** Add a bash launcher mirroring `start.bat` step for step, pin line endings so the shared
NTFS checkout cannot corrupt either launcher, and stage the executable bit in git.

**Where:**
- `start.sh` — **new file** at repo root.
- `.gitattributes` — **new file** at repo root:
  ```
  start.sh  text eol=lf
  start.bat text eol=crlf
  ```
- Git index only: `git add start.sh .gitattributes` then `git update-index --chmod=+x start.sh`
  (`update-index --chmod` only works on a path already in the index; `chmod +x` on the working
  tree is invisible here because `core.filemode=false`). Then
  `git add --renormalize start.bat start.sh`. **Staging, not committing** — do not commit.

**Details** (plan Increment 3, condensed; the plan's numbered skeleton 1-10 is the spec):
- `#!/usr/bin/env bash`, `set -u`, **never `set -e`** — retry loops, the update prompt and
  `xdg-open` are all allowed to fail.
- `SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`; `SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"`;
  `REPO_URL="${OND_REPO_URL:-https://github.com/Newton667/Odyssey-and-Dungeons.git}"`.
- Banner identical to `start.bat:5-8`. `open_url()`:
  `xdg-open "$1" >/dev/null 2>&1 || { [ "$(uname)" = Darwin ] && open "$1" >/dev/null 2>&1; } || echo "  Open this in your browser: $1"`
  (the `open` fallback is macOS-gated because `/usr/bin/open` is `openvt` on several distros).
- Node and Git checks as `while ! command -v … ; do … read -rp … ; done` loops with distro hints
  (`sudo dnf install nodejs npm` / `sudo apt install nodejs npm`) and `open_url` to the download
  pages — the loop is the bash equivalent of `goto START`.
- Bootstrap: only when **both** `client` and `server` are missing; if `OND-App/client` is
  missing, `git clone "$REPO_URL" "$SCRIPT_DIR/OND-App"` in an `until` retry loop; then
  `[ -f "$SCRIPT_DIR/OND-App/start.sh" ] || cp "$SCRIPT_DIR/$SCRIPT_NAME" "$SCRIPT_DIR/OND-App/start.sh"`
  (copy only when missing — same downgrade reasoning as the bat; `$SCRIPT_DIR/$SCRIPT_NAME`, not
  bare `${BASH_SOURCE[0]}`, which is cwd-relative under `bash start.sh`);
  `chmod +x "$SCRIPT_DIR/OND-App/start.sh"`; print the "The app has been downloaded to … You can
  delete this start.sh now. From now on, run OND-App/start.sh" box **once**; then
  `exec bash "$SCRIPT_DIR/OND-App/start.sh"`. **`exec` replaces the process; the message is
  shown once by design** (binding decision 2).
- `cd "$SCRIPT_DIR"`; `git config --global --add safe.directory "$SCRIPT_DIR" >/dev/null 2>&1`
  **before any other `git` call** (FUSE-mounted NTFS is a "dubious ownership" trigger; gotchas
  `:216-217`).
- Git init if `! git rev-parse --git-dir`: the same six commands as `start.bat:66-71`.
- Update check as `start.bat:77-93`: `git fetch origin main`; `LOCAL`/`REMOTE` via
  `git rev-parse`; if both non-empty and different → `read -rp "  Do you want to update? (y/n): "`;
  on `y|Y` → `git reset --hard origin/main >/dev/null 2>&1 && git pull origin main`.
- Dependencies: `node "$SCRIPT_DIR/scripts/ensure-deps.js" || { echo "  [ERROR] Dependency install failed."; read -rp "  Press Enter to exit… "; exit 1; }`.
- Start: `(cd "$SCRIPT_DIR/server" && exec node server.js) & SERVER_PID=$!`; `sleep 2`;
  `(cd "$SCRIPT_DIR/client" && exec npx vite) & CLIENT_PID=$!`;
  `trap 'trap - TERM; kill $SERVER_PID $CLIENT_PID 2>/dev/null; kill 0 2>/dev/null' INT TERM EXIT`;
  `sleep 5`; `open_url http://localhost:5173`; the "OND is running / Frontend
  `http://localhost:5173` / Backend `http://localhost:3001` / Press Ctrl+C to stop both servers"
  box; `wait`. The `exec` inside each subshell makes `$!` the node process itself; `kill 0`
  takes `npx`'s vite child with it. The `cd` into `server/` is load-bearing:
  `server/server.js:1` is `require('dotenv').config()`, which reads `.env` from `process.cwd()`.
- `.gitattributes`: `eol=lf` on `start.sh` is the load-bearing line (overrides Git for Windows'
  `autocrlf=true`, so the Windows side can never write a CRLF `start.sh` onto the shared disk).
  `eol=crlf` on `start.bat` makes the Windows checkout form explicit; the **blob stays LF** in the
  repo, and the raw GitHub download is the blob byte-for-byte (documented limit; plan Open
  question 2).

**Test spec:** n/a — a bash script. Every step is I/O (prompts, git, npm, process management);
there is no pure function worth extracting into Node just to unit-test it, and the behaviour that
matters (one clone, one hand-off, both servers stop on Ctrl+C) is only observable by running it.
The gates are `bash -n`, static greps, git-index checks, and the scratch-directory bootstrap run.

**Gates**
- ☑ **GREEN** — every check below holds:
  1. Plan Verify 3.1: `bash -n start.sh; echo $?` → `0`. (`shellcheck` is not installed on this
     machine — skip, do not install anything.)
  2. Plan Verify 3.2: `grep -c $'\r' start.sh` → `0`; `head -1 start.sh` → `#!/usr/bin/env bash`;
     `grep -n "set -e" start.sh` → nothing (`set -u` only).
  3. Plan Verify 3.3: after `git add start.sh .gitattributes && git update-index --chmod=+x start.sh`,
     `git ls-files -s start.sh` → mode `100755`. (`ls -l` is meaningless here — everything on
     this mount shows `-rwxr-xr-x`.)
  4. Plan Verify 3.4: `cat .gitattributes` → exactly the two lines above;
     `git check-attr eol start.sh start.bat` → `start.sh: eol: lf` and `start.bat: eol: crlf`;
     after `git add --renormalize start.bat start.sh`, `git cat-file -p :start.bat | grep -c $'\r'`
     → `0` (the index blob stays LF) and `git diff --cached --ignore-cr-at-eol start.bat` shows
     only Increment 2's edits.
  5. Static structure greps (each of the plan's load-bearing details):
     `grep -c "git clone" start.sh` → `1`;
     `grep -n 'exec bash "$SCRIPT_DIR/OND-App/start.sh"' start.sh` → exactly one line, and
     `grep -c "delete this start.sh" start.sh` → `1` (message once, no loop);
     `grep -n "OND-App/client" start.sh` → the short-circuit test;
     `grep -n '\[ -f "$SCRIPT_DIR/OND-App/start.sh" \] ||' start.sh` → the copy-only-when-missing guard;
     `grep -n "OND_REPO_URL" start.sh` → the `REPO_URL="${OND_REPO_URL:-…}"` default;
     `grep -n "safe.directory" start.sh` → its line number is smaller than that of the first
     `git rev-parse` / `git fetch` line (`grep -n "git rev-parse\|git fetch" start.sh`);
     `grep -n "ensure-deps.js" start.sh` → exactly one line; `grep -c "npm install" start.sh` → `0`;
     `grep -n "exec node server.js\|exec npx vite" start.sh` → both present, each inside a
     `(cd "$SCRIPT_DIR/…" && …)` subshell; `grep -n "kill 0" start.sh` → inside the `trap` line;
     `grep -n "Darwin" start.sh` → inside `open_url`; `grep -n "^set -" start.sh` → `set -u` only.
  6. Plan Verify 3.5, bootstrap path — **use a scratch snapshot repo as the origin, not the
     checkout path** (see Concerns 1: `git clone <local path>` clones HEAD, which has no `scripts/`
     and no `start.sh`, so the inner launcher would fail at the dependency step). With
     `S=/tmp/claude-1000/-mnt-Stuff-Stuff-DND-OND/d8108a71-a660-41c8-bf11-dafa8ba4390e/scratchpad`:
     ```
     rsync -a --exclude node_modules --exclude .git --exclude '*.pdf' --exclude dist /mnt/Stuff/Stuff/DND/OND/ "$S/fake-origin/"
     git -C "$S/fake-origin" init -q -b main && git -C "$S/fake-origin" add -A && git -C "$S/fake-origin" -c user.name=snapshot -c user.email=snapshot@localhost commit -qm snapshot
     mkdir -p "$S/bootstrap-test" && cp /mnt/Stuff/Stuff/DND/OND/start.sh "$S/bootstrap-test/"
     cd "$S/bootstrap-test" && OND_REPO_URL="$S/fake-origin" bash start.sh
     ```
     (The snapshot is ~7 MB without `node_modules`/PDFs; the copied `.gitignore` keeps `.env`,
     `*.env` and `Discord.md` out of the snapshot commit. The in-repo servers must **not** be
     running — ports 3001/5173 would clash.) Expected: exactly **one** `Cloning into '…/OND-App'…`;
     the "You can delete this start.sh now" box **once**; then, from `OND-App/`,
     `[1/4] Checking for updates...` → `Already up to date.`; `[2/4]` → the two `[deps] …` lines
     (fresh installs — network, minutes); `[3/4]`/`[4/4]`; the server's listen line and Vite's
     `Local: http://localhost:5173/`; the browser opens. `cmp "$S/bootstrap-test/OND-App/start.sh" /mnt/Stuff/Stuff/DND/OND/start.sh`
     → identical (the clone's tracked copy was kept; the copy guard did not fire). Ctrl+C →
     `pgrep -f "node server.js"; pgrep -f vite` → nothing. Then `cd "$S/bootstrap-test" && bash start.sh`
     again → **no** `Cloning into`, same box once, same hand-off, inner launcher continues.
     Ctrl+C. Clean up: `rm -rf "$S/bootstrap-test" "$S/fake-origin"`; optionally
     `git config --global --unset-all safe.directory "$S/bootstrap-test/OND-App"`.
  7. Plan Verify 3.6, in-repo path: `cd /mnt/Stuff/Stuff/DND/OND && ./start.sh` →
     `[deps] server OK (linux-x64)`, `[deps] client OK (linux-x64)`, the server listen line, Vite's
     `Local: http://localhost:5173/`, browser opens; Ctrl+C → `pgrep -f "node server.js"` and
     `pgrep -f vite` return nothing. HEAD equals `origin/main` today so the update prompt should
     not appear; **if it does, answer `n`** — `y` runs `git reset --hard origin/main`, which would
     discard the uncommitted Increment 1-2 edits to `start.bat` and `package.json`.

**Verify:** the seven steps above; `cd client && npm test` + `npx vite build` still pass (nothing
in this increment should affect them, but the full suite is the contract).

**Log:**
- 11:13 Test: n/a (bash script) — no RED gate. GREEN observed:
  1. `bash -n start.sh; echo $?` → `0`. shellcheck absent — skipped, not installed.
  2. `grep -c $'\r' start.sh` → `0`; `head -1` → `#!/usr/bin/env bash`; `grep -n "set -e"` → nothing (first draft's comment said
     "never `set -e`" and matched; reworded to "never errexit"); `grep -n "^set -"` → `9:set -u`.
  3. `git add start.sh .gitattributes && git update-index --chmod=+x start.sh` → `git ls-files -s start.sh` → `100755 0934d2d… 0 start.sh`
     (mode survived the later `git add` after the comment fix; `core.filemode=false`).
  4. `cat .gitattributes` → `start.sh  text eol=lf` / `start.bat text eol=crlf`; `git check-attr eol start.sh start.bat` →
     `start.sh: eol: lf` / `start.bat: eol: crlf`. After `git add --renormalize start.bat start.sh`: `git cat-file -p :start.bat | grep -c $'\r'` → `0`;
     working tree `grep -c $'\r' start.bat` → `0` still (git warned "LF will be replaced by CRLF the next time Git touches it" — expected, Concerns 5);
     `git diff --cached --ignore-cr-at-eol start.bat` → 3 hunks = Increment 2's edits only.
  5. Static: `git clone` count `1`; `exec bash "$SCRIPT_DIR/OND-App/start.sh"` one line (`:85`); `delete this start.sh` count `1`;
     `OND-App/client` short-circuit at `:60`; copy guard `[ -f "$SCRIPT_DIR/OND-App/start.sh" ] ||` at `:73`; `OND_REPO_URL` at `:13-14`;
     `safe.directory` at `:90` < first `git rev-parse` at `:93` / `git fetch` at `:97`; `ensure-deps.js` one line (`:127`); `npm install` count `0`;
     `exec node server.js` at `:139` and `exec npx vite` at `:145`, each inside `(cd "$SCRIPT_DIR/…" && …) &`; `kill 0` on the `trap` line `:149`;
     `Darwin` at `:27` inside `open_url`.
  6. Bootstrap (scratch snapshot origin `21ea881`, 123 files, 6.3 MB — `.env`/`Discord.md` absent, `start.sh`/`scripts/`/`.gitattributes` present):
     run 1 log → exactly one `Cloning into '…/bootstrap-test/OND-App'...`, the "You can delete this start.sh now" box once, inner banner,
     `[1/4] Checking for updates...` / `Already up to date.`, `[2/4]` → `added 130 packages` / `[deps] server OK (linux-x64)` / `added 107 packages` /
     `[deps] client OK (linux-x64)`, `[3/4]` → `No MONGODB_URI set — starting server without database.` / `Server running on http://localhost:3001`,
     `[4/4]` → `VITE v5.4.21 ready` / `Local: http://localhost:5173/`. `cmp OND-App/start.sh <repo>/start.sh` → identical (copy guard did not fire).
     Second run (clean) → `Cloning=0`, box once, same hand-off, both `[deps] … OK`, both servers up on 3001/5173. SIGINT to the script pid →
     `ps` shows no `start.sh` / `node server.js` / vite processes; `ss` shows 3001/5173 free. Scratch dirs removed; scratch `safe.directory` unset.
  7. In-repo `./start.sh` → `[1/4] … Already up to date.` (no update prompt; stdin was closed anyway so `y` was impossible),
     `[deps] server OK (linux-x64)` / `[deps] client OK (linux-x64)`, `Connected to MongoDB Atlas` / `Server running on http://localhost:3001`,
     `Local: http://localhost:5173/`; SIGINT → no launcher processes remain, ports free.
  Full suite: `cd client && npm test` → `Test Files  6 passed (6) /       Tests  143 passed (143)`; `npx vite build` → `✓ built in 1.57s`.
  Harness note (not a script issue): my first two shutdown attempts signalled the wrong PID — `setsid` had forked, and `cd … && cmd &`
  backgrounds a forked subshell — so the trap never received anything and run 2's first attempt hit `EADDRINUSE` from run 1's survivors.
  Diagnosed via `/proc/<pid>/status` + `ps -o pgid,sid`; re-run with `( cd … && exec python3 wrapper ) &` (same PID all the way, SIGINT reset to
  default, own session). Once the real script pid was signalled, both the INT and the TERM trap paths cleaned up everything.

**Changed:**
- `start.sh` — new (155 lines), the plan's ten-step skeleton: `set -u`, `SCRIPT_DIR`/`SCRIPT_NAME`/`REPO_URL` with `OND_REPO_URL` override, banner,
  `open_url` (xdg-open → macOS-gated `open` → print URL), Node/Git `while` loops with dnf/apt hints, bootstrap (both dirs missing → clone unless
  `OND-App/client` exists, copy launcher only when missing, box once, `exec`), `safe.directory` before any other git call, git init block,
  update check (`y|Y` → `git reset --hard origin/main && git pull`), `ensure-deps.js`, both servers via `(cd … && exec …) &`, trap with `kill 0`, `wait`.
- `.gitattributes` — new, the two lines. Staged; `start.bat` renormalized (index blob still LF).
- Git index: `start.sh` mode `100755`.

**Notes:** Browser tabs — each live run called `xdg-open http://localhost:5173` as the plan's gate expects (three tabs may be open on the desktop).
Working tree `start.bat` is still LF; git will rewrite it CRLF on the next checkout/reset (expected).

---

## Increment 4: Docs + changelog
**Status:** done
**Started:** 11:13  **Finished:** 11:16

**What:** Document the Linux launcher, the platform marker and the two batch traps; update every
"Windows-only launcher" statement. Exact text is in the plan's "Docs & changelog" section — copy
it from there; do not paraphrase the CHANGELOG entry or the three gotcha entries.

**Where:**
- `CHANGELOG.md:29` — the `## vX.X.X — Unreleased` block (currently empty; the plan says `:28`,
  which is the blank line above it). Two `### Added` bullets and one `### Fixed` bullet, verbatim
  from the plan, including the "download it again once" instruction for holders of an old
  standalone `start.bat`.
- `Docs/start-bat.md` — retitle to "start.bat / start.sh Reference" (keep the filename; it is
  linked from `CLAUDE.md`, `CHANGELOG.md:22`, `README.md:93`). Flow diagram: bootstrap branch →
  "git clone into OND-App/ → copy launcher in **if missing** → **start** the copy (bat:
  `start … /D` in a new window, then the original window loops 'you can delete this start.bat
  now' every 3 s until closed — deliberate; sh: `exec`, message once)"; dependencies step →
  `node scripts/ensure-deps.js` with the marker/wipe description. Add a "Linux (`start.sh`)"
  section and the "For Developers" notes (`.gitattributes`, `git update-index --chmod=+x`,
  `core.filemode=false`, test the bootstrap by copying only the launcher into an empty folder,
  the `OND_REPO_URL` override, the raw-download LF limit).
- `Docs/architecture.md:8` (Deployment line) and `:34` (tree: add `start.sh`,
  `scripts/ensure-deps.js`, `.gitattributes`).
- `README.md:21` (Deployment), `:25-27` (add "### Linux": `chmod +x start.sh && ./start.sh` or
  `bash start.sh`), the "Manual setup (any OS)" note that root `npm install` now rebuilds
  dependencies when the OS changes, `:78` (tree), `:93` (link text "launcher script reference
  (Windows and Linux)").
- `Docs/known-patterns-and-gotchas.md` — the plan's three new entries: (1) "`node_modules` is
  platform-specific — never share it across OSes without rebuilding"; (2) "Batch: `%VAR%` inside a
  parenthesised block is expanded when the block is parsed"; (3) "Batch: `%~dp0` never changes",
  including the sentence that **the `:DELETE_ME` loop is intentional — do not "fix" it into a
  single message; the `start` line must stay before the loop.** Leave the existing "Git Safe
  Directory" entry (`:216-217`) in place.
- `Docs/plans/2026-09-13-cross-platform-launcher.md:3` — `**Status:** Draft` → `Done`.
- **Do not bump `client/src/version.js`** and do not rename the Unreleased heading — no push
  was requested.

**Test spec:** n/a — documentation. No assertable logic; the gate is the greps below.

**Gates**
- ☑ **GREEN** — CHANGELOG entry present under the correct headings inside
  `## vX.X.X — Unreleased`; every named file updated; all greps below come back as stated;
  `cd client && npm test` and `npx vite build` still pass.

**Verify:**
```
grep -rn "Windows start.bat launcher\|Windows launcher" README.md Docs/architecture.md      # nothing
grep -n "start.sh" README.md Docs/start-bat.md Docs/architecture.md Docs/known-patterns-and-gotchas.md CHANGELOG.md
                                                                                            # ≥1 hit in each of the five
grep -n "ensure-deps" Docs/start-bat.md Docs/known-patterns-and-gotchas.md CHANGELOG.md     # ≥1 hit in each of the three
grep -n "always runs npm install\|Relaunch from OND-App" Docs/start-bat.md                  # nothing (old flow text gone)
grep -n "^# " Docs/start-bat.md                                                             # "# start.bat / start.sh Reference"
grep -n "DELETE_ME\|delete this start.bat" Docs/start-bat.md Docs/known-patterns-and-gotchas.md
                                                                                            # ≥1 hit in each (the loop is documented as deliberate)
grep -n "%~dp0\|parenthesised block" Docs/known-patterns-and-gotchas.md                     # both new batch gotchas present
grep -n "### Linux" README.md                                                               # the new subsection
grep -n "download it again once" CHANGELOG.md                                               # the re-download instruction
grep -n "^## vX.X.X — Unreleased" -A 6 CHANGELOG.md                                         # shows ### Added with the two bullets
git diff --quiet client/src/version.js && echo "version untouched"                          # prints "version untouched"
grep -n "^\*\*Status:\*\*" Docs/plans/2026-09-13-cross-platform-launcher.md                 # Done
```

**Log:**
- 11:16 Test: n/a (documentation). GREEN observed — every verify grep as stated:
  [a] `grep -rn "Windows start.bat launcher\|Windows launcher" README.md Docs/architecture.md` → nothing (exit 1).
  [b] `start.sh` hits: README.md 4, Docs/start-bat.md 12, Docs/architecture.md 3, Docs/known-patterns-and-gotchas.md 3, CHANGELOG.md 1.
  [c] `ensure-deps` hits: Docs/start-bat.md 4, Docs/known-patterns-and-gotchas.md 1, CHANGELOG.md 1.
  [d] `always runs npm install\|Relaunch from OND-App` in Docs/start-bat.md → nothing. [e] `grep -n "^# " Docs/start-bat.md` → `1:# start.bat / start.sh Reference`.
  [f] `DELETE_ME\|delete this start.bat`: Docs/start-bat.md 4, gotchas 1. [g] gotchas `:222 ### Batch: %VAR% inside a parenthesised block…`, `:225 ### Batch: %~dp0 never changes`.
  [h] README `:31:### Linux`. [i] CHANGELOG `:36` contains "download it again once". [j] `## vX.X.X — Unreleased` at `:29` followed by `### Added` (two bullets) and `### Fixed` (one bullet).
  [k] `git diff --quiet client/src/version.js` → `version untouched`. [l] plan `:3 **Status:** Done`.
  `cd client && npm test` → `Test Files  6 passed (6)` / `Tests  143 passed (143)`; `npx vite build` → `✓ built in 1.58s`.

**Changed:**
- `CHANGELOG.md:29-37` — `### Added` (two bullets) and `### Fixed` (one bullet) under `## vX.X.X — Unreleased`, verbatim from the plan. Version not bumped.
- `Docs/start-bat.md` — rewritten: retitled, flow diagram with the hand-off (bat loop deliberate / sh `exec` once) and the `ensure-deps.js` step, Key Features, new "Windows (`start.bat`)" and "Linux (`start.sh`)" sections, expanded "For Developers" (`.gitattributes`, `update-index --chmod`, `core.filemode=false`, bootstrap test recipe, `OND_REPO_URL`, raw-download LF limit, the two batch traps).
- `Docs/architecture.md:8` — Deployment line; `:33-38` — tree gains `scripts/ensure-deps.js`, `start.sh`, `.gitattributes`.
- `README.md:21` — Deployment line; `:27-39` — standalone `start.bat` note + new `### Linux` subsection; `:45-46` — `npm install` rebuild note; `:57` — `npm run deps`; tree; `:104` — link text "(Windows and Linux)".
- `Docs/known-patterns-and-gotchas.md:216-226` — "Git Safe Directory" extended to both launchers (kept in place), plus the three new entries from the plan.
- `Docs/plans/2026-09-13-cross-platform-launcher.md:3` — `Draft` → `Done`.

**Notes:** Added one line the plan did not list — README "Other root scripts" now mentions `npm run deps`, since Increment 1 added that script; harmless doc completeness.

---

## Concerns

**1. The plan's bootstrap gates (Verify 2.5 and 3.5) point `OND_REPO_URL` at "this checkout",
but `git clone <local path>` clones HEAD, not the working tree.** HEAD (`2136b83`) has no
`scripts/`, no `start.sh` and the old `start.bat`, so a clone from `/mnt/Stuff/Stuff/DND/OND`
would produce an `OND-App` whose inner launcher dies at `node scripts/ensure-deps.js` (file not
found) and never reaches the servers — a false red, and the very failure the override was meant
to avoid. The executor must not commit to work around this (no commit was requested). Increment
3's gate 6 therefore builds a throwaway snapshot repo in the scratchpad (`rsync` the working tree
minus `node_modules`/`.git`/PDFs, `git init` + one commit) and uses **that** as `OND_REPO_URL`. The
same hole applies to the Windows test in Increment 2 gate 8: a local-path override only works
after the changes are committed, so the user's Windows run should happen after the commit (or
after the push, with the real URL).

**2. Increment 1's unit test is `node:test`, not vitest — the one addition beyond the plan's
letter.** The plan specifies no unit test for `ensure-deps.js`. I extracted the one genuinely
pure decision (`assessTree(existing, platform, nmExists)` → `{ ok, wipe, status }`) and specified
`scripts/ensure-deps.test.js` on Node's built-in runner because (a) vitest cannot run in this
checkout until Increment 1 itself has rebuilt `node_modules`, so a vitest gate could never be
observed red first; (b) the script is CommonJS at the repo root, outside the client's vite root,
and a vitest 4 / vite 5 inlining failure would be a false red; (c) the script is deliberately
dependency-free and pre-install, and its test should share that property. It changes no
behaviour: `main()` still does exactly what the plan says, it just asks `assessTree` for the
decision and the `--check` status text. This adds a second, tiny test convention
(`node --test scripts/…`) that `cd client && npm test` does not run. If the executor or user
declines the extraction, Increment 1 loses its RED gate and rests on the shell gates alone — say
so in the Log rather than ticking RED.

**3. Increment 1 is destructive on this machine and needs the network.** Both `node_modules`
trees exist with no marker, so the first run wipes and reinstalls both (the plan's accepted
one-time cost). After that the shared checkout is Linux-flavoured; booting Windows and running
the *old* `start.bat` would run a bare `npm install` on it. Increments 1 and 2 belong in the
same session, as the plan's Risks say.

**4. Increment 2 cannot be executed here at all.** Its GREEN is entirely static greps plus a
diff-scope check; the double-click behaviour is user-owned on Windows (plan Open question 3).
The greps are specific enough to catch every regression the plan names (a `goto START` after the
copy, a `%ERRORLEVEL%` inside a block, a second `start` inside the loop, a bare `npm install`),
but they cannot prove the `start … /D` hand-off actually opens a second window. Record the
Windows run as "not run here" in the Log.

**5. `.gitattributes` `eol=crlf` applies on every platform, including this Linux checkout.**
After `git add --renormalize`, the working-tree `start.bat` stays LF until git next rewrites the
file (checkout/reset), at which point it becomes CRLF here too. That is the plan's intent (Open
question 2, recommendation "yes") and harmless — `start.bat` only runs on Windows — but the
executor should not "fix" a CRLF `start.bat` in the working tree afterwards, and Increment 2's
`grep -c $'\r' start.bat → 0` is a working-tree check valid only before Increment 3; from then on
the correct gate is the index blob (`git cat-file -p :start.bat`), as written in Increment 3.

**6. The in-repo `./start.sh` gate can destroy uncommitted work if answered carelessly.** HEAD
equals `origin/main` today, so no update prompt is expected; but if upstream gains a commit
before the gate runs, answering `y` executes `git reset --hard origin/main`, which discards the
Increment 1-2 edits to `start.bat` and `package.json` (the untracked `scripts/` and `start.sh`
would survive). Answer `n`. This is inherent to the launcher's design and unchanged from the bat.

**7. `shellcheck` is not installed**; the plan already marks it optional. Do not install it.

**8. Slicing and ordering are sound.** 1 → 2 → 3 → 4 is the only viable order: 2 and 3 both
call the script from 1; 3's `.gitattributes` changes how 2's file is checked out; 4 documents all
three. Nothing is cuttable except 4, and 4 is required by CLAUDE.md. The only anchor nit is
`CHANGELOG.md:28` → `:29`; every other reference resolves (see "Line references verified").
