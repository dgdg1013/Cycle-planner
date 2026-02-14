@echo off
setlocal
cd /d %~dp0\frontend

if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 goto :fail
)

if not exist node_modules\.bin\tauri.cmd (
  echo Tauri CLI is missing. Installing dependencies again...
  call npm install
  if errorlevel 1 goto :fail
)

if not exist node_modules\.bin\tauri.cmd (
  echo Tauri CLI is still missing.
  echo Run: cd frontend ^&^& npm install
  goto :fail
)

where cargo >nul 2>nul
if errorlevel 1 (
  echo Rust/Cargo not found. Install Rust first: https://rustup.rs
  goto :fail
)

call npm run desktop:dev
endlocal
exit /b 0

:fail
endlocal
exit /b 1
