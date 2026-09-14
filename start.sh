#!/usr/bin/env bash
# OND - Odyssey and Dragons — Linux launcher.
# Mirrors start.bat step for step: check Node.js and Git, clone the app into OND-App/ when run on
# its own, offer updates, install dependencies (platform-aware), start both servers in this
# terminal and open the browser. Ctrl+C stops everything.
#
# Deliberately `set -u` only, never errexit: the retry loops, the update prompt and the
# optional browser open are all allowed to fail; the flow keeps going like the bat does.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
# OND_REPO_URL lets the bootstrap be tested against a local checkout / snapshot repo.
REPO_URL="${OND_REPO_URL:-https://github.com/Newton667/Odyssey-and-Dungeons.git}"

echo
echo "  ========================================"
echo "    OND - Odyssey and Dragons"
echo "    Your Local DnD Companion"
echo "  ========================================"
echo

# Open a URL in the default browser. The `open` fallback is gated on macOS because on several
# Linux distros /usr/bin/open is `openvt`, which opens a virtual console instead.
open_url() {
  xdg-open "$1" >/dev/null 2>&1 \
    || { [ "$(uname)" = Darwin ] && open "$1" >/dev/null 2>&1; } \
    || echo "  Open this in your browser: $1"
}

# ─── Check Node.js ──────────────────────────────────
# Every prompt is `read … || exit 1`: with no terminal (a file manager's "Run", stdin at EOF)
# `read` returns 1 immediately and a bare loop would spin — re-opening the browser without bound.
while ! command -v node >/dev/null 2>&1; do
  echo "  [SETUP] Node.js is not installed."
  echo "  Fedora/Nobara:  sudo dnf install nodejs npm"
  echo "  Debian/Ubuntu:  sudo apt install nodejs npm"
  echo "  Or download the LTS from https://nodejs.org/en/download"
  echo "  Opening download page..."
  open_url "https://nodejs.org/en/download"
  echo
  read -rp "  Install Node.js LTS, then press Enter to continue... " _ || exit 1
  echo
done

# ─── Check Git ──────────────────────────────────────
while ! command -v git >/dev/null 2>&1; do
  echo "  [SETUP] Git is not installed."
  echo "  Fedora/Nobara:  sudo dnf install git"
  echo "  Debian/Ubuntu:  sudo apt install git"
  echo "  Or download it from https://git-scm.com/downloads"
  echo "  Opening download page..."
  open_url "https://git-scm.com/downloads"
  echo
  read -rp "  Install Git, then press Enter to continue... " _ || exit 1
  echo
done

# ─── Check if app files exist ───────────────────────
# Standalone launcher (no client/ or server/ next to it): clone into OND-App/ and hand off.
if [ ! -d "$SCRIPT_DIR/client" ] && [ ! -d "$SCRIPT_DIR/server" ]; then
  if [ ! -d "$SCRIPT_DIR/OND-App/client" ]; then
    echo "  [SETUP] App files not found. Downloading..."
    echo
    until git clone "$REPO_URL" "$SCRIPT_DIR/OND-App"; do
      echo
      echo "  [ERROR] Download failed. Check your internet."
      read -rp "  Press Enter to retry... " _ || exit 1
      echo
    done
  fi
  # The clone already contains the tracked, current launcher; only fill the gap if it is missing
  # (overwriting it with this possibly older downloaded copy would be a downgrade).
  [ -f "$SCRIPT_DIR/OND-App/start.sh" ] || cp "$SCRIPT_DIR/$SCRIPT_NAME" "$SCRIPT_DIR/OND-App/start.sh"
  chmod +x "$SCRIPT_DIR/OND-App/start.sh"
  echo
  echo "  ========================================"
  echo "    The app has been downloaded to:"
  echo "    $SCRIPT_DIR/OND-App"
  echo
  echo "    You can delete this start.sh now."
  echo "    From now on, run OND-App/start.sh"
  echo "  ========================================"
  echo
  # exec replaces this process with the inner launcher, so this script cannot loop back here.
  exec bash "$SCRIPT_DIR/OND-App/start.sh"
