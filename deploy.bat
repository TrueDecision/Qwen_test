@echo off
echo ========================================
echo   Git Push and Deploy
echo ========================================
echo.

cd /d "%~dp0"

:: Проверка изменений
echo [1/4] Checking git status...
git status

echo.
echo [2/4] Adding all changes...
git add .

:: Коммит
set /p message="Enter commit message: "
if "%message%"=="" set message=Update project

echo [3/4] Committing: %message%
git commit -m "%message%"

:: Push
echo [4/4] Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo   Done! Vercel will auto-deploy.
echo ========================================
echo.

:: Проверка статуса
git status

pause
