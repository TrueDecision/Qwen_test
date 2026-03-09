@echo off
echo.
echo ===============================================
echo   CLEAN CACHE AND START FINAL TEST COLLECTOR
echo ===============================================
echo.

echo [1/3] Cleaning old cache files...
del /q cache\final-test-data.json 2>nul
del /q cache\final-test-progress.json 2>nul
del /q cache\full-analytics-stats.json 2>nul
del /q cache\full-analytics-progress.json 2>nul
del /q cache\skill-orders.json 2>nul
del /q cache\skill-order-progress.json 2>nul
del /q cache\unified-progress.json 2>nul
echo.

echo [2/3] Remaining cache files:
dir /b cache\*.json 2>nul || echo   (no JSON files)
echo.

echo [3/3] Starting Final Test Collector...
echo.
node final-test-collector.js

echo.
echo ===============================================
echo   DONE
echo ===============================================
echo.
