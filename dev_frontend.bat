@echo off
chcp 65001 >nul
echo ========================================================
echo   KHỞI ĐỘNG FRONTEND REACT DEV (VITE HOT RELOAD)
echo ========================================================
echo Frontend mở tại: http://localhost:3001
echo ========================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%USERPROFILE%\.cache\node22\node-v22.14.0-win-x64" (
        set "PATH=%USERPROFILE%\.cache\node22\node-v22.14.0-win-x64;%PATH%"
    ) else if exist "C:\Program Files\nodejs" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    )
)

cd /d "%~dp0frontend_react"
npm run dev
