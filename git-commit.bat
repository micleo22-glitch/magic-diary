@echo off
cd /d "%~dp0"
git add components/Sidebar.tsx
git commit -m "feat: desktop sidebar - gold button, spacing, Spis Wspomnien header"
git push
echo Done!
pause
