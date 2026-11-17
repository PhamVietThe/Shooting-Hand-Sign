@echo off
title Cyber Gesture AR Arsenal
echo ===================================================
echo   Starting Cyber Gesture AR Web Server...
echo ===================================================
cd /d "%~dp0"
start http://localhost:8090
python server.py
pause
