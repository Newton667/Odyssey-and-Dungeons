# Review — Cross-Platform Launcher and Platform-Aware Dependencies

**Date:** 2026-09-13
**Plan:** `Docs/plans/2026-09-13-cross-platform-launcher.md`
**Increments:** `Docs/increments/2026-09-13-cross-platform-launcher.md` (4/4 done)
**Agents:** `ond-reviewer` over the working-tree diff. `ond-dnd-auditor` was **skipped**: the diff touches no file under `client/src/` or `server/`, only launcher scripts, `scripts/ensure-deps.js`, root `package.json`, `.gitattributes` and docs — there is no D&D rules logic to audit.
**Suite at review time:** 143 passed (6 files) · 8/8 `node --test` on `scripts/ensure-deps.test.js` · `vite build` clean

## Verdict

**Clean with minor fixes.** Zero HIGH findings. Two MEDIUM (both verified by the orchestrator against the real files), three LOW, one pre-existing note outside the diff. No correctness bug in the dependency decision logic, marker ordering, batch restructure or bash hand-off. Both user decisions (the deliberate repeating `:DELETE_ME` message in `start.bat`; the single message + `exec` in `start.sh`) are implemented as specified and documented as intentional.

**Nothing has been fixed yet** — these findings are for the user to act on before committing.

---

## MEDIUM — Node 24 deprecation warning on the Windows install path · CONFIRMED

`scripts/ensure-deps.js:93-97` calls `spawnSync('npm.cmd', ['install', …], { shell: true })` on win32. Node 24 emits `[DEP0190] DeprecationWarning: Passing args to a child process with shell option true …` for an args array combined with `shell: true`. Reproduced on this machine (Node v24.18.0). Linux is unaffected (`shell` is `false` there), but every Windows user on Node ≥ 24 sees the warning twice per launch, right where `start.bat` says "See messages above".

**Fix:** on Windows pass one command string and no args array:

```js
const args = ['install', '--loglevel=error', '--no-audit', '--no-fund'];
const r = isWin
  ? spawnSync(`npm.cmd ${args.join(' ')}`, { cwd, stdio: 'inherit', shell: true })
  : spawnSync('npm', args, { cwd, stdio: 'inherit' });
```

All args are fixed literals with no spaces, so concatenation is safe.

## MEDIUM — `start.sh` prompt loops spin when stdin is not a terminal · CONFIRMED mechanics, PLAUSIBLE trigger

`start.sh:32-42` (Node missing), `:45-55` (Git missing) and `:63-68` (clone retry) each `read -rp … _` inside a loop. With `set -u` only (no `set -e`), `read` returns 1 immediately at EOF (verified: `read -rp x _ </dev/null` exits 1). If the script is launched without a terminal — a file manager's "Run" action, or stdin redirected from `/dev/null` — the Node-missing loop becomes a tight `while` that calls `open_url` (`xdg-open`) on every iteration, opening browser windows without bound; the clone loop hammers `git clone` with no pause. The bat is not exposed (a double-clicked `.bat` always has a console), but "double-click in a file manager with Node missing" is exactly the first-time Linux user.

**Fix:** bail out when the prompt cannot be answered: `read -rp "…" _ || exit 1` in all three loops and at the `Press Enter to exit` on `:129` (or at minimum `read … || sleep 5`).

## LOW — `kill 0` may take a script-launched browser with it · PLAUSIBLE

`start.sh:149,153`: `open_url` runs `xdg-open` in the foreground. Where `xdg-open` delegates to the desktop session (`gio open`, `kde-open`) the browser is unaffected; in its generic fallback a browser started by this script (no instance already running) joins the script's process group and receives the trap's `kill 0`. Hardening: `setsid xdg-open "$1" >/dev/null 2>&1` or `nohup … &` in `open_url`.

## LOW — trap installed after the servers start · not a bug

`start.sh:139-149`: a Ctrl+C in the ~2 s window before the `trap` line reaches `node server.js` directly from the terminal (same process group), so nothing is orphaned. Optional: move the `trap` above `:139` so the comment on `:147-148` is literally true.

## LOW — update-prompt condition differs slightly between launchers

`start.bat:98-101` prompts when `LOCAL != REMOTE` and `REMOTE` is non-empty (including an empty `LOCAL`); `start.sh:110` requires both non-empty. Harmless (an unborn HEAD just proceeds to deps) but the doc says "mirrors step for step". No action needed unless exact parity is wanted.

## Pre-existing, outside the diff

`git config --global --add safe.directory …` (`start.sh:90`, `start.bat:77`, `server/server.js`) appends a duplicate `[safe] directory` line to `~/.gitconfig` on every launch. `start.sh` faithfully mirrors the existing bat, so not a regression, but the new file makes the growth visible on Linux too. `git config --global --get-all safe.directory | grep -qxF "$SCRIPT_DIR" || git config --global --add …` would stop it.

---

## Verified correct

