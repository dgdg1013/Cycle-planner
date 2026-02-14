#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_EXE="$ROOT/frontend/src-tauri/target/release/cycle-planner"

if [ -x "$APP_EXE" ]; then
  "$APP_EXE" &
  exit 0
fi

echo "Desktop executable not found. Building now..."
"$ROOT/build-desktop.sh"

if [ -x "$APP_EXE" ]; then
  "$APP_EXE" &
  exit 0
fi

echo "Could not launch desktop app. Build may have failed."
exit 1
