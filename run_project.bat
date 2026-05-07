@echo off
setlocal

echo ==========================================
echo   Starting Astri Project (Web + Engine)
echo ==========================================

:: Start Astrology Engine in a new window
echo [1/2] Starting Astrology Engine on http://localhost:8000...
start "Astro Engine" cmd /c "cd /d %~dp0astro-engine && .venv\Scripts\activate && uvicorn app.main:app --reload --env-file .env"

:: Start Web App in a new window
echo [2/2] Starting Web App on http://localhost:3000...
start "Astri Web" cmd /c "cd /d %~dp0web && pnpm start"

echo.
echo Both services are booting up in separate windows.
echo - Engine: http://localhost:8000/docs
echo - Web: http://localhost:3000
echo.
echo Press any key to exit this launcher...
pause >nul
