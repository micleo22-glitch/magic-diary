@echo off
title Magic Diary - Setup & Start
color 0A

cd /d "%~dp0"

echo.
echo  ✨ Magic Diary - Setup
echo  ========================
echo.

echo  [1/3] Kopiowanie logo...
copy /y "..\logo.png" "public\logo.png" >nul 2>&1
if exist "public\logo.png" (
    echo      Logo skopiowane!
) else (
    echo      Uwaga: logo.png nie znaleziono w folderze nadrzednym
)

echo.
echo  [2/3] Instalowanie zaleznosci npm...
echo  (To moze zajac 2-3 minuty przy pierwszym uruchomieniu)
echo.
call npm install
if errorlevel 1 (
    echo.
    echo  BLAD: npm install nie powiodl sie!
    echo  Upewnij sie ze Node.js jest zainstalowany.
    pause
    exit /b 1
)

echo.
echo  [3/3] Uruchamianie serwera deweloperskiego...
echo.
echo  ==========================================
echo   Aplikacja dostepna na: http://localhost:3000
echo  ==========================================
echo.
call npm run dev

pause
