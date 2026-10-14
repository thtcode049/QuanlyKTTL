@echo off
chcp 65001 > nul
title ZALO BULK SENDER - CLB CỜ VUA KTTLL
cd /d "%~dp0tools\zalo-sender\dist\Zalo_Bulk_Sender"

echo ===================================================================
echo   CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTLL)
echo   PHẦN MỀM GỬI THẺ BÁO HỌC PHÍ TỰ ĐỘNG QUA ZALO CÁ NHÂN
echo ===================================================================
echo.
echo Đang khởi động phần mềm Zalo Bulk Sender...
start "" "Zalo_Bulk_Sender.exe" %*
exit /b 0
