@echo off
title Magic Diary - Git Push
color 0A
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Magic Diary - Konfiguracja GitHub
echo  ==========================================
echo.

REM Inicjalizuj git jesli nie istnieje
if not exist ".git" (
    echo  [1/6] Inicjalizowanie repozytorium git...
    git init
    git branch -M main
) else (
    echo  [1/6] Repozytorium git juz istnieje.
)

echo.
echo  [2/6] Usuwanie node_modules i .next z git indexu...
git rm -r --cached node_modules 2>nul
git rm -r --cached .next 2>nul
git rm -r --cached package-lock.json 2>nul
echo      Gotowe (ignoruj bledy "did not match" - to normalne).

echo.
echo  [3/6] Dodawanie plikow do commita...
git add .gitignore
git add -A

echo.
echo  [4/6] Tworzenie commita...
git commit -m "feat: Magic Diary v0.1 MVP - initial commit" 2>nul || git commit --allow-empty -m "feat: Magic Diary v0.1 MVP - initial commit"

echo.
echo  [5/6] Podlaczanie zdalnego repozytorium...
git remote remove origin 2>nul
git remote add origin https://github.com/micleo22-glitch/magic-diary.git
echo      Remote ustawiony na: https://github.com/micleo22-glitch/magic-diary.git

echo.
echo  [6/6] Pushowanie na GitHub...
git branch -M main
git push -u origin main

echo.
echo  ==========================================
if errorlevel 1 (
    echo   BLAD podczas push - sprawdz powyzej
    echo   Moze byc wymagane logowanie do GitHub
) else (
    echo   SUKCES! Kod jest na GitHubie!
    echo   https://github.com/micleo22-glitch/magic-diary
)
echo  ==========================================
echo.
pause
