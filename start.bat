@echo off
REM SUPERBOWL1 launcher.
REM If Python is installed, serves the game on port 8000 (lets phones on your Wi-Fi play too).
REM Otherwise, opens index.html directly in your default browser.
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
  echo Starting SUPERBOWL1 at http://localhost:8000
  echo Phones on the same Wi-Fi: http://YOUR-PC-IP:8000  ^(find it with: ipconfig^)
  echo Press Ctrl+C to stop.
  start "" http://localhost:8000
  python -m http.server 8000
) else (
  start "" "%~dp0index.html"
)
