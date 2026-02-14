#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/frontend"

if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

if [ ! -x "node_modules/.bin/tauri" ]; then
  echo "Tauri CLI is missing. Installing dependencies again..."
  npm install
fi

if [ ! -x "node_modules/.bin/tauri" ]; then
  echo "Tauri CLI is still missing."
  echo "Run: cd frontend && npm install"
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "Rust/Cargo not found. Install Rust first: https://rustup.rs"
  exit 1
fi

echo "Building desktop app bundle..."
npm run desktop:build

echo
echo "Build complete."
echo "Check: frontend/src-tauri/target/release/bundle"
