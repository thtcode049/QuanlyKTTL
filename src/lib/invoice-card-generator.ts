import JSZip from "jszip";
import { formatCurrencyVND } from "./vietqr";

export interface InvoiceCardData {
  studentCode: string;
  studentName: string;
  className: string;
  branchName: string;
  month: number;
  year: number;
  presentCount: number;
  presentDates: string[];
  feePerSession: number;
  totalAmount: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  transferContent: string;
  vietQrUrl: string;
}

/**
 * Tải ảnh từ URL vào đối tượng HTMLImageElement với hỗ trợ crossOrigin
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
    // Timeout sau 6 giây nếu mạng chậm
    setTimeout(() => {
      if (!img.complete) {
        reject(new Error("Timeout tải ảnh QR"));
      }
    }, 6000);
  });
}

/**
 * Vẽ hình chữ nhật bo góc (Rounded Rectangle)
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Cắt ngắn chuỗi văn bản nếu vượt quá chiều rộng cho phép
 */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + "...").width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + "...";
}

/**
 * Sinh canvas vẽ thẻ báo học phí sắc nét chuẩn Retina (2x scale)
 */
export async function generateInvoiceCardCanvas(
  data: InvoiceCardData
): Promise<HTMLCanvasElement> {
  const scale = 2;
  const width = 560;
  const height = 980;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không thể khởi tạo Canvas 2D context");

  ctx.scale(scale, scale);

  // 1. Nền canvas tổng thể
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(0, 0, width, height);

  // 2. Thẻ Card chính ở giữa
  const cardX = 20;
  const cardY = 20;
  const cardW = width - 40;
  const cardH = height - 40;

  // Đổ bóng cho card
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  // Viền mỏng card
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.stroke();

  // 3. Logo Vương Miện KTTLL ở góc trên phải
  const crownSize = 34;
  const crownX = cardX + cardW - crownSize - 20;
  const crownY = cardY + 20;

  ctx.beginPath();
  ctx.arc(crownX + crownSize / 2, crownY + crownSize / 2, crownSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#059669";
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♔", crownX + crownSize / 2, crownY + crownSize / 2 + 1);

  // 4. Header Badge: HỌC PHÍ THÁNG M/YYYY
  const padLeft = cardX + 24;
  let curY = cardY + 28;

  const badgeText = `HỌC PHÍ THÁNG ${data.month}/${data.year}`;
  ctx.font = "800 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeW = badgeMetrics.width + 18;
  const badgeH = 22;

  ctx.fillStyle = "#ECFDF5";
  roundRect(ctx, padLeft, curY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.strokeStyle = "#A7F3D0";
  ctx.lineWidth = 1;
  roundRect(ctx, padLeft, curY, badgeW, badgeH, 6);
  ctx.stroke();

  ctx.fillStyle = "#059669";
  ctx.fillText(badgeText, padLeft + 9, curY + 5);

  // 5. Tiêu đề chính
  curY += 32;
  ctx.font = "800 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#0F172A";
  ctx.fillText(`[KTTLL] THÔNG BÁO HỌC PHÍ THÁNG ${data.month}/${data.year}`, padLeft, curY);

  // 6. Lời chào
  curY += 24;
  ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#475569";
  const introLine1 = `Kính gửi phụ huynh em ${data.studentName}, CLB Cờ vua Kiện Tướng Tương Lai`;
  const introLine2 = `xin gửi bảng tổng kết học phí theo nguyên tắc Thực học - Thực trả.`;
  ctx.fillText(truncateText(ctx, introLine1, cardW - 48), padLeft, curY);
  curY += 17;
  ctx.fillText(introLine2, padLeft, curY);

  // Đường kẻ phân cách
  curY += 22;
  ctx.strokeStyle = "#F1F5F9";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 20, curY);
  ctx.lineTo(cardX + cardW - 20, curY);
  ctx.stroke();

  // 7. Chi tiết học phí
  curY += 12;
  const rowH = 25;
  const colValX = cardX + cardW - 24;

  const renderRow = (
    label: string,
    value: string,
    isBoldVal: boolean = false,
    valColor: string = "#0F172A"
  ) => {
    ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, padLeft, curY + rowH / 2);

    ctx.font = `${isBoldVal ? "700" : "600"} 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillStyle = valColor;
    ctx.textAlign = "right";
    const maxValW = cardW - 170;
    ctx.fillText(truncateText(ctx, value, maxValW), colValX, curY + rowH / 2);

    curY += rowH;
  };

  renderRow("Học viên:", `${data.studentName} (${data.studentCode})`, true);
  renderRow("Lớp học:", `${data.className} – ${data.branchName}`);
  renderRow("Số buổi thực học:", `${data.presentCount} buổi`, true, "#047857");

  const datesStr =
    data.presentDates && data.presentDates.length > 0
      ? data.presentDates.join(", ")
      : "Chưa có buổi học";
  renderRow("Các ngày có mặt:", datesStr);
  renderRow("Đơn giá:", `${formatCurrencyVND(data.feePerSession)}/buổi`);

  // Hộp nổi bật TỔNG HỌC PHÍ
  curY += 4;
  const totalBoxH = 46;
  ctx.fillStyle = "#ECFDF5";
  roundRect(ctx, padLeft, curY, cardW - 48, totalBoxH, 12);
  ctx.fill();
  ctx.strokeStyle = "#A7F3D0";
  ctx.lineWidth = 1;
  roundRect(ctx, padLeft, curY, cardW - 48, totalBoxH, 12);
  ctx.stroke();

  ctx.font = "700 12.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#047857";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Tổng học phí:", padLeft + 14, curY + totalBoxH / 2);

  ctx.font = "800 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#059669";
  ctx.textAlign = "right";
  ctx.fillText(
    formatCurrencyVND(data.totalAmount),
    colValX - 14,
    curY + totalBoxH / 2
  );

  curY += totalBoxH + 10;
  renderRow("Ngân hàng:", `${data.bankName} – ${data.bankAccount}`);
  renderRow("Chủ tài khoản:", data.accountHolder, true);
  renderRow("Cú pháp chuyển khoản:", data.transferContent, true, "#EA580C");

  // 8. Khung Mã VietQR
  curY += 8;
  const qrBoxH = 270;
  const qrBoxY = curY;
  ctx.fillStyle = "#F8FAFC";
  roundRect(ctx, padLeft, qrBoxY, cardW - 48, qrBoxH, 16);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  roundRect(ctx, padLeft, qrBoxY, cardW - 48, qrBoxH, 16);
  ctx.stroke();

  // Tiêu đề khung QR
  ctx.font = "700 11.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#334155";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("⚡ Mã VietQR thanh toán nhanh Napas 247", cardX + cardW / 2, qrBoxY + 12);

  // Vùng chứa ảnh QR trắng
  const qrImgSize = 180;
  const qrImgX = cardX + (cardW - qrImgSize) / 2;
  const qrImgY = qrBoxY + 34;

  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, qrImgX, qrImgY, qrImgSize, qrImgSize, 12);
  ctx.fill();
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  roundRect(ctx, qrImgX, qrImgY, qrImgSize, qrImgSize, 12);
  ctx.stroke();

  // Tải và vẽ ảnh VietQR lên Canvas
  try {
    const qrImg = await loadImage(data.vietQrUrl);
    ctx.drawImage(qrImg, qrImgX + 6, qrImgY + 6, qrImgSize - 12, qrImgSize - 12);
  } catch (err) {
    // Vẽ placeholder nếu lỗi tải ảnh
    ctx.fillStyle = "#64748B";
    ctx.font = "600 11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Mã VietQR Chuyển Khoản", qrImgX + qrImgSize / 2, qrImgY + qrImgSize / 2 - 10);
    ctx.fillText(data.transferContent, qrImgX + qrImgSize / 2, qrImgY + qrImgSize / 2 + 10);
  }

  // Ghi chú dưới QR
  ctx.font = "italic 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const noteStr = "Lưu ý: Quý phụ huynh vui lòng thanh toán đúng cú pháp để hệ thống đối soát.";
  ctx.fillText(noteStr, cardX + cardW / 2, qrBoxY + qrImgSize + 44);

  // 9. Nút Call to Action dưới cùng
  curY = qrBoxY + qrBoxH + 12;
  const ctaH = 34;
  ctx.fillStyle = "#059669";
  roundRect(ctx, padLeft, curY, cardW - 48, ctaH, 10);
  ctx.fill();

  ctx.font = "700 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "📱 Quét mã QR bằng App Ngân Hàng để hoàn tất học phí",
    cardX + cardW / 2,
    curY + ctaH / 2
  );

  return canvas;
}

/**
 * Xuất 1 thẻ báo học phí thành PNG Blob
 */
export async function generateInvoiceCardBlob(
  data: InvoiceCardData
): Promise<Blob> {
  const canvas = await generateInvoiceCardCanvas(data);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Không thể xuất ảnh PNG từ canvas"));
    }, "image/png", 1.0);
  });
}

/**
 * Tải trực tiếp 1 file PNG thẻ học phí về máy tính
 */
export async function downloadInvoiceCardPng(
  data: InvoiceCardData,
  customFileName?: string
): Promise<void> {
  const blob = await generateInvoiceCardBlob(data);
  const safeName = data.studentName.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");
  const fileName =
    customFileName || `${data.studentCode}_${safeName}_T${data.month}_${data.year}.png`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sao chép ảnh thẻ PNG trực tiếp vào Clipboard để HLV dán thẳng vào chat Zalo (Ctrl+V)
 */
export async function copyInvoiceCardToClipboard(
  data: InvoiceCardData
): Promise<boolean> {
  try {
    const blob = await generateInvoiceCardBlob(data);
    if (!navigator.clipboard || !window.ClipboardItem) {
      throw new Error("Trình duyệt không hỗ trợ sao chép ảnh vào Clipboard");
    }
    await navigator.clipboard.write([
      new window.ClipboardItem({
        "image/png": blob,
      }),
    ]);
    return true;
  } catch (err) {
    console.error("Lỗi copy ảnh vào clipboard:", err);
    return false;
  }
}

/**
 * Xuất hàng loạt thẻ học phí của cả lớp thành file nén .ZIP chứa toàn bộ ảnh PNG
 */
export async function batchExportInvoiceCardsAsZip(
  students: InvoiceCardData[],
  zipFileName: string,
  onProgress?: (current: number, total: number, studentName: string) => void
): Promise<{ zipBlob: Blob; count: number }> {
  const zip = new JSZip();
  const folder = zip.folder("The_Hoc_Phi_PNG") || zip;

  const total = students.length;
  for (let i = 0; i < total; i++) {
    const st = students[i];
    if (onProgress) {
      onProgress(i + 1, total, st.studentName);
    }

    try {
      const blob = await generateInvoiceCardBlob(st);
      const safeName = st.studentName.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");
      const fileName = `${st.studentCode}_${safeName}_T${st.month}_${st.year}.png`;
      folder.file(fileName, blob);
    } catch (err) {
      console.warn(`Lỗi tạo ảnh cho học viên ${st.studentName}:`, err);
    }
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  // Tự động kích hoạt tải file .ZIP về máy
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFileName.endsWith(".zip") ? zipFileName : `${zipFileName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { zipBlob, count: total };
}
