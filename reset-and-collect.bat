@echo off
echo.
echo ===============================================
echo   RESET CACHE AND RESTART SERVER
echo ===============================================
echo.

echo [1/4] Stopping all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo [2/4] Deleting old cache files...
del /q cache\full-analytics-stats.json 2>nul
del /q cache\full-analytics-progress.json 2>nul
del /q cache\skill-orders.json 2>nul
del /q cache\skill-order-progress.json 2>nul
del /q cache\unified-progress.json 2>nul
del /q cache\aggregated-stats.json 2>nul
echo.

echo [3/4] Remaining cache files:
dir /b cache\*.json 2>nul || echo   (no JSON files to delete)
echo.

echo [4/4] Starting NEW data collector...
echo.
echo This will collect 10 games per champion with CORRECT skill orders
echo Press Ctrl+C to stop at any time
echo.
node final-test-collector.js

echo.
echo ===============================================
echo   COLLECTION FINISHED
echo ===============================================
echo.
echo Now start the server:
echo   node server.js
echo.
echo Then open: http://localhost:3000
echo.
