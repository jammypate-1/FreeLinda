@echo off
chcp 65001 >nul
title FreeLinda Installer
echo ==========================================
echo        FreeLinda Installer
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not available.
    echo Please ensure npm is installed with Node.js.
    echo.
    pause
    exit /b 1
)

echo [OK] npm found:
npm --version
echo.

REM Install dependencies
echo [1/2] Installing dependencies...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo [OK] Dependencies installed successfully.
echo.

REM Start the dev server on port 3000
echo [2/2] Starting FreeLinda on port 3000...
echo.
echo Open your browser and go to: http://localhost:3000
echo Press Ctrl+C to stop the server.
echo.
call npm run dev

pause
