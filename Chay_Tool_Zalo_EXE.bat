@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~dp0tools\zalo-sender\dist\Zalo_Bulk_Sender\Zalo_Bulk_Sender.exe' -WorkingDirectory '%~dp0tools\zalo-sender\dist\Zalo_Bulk_Sender'"
exit /b 0
