/**
 * Render Invoice Card to High-Resolution PNG Image
 * CLB Cờ vua Kiện Tướng Tương Lai (KTTLL)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// Tìm đường dẫn Google Chrome hoặc Microsoft Edge trên Windows
function getBrowserExecutablePath() {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  for (const p of chromePaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Không tìm thấy Google Chrome hoặc Microsoft Edge trên máy tính!');
}

/**
 * Sinh mã HTML của Thẻ Báo Học Phí chuẩn 100% theo mẫu Mocktest
 */
function buildInvoiceHtml(data) {
  const vietQrUrl = data.vietQrUrl || `https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${data.totalAmount}&addInfo=${encodeURIComponent(data.transferContent)}&accountName=${encodeURIComponent(data.accountHolder || 'CLB CO VUA KIEN TUONG TUONG LAI')}`;
  const totalFormatted = (data.totalAmount || 0).toLocaleString('vi-VN');
  const feeFormatted = (data.feePerSession || 0).toLocaleString('vi-VN');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phiếu Báo Học Phí - ${data.studentName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .invoice-card {
      width: 480px;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 10px 35px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      position: relative;
    }
    .card-header {
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid #f1f5f9;
    }
    .badge-month {
      display: inline-block;
      background: #ecfdf5;
      color: #059669;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: uppercase;
    }
    .title {
      margin-top: 8px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.35;
    }
    .intro {
      margin-top: 8px;
      font-size: 12.5px;
      color: #475569;
      line-height: 1.55;
    }
    .details-table {
      padding: 16px 24px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 9px 0;
      border-bottom: 1px solid #f8fafc;
      font-size: 12.5px;
    }
    .row:last-child {
      border-bottom: none;
    }
    .label {
      color: #64748b;
      font-weight: 500;
      width: 38%;
      flex-shrink: 0;
    }
    .value {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
      width: 62%;
      line-height: 1.4;
    }
    .row-highlight {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 12px 14px;
      margin: 8px 0;
      align-items: center;
    }
    .row-highlight .label {
      color: #047857;
      font-weight: 700;
      font-size: 13px;
    }
    .row-highlight .value {
      color: #059669;
      font-size: 18px;
      font-weight: 800;
    }
    .syntax-highlight {
      color: #ea580c;
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .qr-container {
      margin: 8px 24px 20px 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
    }
    .qr-title {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .qr-box {
      width: 190px;
      height: 190px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 14px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-box img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }
    .qr-footer-note {
      margin-top: 10px;
      font-size: 10.5px;
      color: #64748b;
      font-style: italic;
      line-height: 1.45;
    }
    .card-footer-cta {
      margin: 0 24px 24px 24px;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 700;
      text-align: center;
      padding: 11px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .brand-stamp {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .brand-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #059669;
      color: white;
      font-size: 14px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
    }
  </style>
</head>
<body>
  <div class="invoice-card" id="invoiceCard">
    <div class="brand-stamp">
      <div class="brand-logo">♔</div>
    </div>

    <!-- Header -->
    <div class="card-header">
      <span class="badge-month">HỌC PHÍ THÁNG ${data.month}/${data.year}</span>
      <h1 class="title">[KTTLL] THÔNG BÁO HỌC PHÍ THÁNG ${data.month}/${data.year}</h1>
      <p class="intro">
        Kính gửi phụ huynh em <strong>${data.studentName}</strong>, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng ${data.month}/${data.year} theo nguyên tắc <em>Thực học - Thực trả</em>.
      </p>
    </div>

    <!-- Details Table -->
    <div class="details-table">
      <div class="row">
        <span class="label">Học viên:</span>
        <span class="value">${data.studentName} (${data.studentCode})</span>
      </div>
      <div class="row">
        <span class="label">Lớp học:</span>
        <span class="value">${data.className} – ${data.branchName}</span>
      </div>
      <div class="row">
        <span class="label">Số buổi thực học:</span>
        <span class="value">${data.presentCount} buổi</span>
      </div>
      <div class="row">
        <span class="label">Các ngày có mặt:</span>
        <span class="value">${data.presentDates && data.presentDates.length > 0 ? data.presentDates.join(', ') : 'Chưa có buổi học'}</span>
      </div>
      <div class="row">
        <span class="label">Đơn giá:</span>
        <span class="value">${feeFormatted} đ/buổi</span>
      </div>

      <!-- Highlight Total -->
      <div class="row row-highlight">
        <span class="label">Tổng học phí:</span>
        <span class="value">${totalFormatted} VNĐ</span>
      </div>

      <div class="row">
        <span class="label">Ngân hàng thụ hưởng:</span>
        <span class="value">${data.bankName || 'MBBank'} – ${data.bankAccount || '0987654321'} (${data.accountHolder || 'CLB CO VUA KIEN TUONG TUONG LAI'})</span>
      </div>
      <div class="row">
        <span class="label">Cú pháp chuyển khoản:</span>
        <span class="value syntax-highlight">${data.transferContent}</span>
      </div>
    </div>

    <!-- VietQR Box -->
    <div class="qr-container">
      <div class="qr-title">
        <span>⚡ Mã VietQR thanh toán nhanh Napas 247</span>
      </div>
      <div class="qr-box">
        <img src="${vietQrUrl}" alt="VietQR Code" id="qrImg">
      </div>
      <p class="qr-footer-note">
        Lưu ý: Quý phụ huynh vui lòng thanh toán đúng cú pháp để hệ thống đối soát tự động. Mọi thắc mắc xin liên hệ Hotline CLB: 0904.555.666.
      </p>
    </div>

    <!-- Call to action button banner -->
    <div class="card-footer-cta">
      <span>📱 Quét mã QR bằng App Ngân Hàng để đóng học phí</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render HTML thành ảnh PNG sắc nét (Retina 2x)
 */
async function renderInvoiceToImage(data, outputFilePath, browserInstance = null) {
  let browser = browserInstance;
  let shouldCloseBrowser = false;

  if (!browser) {
    const chromePath = getBrowserExecutablePath();
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    shouldCloseBrowser = true;
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 600, height: 950, deviceScaleFactor: 2 });

    const htmlContent = buildInvoiceHtml(data);
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Đợi thẻ card hiển thị
    const element = await page.waitForSelector('#invoiceCard', { timeout: 5000 });
    if (!element) throw new Error('Không tìm thấy #invoiceCard');

    // Chờ ảnh QR tải xong hoặc tối đa 2s
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const img = document.getElementById('qrImg');
        if (img && img.complete) {
          resolve(true);
        } else if (img) {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(true);
          setTimeout(() => resolve(true), 2000);
        } else {
          resolve(true);
        }
      });
    });

    // Tạo thư mục nếu chưa có
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Chụp lại đúng vùng card với chất lượng 2x
    await element.screenshot({
      path: outputFilePath,
      type: 'png',
      omitBackground: true,
    });

    await page.close();
    return outputFilePath;
  } finally {
    if (shouldCloseBrowser && browser) {
      await browser.close();
    }
  }
}

module.exports = {
  buildInvoiceHtml,
  renderInvoiceToImage,
  getBrowserExecutablePath,
};
