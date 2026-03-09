@echo off
echo ========================================
echo   Reset Final Test Collector Progress
echo ========================================
echo.
echo This will delete:
echo   - cache/final-test-data.json
echo   - cache/final-test-progress.json
echo.
echo Press Ctrl+C to cancel, or
pause
del /q "cache\final-test-data.json"
del /q "cache\final-test-progress.json"
echo.
echo Progress reset successfully!
echo Run: node final-test-collector.js
echo.
pause
