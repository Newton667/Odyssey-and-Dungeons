#!/usr/bin/env node
'use strict';
// ensure-deps.js — platform-aware dependency install for OND.
//
// Installed node_modules trees are platform-specific: Vite's rollup and esbuild ship a native
// binary per OS/arch as optional dependencies, so a tree built on Windows fails on Linux with
// `Cannot find module @rollup/rollup-linux-x64-gnu` (and vice versa). This checkout lives on a
// shared NTFS partition and is used from both OSes.
//
// For each of server/ and client/ this script compares a marker file
// `node_modules/.ond-platform` (contents: `${process.platform}-${process.arch}`) against the
// running platform. If node_modules exists and the marker is missing or differs, the tree is
// deleted, then `npm install` runs, then the marker is written. Both launchers (start.bat,
// start.sh) and the root package.json `postinstall` call this, so a foreign-platform tree is
// healed by any of the documented setup paths.
//
// Plain CommonJS, Node built-ins only — it runs before anything is installed.
//
// Usage:
//   node scripts/ensure-deps.js          install / rebuild as needed
//   node scripts/ensure-deps.js --check  report only; exit 0 if every marker matches, else 1

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PLATFORM = `${process.platform}-${process.arch}`;
const MARKER = '.ond-platform';
const DIRS = ['server', 'client'];

/**
 * The one pure decision. Given the trimmed marker contents (or null when the marker is absent),
 * the running platform key, and whether <dir>/node_modules exists at all, decide what to do.
 *
 *   ok    — marker matches the running platform
 *   wipe  — an existing tree that is foreign or unmarked must be deleted before installing
 *   status — one-line human summary used by --check and the happy path
 */
function assessTree(existing, platform, nmExists) {
  const ok = existing === platform;
  return {
    ok,
    wipe: nmExists && !ok,
    status: ok
      ? `OK (${platform})`
      : existing == null
        ? `no marker (want ${platform})`
        : `built for ${existing} (want ${platform})`,
  };
}

function readMarker(markerPath) {
  return fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf8').trim() : null;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  let allOk = true;

  for (const dir of DIRS) {
    const cwd = path.join(ROOT, dir);
    const nm = path.join(cwd, 'node_modules');
    const markerPath = path.join(nm, MARKER);
    const existing = readMarker(markerPath);
    const nmExists = fs.existsSync(nm);
    const { ok, wipe, status } = assessTree(existing, PLATFORM, nmExists);

    if (checkOnly) {
      console.log(ok ? `[deps] ${dir} OK (${PLATFORM})` : `[deps] ${dir}: ${status}`);
      if (!ok) allOk = false;
      continue;
    }

    if (wipe) {
      console.log(`[deps] ${dir}/node_modules was built for ${existing ?? 'an unknown platform'}, rebuilding for ${PLATFORM}…`);
      try {
        // On Windows a still-running "OND Client" window keeps esbuild.exe open and rmSync throws
        // EBUSY/EPERM; retry briefly, then tell the user what to do instead of a stack trace.
        fs.rmSync(nm, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
      } catch (err) {
        console.error(`[deps] Could not remove ${dir}/node_modules — close any running OND windows and run the launcher again.`);
        console.error(`[deps] (${err.code || err.message})`);
        process.exit(1);
      }
    }

    // Not --silent: that hides npm's own error report (ENOTFOUND, EACCES, EBUSY…) and the
    // launchers' "See messages above" would point at nothing. --loglevel=error is quiet on
    // success and prints the error on failure. shell:true on Windows is required for .cmd
    // resolution under Node >= 18.20 / 20.12 (spawn EINVAL otherwise) — and with a shell the
    // command must be ONE string: an args array + shell:true trips Node 24's DEP0190 warning.
    // Every arg is a fixed literal with no spaces, so concatenation is safe.
    const isWin = process.platform === 'win32';
    const args = ['install', '--loglevel=error', '--no-audit', '--no-fund'];
    const r = isWin
      ? spawnSync(`npm.cmd ${args.join(' ')}`, { cwd, stdio: 'inherit', shell: true })
      : spawnSync('npm', args, { cwd, stdio: 'inherit' });
    if (r.error) {
      console.error(`[deps] Could not run npm in ${dir}/: ${r.error.message}`);
      process.exit(1);
    }
    if (r.status !== 0) {
      console.error(`[deps] npm install failed in ${dir}/ (exit ${r.status}).`);
      process.exit(r.status || 1);
    }

    fs.mkdirSync(nm, { recursive: true });
    fs.writeFileSync(markerPath, PLATFORM + '\n');
    console.log(`[deps] ${dir} OK (${PLATFORM})`);
  }

  if (checkOnly) process.exit(allOk ? 0 : 1);
}

module.exports = { assessTree, PLATFORM, MARKER };

if (require.main === module) main();
