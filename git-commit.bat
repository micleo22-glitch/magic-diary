@echo off
cd /d "%~dp0"
git add -A
git commit -m "fix: mobile bottom nav visibility (dvh + safe-area-inset)"
git push
echo.
echo Done!
pause
