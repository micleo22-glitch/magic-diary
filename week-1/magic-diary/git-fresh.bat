@echo off
title Magic Diary - Fresh Git Push
color 0A
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Magic Diary - Czysty reset historii git
echo  ==========================================
echo.

echo  [1/5] Usuwanie starego repozytorium git...
rmdir /s /q .git
echo      Stara historia usunieta.

echo.
echo  [2/5] Inicjalizowanie czystego repozytorium...
git init
git branch -M main
echo      Gotowe.

echo.
echo  [3/5] Dodawanie plikow (node_modules wykluczone przez .gitignore)...
git add .
echo      Gotowe.

echo.
echo  [4/5] Tworzenie pierwszego commita...
git commit -m "feat: Magic Diary v0.1 MVP

- Splash screen z animacja i logo
- Edytor nowego wpisu z TipTap
- Wybor nastroju (mood picker)
- Tygodniowy kalendarz
- Lista wpisow z wyszukiwarka
- Podglad wpisu
- Responsywny layout (mobile + desktop)
- localStorage persistence
- Design system: pergamin, zloto, serif"
echo      Commit utworzony.

echo.
echo  [5/5] Podlaczanie i pushowanie na GitHub...
git remote add origin https://github.com/micleo22-glitch/magic-diary.git
git push -u origin main --force

echo.
echo  ==========================================
if errorlevel 1 (
    echo   BLAD - sprawdz powyzej
) else (
    echo   SUKCES! Kod jest na GitHubie!
    echo   https://github.com/micleo22-glitch/magic-diary
)
echo  ==========================================
echo.
pause
