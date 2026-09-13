#!/usr/bin/env bash
# ond-desktop.sh — what OND.desktop runs.
#
# A .desktop entry is launched by the desktop session, not by a login shell, so anything that
# ~/.bashrc puts on PATH (nvm's Node.js in particular) is missing. This wrapper loads nvm when
# it is present, cds to the repo root (wherever this checkout lives — no absolute paths here)
# and hands off to the normal Linux launcher. Everything after that is start.sh: update check,
# dependency install, both servers in this terminal, browser open, Ctrl+C stops all.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi

cd "$ROOT" || { echo "  [ERROR] Cannot cd to $ROOT"; read -rp "  Press Enter to exit... " _; exit 1; }
exec bash "$ROOT/start.sh"
