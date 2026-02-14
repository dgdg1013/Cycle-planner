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

where link >nul 2>nul
if errorlevel 1 (
  echo MSVC linker ^(link.exe^) not found.
  echo Install "Build Tools for Visual Studio 2022" with:
  echo - Desktop development with C++
  echo - MSVC v143 build tools
  echo - Windows 10/11 SDK
  echo Then run this script again from "x64 Native Tools Command Prompt for VS 2022"
  goto :fail
)

echo Building desktop app bundle...
call npm run desktop:build
if errorlevel 1 goto :fail

echo.
echo Build complete.
echo Check: frontend\src-tauri\target\release\bundle
endlocal
exit /b 0

:fail
echo.
echo Desktop build failed.
endlocal
exit /b 1
