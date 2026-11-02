@echo off
chcp 65001 > nul
title CLB CỜ VUA KTTL - PHẦN MỀM GỬI THẺ HỌC PHÍ ZALO
echo ===================================================================
echo   CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTL)
echo   PHẦN MỀM ZALO BULK SENDER (TỰ ĐỘNG GỬI THẺ HỌC PHÍ)
echo ===================================================================
echo.
echo Đang khởi động phần mềm Zalo Bulk Sender...
call "%~dp0Chay_Tool_Zalo_EXE.bat"
exit /b 0
