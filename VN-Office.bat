@echo off
title VN Office ? Khoi dong ung dung Desktop
cd /d "%~dp0"
set PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;C:\Users\3T Computer\tools\nodejs;C:\Users\3T Computer\tools\git\cmd;%PATH%

echo Dang khoi dong VN Office Desktop App (Python)...
start /b node scripts/serve.js >nul 2>&1
python main.py
