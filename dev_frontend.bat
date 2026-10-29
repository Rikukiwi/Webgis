@echo off
chcp 65001 >nul
echo ========================================================
echo   KHỞI ĐỘNG FRONTEND REACT DEV (VITE HOT RELOAD)
echo ========================================================
echo Frontend mở tại: http://localhost:3001
echo ========================================================
set "PATH=C:\Users\PC\.cache\node22\node-v22.14.0-win-x64;%PATH%"
cd /d "%~dp0frontend_react"
npm run dev
