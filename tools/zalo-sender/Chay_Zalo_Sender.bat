@echo off
chcp 65001 > nul
title ZALO BULK SENDER - CLB CO VUA KTTLL
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" goto install
echo [1/3] Dang tao moi truong Python .venv ...
python -m venv .venv
if errorlevel 1 goto nopython

:install
echo [2/3] Kiem tra thu vien ...
".venv\Scripts\python.exe" -m pip install -q -r requirements.txt
if errorlevel 1 goto fail

echo [3/3] Dang mo tool ... (khong dong cua so nay)
".venv\Scripts\python.exe" zalo_sender.py
if errorlevel 1 goto fail
exit /b 0

:nopython
echo Khong tim thay Python. Hay cai Python 3.10+ tai https://www.python.org/downloads/ - nho tick "Add to PATH".
pause
exit /b 1

:fail
echo Co loi xay ra, xem thong bao phia tren.
pause
exit /b 1
