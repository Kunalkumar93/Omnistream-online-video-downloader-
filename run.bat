@echo off
title OmniStream - Video Downloader Server
echo ========================================================
echo   OmniStream Video Downloader
echo   Starting local server at http://127.0.0.1:5000 ...
echo ========================================================
echo.
:: Clean up any stale python instances on port 5000 from previous sessions
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
python app.py
pause
