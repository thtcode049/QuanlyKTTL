@echo off
chcp 65001 > nul
title CLB CỜ VUA KTTLL - TOOL TỰ ĐỘNG GỬI THẺ HỌC PHÍ ZALO
echo ===================================================================
echo   CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTLL)
echo   TOOL TỰ ĐỘNG GỬI THẺ HỌC PHÍ TRỰC TIẾP ĐẾN ZALO PHỤ HUYNH
echo ===================================================================
echo.
echo [1] Đang chuẩn bị dữ liệu và mở trình duyệt Google Chrome...
echo [2] Trình duyệt sẽ mở Zalo Web cá nhân của HLV.
echo     (Nếu chưa đăng nhập, vui lòng mở app Zalo trên điện thoại quét mã QR)
echo [3] Bot sẽ tự động tìm kiếm từng phụ huynh và gửi ảnh thẻ học phí.
echo.
echo Đang bắt đầu gửi... Vui lòng không đóng cửa sổ này.
echo -------------------------------------------------------------------
node scripts/send-invoices-to-parents.js
echo.
echo ===================================================================
echo ĐÃ HOÀN TẤT TIẾN TRÌNH GỬI THẺ HỌC PHÍ!
echo ===================================================================
pause
