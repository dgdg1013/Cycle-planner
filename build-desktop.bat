@echo off
setlocal
cd /d %~dp0\frontend

if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 goto :fail
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
