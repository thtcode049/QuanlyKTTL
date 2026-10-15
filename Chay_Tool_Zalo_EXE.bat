@echo off
if exist "%~dp0Zalo_Bulk_Sender.exe" (
  start "" "%~dp0Zalo_Bulk_Sender.exe"
  exit /b 0
)
if exist "%~dp0tools\zalo-sender\dist\Zalo_Bulk_Sender.exe" (
  start "" "%~dp0tools\zalo-sender\dist\Zalo_Bulk_Sender.exe"
  exit /b 0
)
exit /b 1
