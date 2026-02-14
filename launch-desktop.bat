@echo off
setlocal
set ROOT=%~dp0
set APP_EXE=%ROOT%frontend\src-tauri\target\release\cycle-planner.exe

if exist "%APP_EXE%" (
  start "" "%APP_EXE%"
  endlocal
  exit /b 0
)

echo Desktop executable not found. Building now...
call "%ROOT%build-desktop.bat"
if errorlevel 1 goto :fail

if exist "%APP_EXE%" (
  start "" "%APP_EXE%"
  endlocal
  exit /b 0
)

:fail
echo.
echo Could not launch desktop app. Build may have failed.
pause
endlocal
exit /b 1
