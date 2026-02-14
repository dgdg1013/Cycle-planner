#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/frontend"

if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

echo "Building desktop app bundle..."
npm run desktop:build

echo
echo "Build complete."
echo "Check: frontend/src-tauri/target/release/bundle"