fi

# ─── Mark directory as safe for git ────────────────
# Must come before any other git call: FUSE-mounted NTFS is a "dubious ownership" trigger.
cd "$SCRIPT_DIR" || exit 1
git config --global --get-all safe.directory 2>/dev/null | grep -qxF "$SCRIPT_DIR" \
  || git config --global --add safe.directory "$SCRIPT_DIR" >/dev/null 2>&1

# ─── Init git if needed ─────────────────────────────
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "  [SETUP] Setting up auto-updates..."
  git init >/dev/null 2>&1
  git remote add origin https://github.com/Newton667/Odyssey-and-Dungeons.git >/dev/null 2>&1
  git fetch origin main >/dev/null 2>&1
  git reset --mixed origin/main >/dev/null 2>&1
  git branch -M main >/dev/null 2>&1
  git branch --set-upstream-to=origin/main main >/dev/null 2>&1
  echo "  Done. Auto-updates enabled."
  echo
fi

# ─── Check for updates ──────────────────────────────
# Only offer an update when HEAD is strictly BEHIND origin/main. When HEAD is ahead or has
# diverged, `git reset --hard origin/main` would silently drop local commits that are not on GitHub.
echo "  [1/4] Checking for updates..."
git fetch origin main >/dev/null 2>&1
LOCAL="$(git rev-parse --verify --quiet HEAD 2>/dev/null)"
REMOTE="$(git rev-parse --verify --quiet origin/main 2>/dev/null)"
BEHIND=0
if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ] \
   && git merge-base --is-ancestor HEAD origin/main >/dev/null 2>&1; then
  BEHIND="$(git rev-list --count HEAD..origin/main 2>/dev/null)"
fi
if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ] && [ "${BEHIND:-0}" = 0 ]; then
  echo "  [UPDATE] Skipped: this folder has local commits that are not on GitHub."
elif [ "${BEHIND:-0}" != 0 ]; then
  echo "  [UPDATE] New version available!"
  echo
  DOUPDATE=""
  read -rp "  Do you want to update? (y/n): " DOUPDATE
  case "$DOUPDATE" in
    y|Y)
      git reset --hard origin/main >/dev/null 2>&1 && git pull origin main
      ;;
  esac
else
  echo "  Already up to date."
fi

# ─── Install dependencies ───────────────────────────
echo
echo "  [2/4] Installing dependencies..."
node "$SCRIPT_DIR/scripts/ensure-deps.js" || {
  echo "  [ERROR] Dependency install failed. See messages above."
  read -rp "  Press Enter to exit... " _
  exit 1
}
echo "  Dependencies ready."

# ─── Start server ───────────────────────────────────
# `cd server/` is required: server.js does require('dotenv').config(), which reads .env from cwd.
# `exec` inside the subshell makes $! the node process itself, not a wrapper subshell.
SERVER_PID=""
CLIENT_PID=""
# On Ctrl+C / termination / exit: stop both servers, then the whole process group so npx's
# vite child goes too. `trap - TERM` first so the group kill does not re-enter this trap.
# Installed before the first server starts so there is no window in which one is orphaned.
trap 'trap - TERM; kill $SERVER_PID $CLIENT_PID 2>/dev/null; kill 0 2>/dev/null' INT TERM EXIT
echo
echo "  [3/4] Starting backend server..."
(cd "$SCRIPT_DIR/server" && exec node server.js) &
SERVER_PID=$!
sleep 2

# ─── Start client ───────────────────────────────────
echo "  [4/4] Starting frontend..."
(cd "$SCRIPT_DIR/client" && exec npx vite) &
CLIENT_PID=$!
sleep 5

# ─── Open browser ───────────────────────────────────
open_url "http://localhost:5173"
echo
echo "  ========================================"
echo "    OND is running!"
echo "    Frontend: http://localhost:5173"
echo "    Backend:  http://localhost:3001"
echo "  ========================================"
echo
echo "  Press Ctrl+C to stop both servers."
echo
wait
