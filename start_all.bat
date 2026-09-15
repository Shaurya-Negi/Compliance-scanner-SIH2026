@echo off
title SIH 2026 AI Compliance Scanner - Launcher
echo =====================================================================
echo  SIH 2026 AI PACKAGED COMMODITY COMPLIANCE SCANNER
echo  Starting Backend (FastAPI :8000) and Frontend (Vite :5173)...
echo =====================================================================
echo.

:: Start Backend in a new window
echo [*] Starting Python FastAPI Backend on http://127.0.0.1:8000 ...
start "SIH Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Wait 3 seconds for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend in a new window
echo [*] Starting React Vite Frontend on http://localhost:5173 ...
start "SIH Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =====================================================================
echo  SUCCESS! Both servers are starting up.
echo  Once Vite is ready, open your browser at:
echo  >>> http://localhost:5173 <<<
echo =====================================================================
echo.
pause
