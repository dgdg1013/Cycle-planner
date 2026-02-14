@echo off
setlocal
cd /d %~dp0\frontend

if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install
)

call npm run desktop:dev
endlocal
