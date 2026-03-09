@echo off
echo ========================================
echo   Update Collection Server
echo ========================================
echo.
echo This script updates the data collection server
echo.

cd /d "%~dp0"

:: Проверка изменений
echo [1/3] Checking git status...
git status

echo.
echo [2/3] Committing and pushing...
git add final-test-collector.js
git commit -m "Update collector script"
git push origin main

echo.
echo [3/3] Instructions for server:
echo.
echo SSH to your server and run:
echo   cd /path/to/project
echo   git pull origin main
echo   node final-test-collector.js
echo.
echo Or copy file via SCP:
echo   scp final-test-collector.js user@server:/path/to/project/
echo.

pause
