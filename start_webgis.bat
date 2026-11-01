@echo off
chcp 65001 >nul
echo ========================================================
echo   KHỞI ĐỘNG HỆ THỐNG WEBGIS DỰ BÁO LST TP.HCM
echo ========================================================
echo Đang mở hệ thống tại: http://localhost:8000
echo Nhấn Ctrl+C để dừng hệ thống.
echo ========================================================
cd /d "%~dp0backend_python"
python -m uvicorn main:app --reload --port 8000
