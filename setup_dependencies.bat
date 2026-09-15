@echo off
title SIH 2026 AI Compliance Scanner - Dependency Installer
echo =====================================================================
echo  SIH 2026 AI Compliance Scanner - 1-Click Dependency Installer
echo =====================================================================
echo.

echo [*] Step 1/2: Installing Python Backend Dependencies...
cd /d %~dp0backend
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [!] Warning: Pip install encountered an issue. Ensure Python 3.10+ is installed.
) else (
    echo [OK] Backend dependencies installed successfully!
)
echo.

echo [*] Step 2/2: Installing Node.js Frontend Dependencies...
cd /d %~dp0frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [!] Warning: Npm install encountered an issue. Ensure Node.js 18+ is installed.
) else (
    echo [OK] Frontend dependencies installed successfully!
)
echo.

echo =====================================================================
echo  Installation complete! You can now run "start_all.bat".
echo =====================================================================
pause