- **`assessTree` decision table** — all rows (match, foreign both directions, no marker with/without tree, stray marker without tree, arch in key) asserted with `deepEqual` on the full `{ok, wipe, status}`; 8/8 `node --test` pass.
- **Marker ordering** — `rmSync` → `npm install` → status check (`r.status || 1` handles a signal-killed `null`) → `mkdirSync` → `writeFileSync`. A failed install never leaves a marker; a partial tree without a marker is wiped on the next run.
- **`--check`** — reports per-directory text, never installs or deletes, exits 0 only when every marker matches.
- **No side effects on require**; `require.main` guard correct. `rmSync` has `maxRetries: 3, retryDelay: 500` inside `try/catch` with the "close any running OND windows" message.
- **`start.bat`** — `%ERRORLEVEL%` only on `if` lines outside any block (`:16`, `:29`, `:81`); `!ERRORLEVEL!` after `git clone` (`:48`) and `ensure-deps` (`:116`); the only `goto START` on the bootstrap path is the clone-failed branch (`:53`); `git clone` (`:47`) precedes `:HANDOFF` (`:55`); exactly one `start "OND Launcher" /D …` (`:59`) before `:DELETE_ME` (`:60`); `timeout /t 3 /nobreak >nul` (`:71`) paces the deliberate loop; `OND_REPO_URL` override at `:5`; copy guarded by `if not exist`; all paths quoted; no `cd /d "%~dp0OND-App"` remains.
- **`start.sh`** — `bash -n` clean; zero CR bytes; every variable defined before use under `set -u`; `cp "$SCRIPT_DIR/$SCRIPT_NAME"` not the cwd-relative form; single `exec` hand-off; `safe.directory` precedes the first git call; `git reset --hard` gated on `y|Y`; `exec` inside both server subshells so `$!` is the real PID; `cd server` preserved for `dotenv`; `trap - TERM` before `kill 0`; macOS-gated `open`.
- **`.gitattributes` / index** — `start.sh: eol: lf`, `start.bat: eol: crlf`; `start.sh` at `100755`; the `start.bat` index blob has 0 CR bytes.
- **Project requirements** — CHANGELOG entries under `## vX.X.X — Unreleased` (`### Added` ×2, `### Fixed` ×1), user-facing wording, no emojis; `client/src/version.js` untouched at `v1.6.2`; no `package-lock.json` changes; `scripts/` not ignored; `Docs/start-bat.md`, `architecture.md`, `README.md`, `known-patterns-and-gotchas.md` updated as the plan lists, including the "the `:DELETE_ME` loop is intentional" note.

## Not run here

- The `start.bat` double-click bootstrap on a real Windows machine (no `cmd.exe` in this environment; static gates only). Run it once after commit/push — a local-path `OND_REPO_URL` only works against a committed repo.

---

## Post-review fixes (2026-09-13, before push)

A second review pass (`/code-review high`) was interrupted by a session rate limit before it
produced a findings list; two of its verifier agents reported directly and the orchestrator
finished the pass inline over `scripts/ensure-deps.js`, `start.sh` and `start.bat`.

- **FIXED — MEDIUM, DEP0190 on Windows.** `scripts/ensure-deps.js` now passes one command
  string with `shell: true` on win32 and an args array with no shell elsewhere.
- **FIXED — MEDIUM, spinning prompt loops.** Every `read` in a `start.sh` retry loop is now
  `read … || exit 1`, so a launcher started with no terminal exits instead of spinning.
- **FIXED — LOW, trap after servers start.** `start.sh` pre-declares both PIDs and installs the
  trap before the first server starts.
- **FIXED — pre-existing, `safe.directory` growth.** `start.sh` checks
  `git config --global --get-all safe.directory` before adding, so `~/.gitconfig` no longer
  gains a duplicate line per launch (the bat is unchanged).
- **FIXED — new, PLAUSIBLE (verifier V8): the update path rewrote the running `.bat`.**
  `git reset --hard` inside the update block replaces `start.bat` while cmd.exe is executing
  it; cmd resumes a batch file by byte offset, so the old file continued 12 bytes into the new
  `echo  [1/4] …` line (one spurious "'Checking' is not recognized", benign this time, but any
  future layout shift above the block could land inside a `start "OND Server" cmd /k …`
  fragment). `start.bat` now relaunches `%~f0` via `start "OND Launcher" /D "%~dp0"` and
  `exit`s immediately after the pull. bash is not exposed — it keeps the old inode open — so
  `start.sh` is unchanged. Note this adds a **second** `start "OND Launcher"` line to the file
  (`:114`, inside the update block); the bootstrap-path gate "one launcher `start` before
  `:DELETE_ME`" still holds.
- **REFUTED (verifier V13):** "`/api/pull-update` still runs a bare `npm install` and skips the
  marker." Deliberately out of scope per the plan; npm leaves `node_modules/.ond-platform` in
  place, so the only effect is the already-documented one-time rebuild on first launch.
- **Not addressed — LOW:** `kill 0` may take a script-launched browser with it (only in
  `xdg-open`'s generic fallback); the bat/sh update-prompt condition differs on an unborn HEAD.

Re-verified after the fixes: `node --test scripts/ensure-deps.test.js` 8/8, `npm test`
143/143 (6 files), `vite build` clean, `bash -n start.sh` clean, 0 CR bytes in both launchers,
`--check` reports both trees `OK (linux-x64)`.
