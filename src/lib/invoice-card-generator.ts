import JSZip from "jszip";
import { formatCurrencyVND, generateVietQrDataUrl, resolveBank } from "./vietqr";

export interface InvoiceClassItem {
  className: string;
  branchName?: string;
  presentCount: number;
  presentDates: string[];
  feePerSession: number;
  totalAmount: number;
}

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
  classList?: InvoiceClassItem[];
  customTitle?: string;
}

/**
 * Tải ảnh QR hoặc tài nguyên ảnh an toàn không bao giờ bị CORS / Tainted Canvas:
 * Bóc tách trực tiếp base64 PNG từ SVG của img.vietqr.io hoặc thông qua proxy nội bộ
 */
async function loadQrImage(src: string): Promise<HTMLImageElement> {
  if (!src) throw new Error("URL ảnh rỗng");
  if (src.startsWith("data:")) {
    return loadRawImage(src);
  }

  try {
    let fetchRes = await fetch(src).catch(() => null);
    if (!fetchRes || !fetchRes.ok) {
      // Fallback qua API proxy nội bộ của hệ thống
      const proxyUrl = `/api/vietqr-proxy?url=${encodeURIComponent(src)}`;
      fetchRes = await fetch(proxyUrl).catch(() => null);
    }

    if (fetchRes && fetchRes.ok) {
      const contentType = fetchRes.headers.get("content-type") || "";

      // Nếu là ảnh trực tiếp (PNG/JPEG)
      if (
        contentType.includes("image/png") ||
        contentType.includes("image/jpeg") ||
        contentType.includes("image/webp")
      ) {
        const blob = await fetchRes.blob();
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return await loadRawImage(dataUrl);
      }

      // Nếu là SVG chứa PNG base64 bên trong (chuẩn của img.vietqr.io)
      const text = await fetchRes.text();
      const base64Match =
        text.match(/href=["']data:image\/png;base64,([^"']+)["']/i) ||
        text.match(/xlink:href=["']data:image\/png;base64,([^"']+)["']/i) ||
        text.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);

      if (base64Match) {
        const fullDataUrl = base64Match[0].startsWith("data:")
          ? base64Match[0]
          : `data:image/png;base64,${base64Match[1]}`;
        return await loadRawImage(fullDataUrl);
      }

      const svgBase64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
      return await loadRawImage(svgBase64);
    }
  } catch (err) {
    console.warn("Lỗi fetch VietQR:", err);
  }

  // Fallback load raw qua Image element với proxy
  try {
    const proxyUrl = `/api/vietqr-proxy?url=${encodeURIComponent(src)}`;
    return await loadRawImage(proxyUrl);
  } catch (e2) {
    return await loadRawImage(src);
  }
}

/**
 * Tải ảnh cơ bản từ URL/DataURL vào HTMLImageElement
 */
function loadRawImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
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
  const hasMultipleClasses = Boolean(data.classList && data.classList.length > 1);
  const extraHeight = hasMultipleClasses
    ? (data.classList!.length * 62)
    : 0;
  const baseHeight = 890 + (data.branchName ? 34 : 0);
  const height = baseHeight + extraHeight;

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

  // 3. Logo Vương Miện KTTL ở góc trên phải
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
  let curY = cardY + 24;

  const badgeText = `HỌC PHÍ THÁNG ${data.month}/${data.year}`;
  ctx.font = "800 12.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeW = badgeMetrics.width + 18;
  const badgeH = 24;

  ctx.fillStyle = "#ECFDF5";
  roundRect(ctx, padLeft, curY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.strokeStyle = "#A7F3D0";
  ctx.lineWidth = 1;
  roundRect(ctx, padLeft, curY, badgeW, badgeH, 6);
  ctx.stroke();

  ctx.fillStyle = "#059669";
  ctx.fillText(badgeText, padLeft + 9, curY + 5);

  // 5. Tiêu đề chính (cho phép tùy biến customTitle)
  curY += 32;
  ctx.font = "800 18.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#0F172A";
  const titleText = data.customTitle || `[KTTL] THÔNG BÁO HỌC PHÍ THÁNG ${data.month}/${data.year}`;
  ctx.fillText(titleText, padLeft, curY);

  // 6. Lời chào
  curY += 25;
  ctx.font = "500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#475569";
  const introLine1 = `Kính gửi phụ huynh em ${data.studentName}, CLB Cờ vua Kiện Tướng Tương Lai`;
  const introLine2 = `xin gửi bảng tổng kết học phí tháng ${data.month}/${data.year} theo nguyên tắc Thực học - Thực trả.`;
  ctx.fillText(truncateText(ctx, introLine1, cardW - 48), padLeft, curY);
  curY += 19;
  ctx.fillText(introLine2, padLeft, curY);

  // Đường kẻ phân cách
  curY += 20;
  ctx.strokeStyle = "#F1F5F9";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 20, curY);
  ctx.lineTo(cardX + cardW - 20, curY);
  ctx.stroke();

  // 7. Chi tiết học phí (Cỡ chữ to hơn, rõ ràng, dễ nhìn)
  curY += 12;
  const rowH = 34;
  const colValX = cardX + cardW - 24;

  const renderRow = (
    label: string,
    value: string,
    isBoldVal: boolean = false,
    valColor: string = "#0F172A",
    valFontSize: number = 15.5
  ) => {
    // 1. Nhãn căn lề trái (to hơn, sắc nét)
    ctx.font = "600 14.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, padLeft, curY + rowH / 2);

    // 2. Giá trị căn lề phải (to hơn, nổi bật)
    ctx.font = `${isBoldVal ? "800" : "600"} ${valFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.fillStyle = valColor;
    ctx.textAlign = "right";
    const maxValW = cardW - 170;
    ctx.fillText(truncateText(ctx, value, maxValW), colValX, curY + rowH / 2);

    curY += rowH;
  };

  // Hiển thị tên học sinh (không kèm mã số HS theo yêu cầu)
  renderRow("Học viên:", data.studentName, true, "#0F172A", 16.5);

  if (hasMultipleClasses) {
    ctx.font = "700 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#334155";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`Chi tiết các lớp học (${data.classList!.length} lớp):`, padLeft, curY + 12);
    curY += 24;

    const boxRightX = padLeft + (cardW - 48);
    data.classList!.forEach((clsItem, idx) => {
      const hasDates = clsItem.presentDates && clsItem.presentDates.length > 0;
      const boxH = hasDates ? 48 : 38;
      ctx.fillStyle = "#F8FAFC";
      roundRect(ctx, padLeft, curY, cardW - 48, boxH, 8);
      ctx.fill();
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      roundRect(ctx, padLeft, curY, cardW - 48, boxH, 8);
      ctx.stroke();

      // Dòng 1: Tên lớp & Thành tiền của lớp đó
      ctx.font = "700 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#0F172A";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const titleText = `${idx + 1}. ${clsItem.className}${clsItem.branchName ? ` (${clsItem.branchName})` : ""}`;
      ctx.fillText(truncateText(ctx, titleText, cardW - 170), padLeft + 8, curY + 6);

      ctx.font = "800 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#059669";
      ctx.textAlign = "right";
      ctx.fillText(formatCurrencyVND(clsItem.totalAmount), boxRightX - 8, curY + 6);

      // Dòng 2: Số buổi & Đơn giá
      ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#64748B";
      ctx.textAlign = "left";
      const subDesc = `${clsItem.presentCount} buổi × ${formatCurrencyVND(clsItem.feePerSession)}/b`;
      ctx.fillText(subDesc, padLeft + 8, curY + 24);

      if (hasDates) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#94A3B8";
        const datesText = truncateText(ctx, `Ngày: ${clsItem.presentDates.join(", ")}`, cardW - 200);
        ctx.fillText(datesText, boxRightX - 8, curY + 24);
      }

      curY += boxH + 6;
    });

    renderRow("Tổng số buổi thực học:", `${data.presentCount} buổi`, true, "#047857", 16);
  } else {
    renderRow("Lớp học:", `${data.className} – ${data.branchName}`, false, "#1E293B", 15);
    renderRow("Số buổi thực học:", `${data.presentCount} buổi`, true, "#047857", 16.5);

    const datesStr =
      data.presentDates && data.presentDates.length > 0
        ? data.presentDates.join(", ")
        : "Chưa có buổi học";
    renderRow("Các ngày có mặt:", datesStr, false, "#334155", 14.5);
    renderRow("Đơn giá:", `${formatCurrencyVND(data.feePerSession)}/buổi`, false, "#1E293B", 15);
  }

  // Hộp nổi bật TỔNG HỌC PHÍ (to hơn, sắc nét)
  curY += 6;
  const totalBoxH = 54;
  ctx.fillStyle = "#ECFDF5";
  roundRect(ctx, padLeft, curY, cardW - 48, totalBoxH, 12);
  ctx.fill();
  ctx.strokeStyle = "#A7F3D0";
  ctx.lineWidth = 1;
  roundRect(ctx, padLeft, curY, cardW - 48, totalBoxH, 12);
  ctx.stroke();

  ctx.font = "800 15.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#047857";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Tổng học phí:", padLeft + 16, curY + totalBoxH / 2);

  ctx.font = "900 23px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#059669";
  ctx.textAlign = "right";
  ctx.fillText(
    formatCurrencyVND(data.totalAmount),
    padLeft + (cardW - 48) - 16,
    curY + totalBoxH / 2
  );

  curY += totalBoxH + 12;
  renderRow("Ngân hàng:", `${data.bankName} – ${data.bankAccount}`, false, "#1E293B", 15);
  renderRow("Cú pháp CK:", data.transferContent, true, "#EA580C", 16.5);

  // 8. Khung Mã VietQR (chuẩn tỷ lệ Napas 24/7 của VietQR compact2)
  curY += 8;
  const qrBoxH = 315;
  const qrBoxY = curY;
  ctx.fillStyle = "#F8FAFC";
  roundRect(ctx, padLeft, qrBoxY, cardW - 48, qrBoxH, 16);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  roundRect(ctx, padLeft, qrBoxY, cardW - 48, qrBoxH, 16);
  ctx.stroke();

  // Tiêu đề khung QR
  ctx.font = "700 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#334155";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("⚡ Mã VietQR thanh toán Napas 247", cardX + cardW / 2, qrBoxY + 12);

  // Vùng chứa ảnh VietQR trắng (kích thước chữ nhật 210x248 tương thích hoàn hảo tỉ lệ chuẩn VietQR)
  const qrImgW = 210;
  const qrImgH = 248;
  const qrImgX = cardX + (cardW - qrImgW) / 2;
  const qrImgY = qrBoxY + 32;

  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, qrImgX, qrImgY, qrImgW, qrImgH, 12);
  ctx.fill();
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  roundRect(ctx, qrImgX, qrImgY, qrImgW, qrImgH, 12);
  ctx.stroke();

  // Tải và vẽ ảnh VietQR lên Canvas (Ưu tiên VietQR chuẩn template hoặc qua proxy server)
  try {
    const qrImg = await loadQrImage(data.vietQrUrl);
    const imgW = qrImg.naturalWidth || 540;
    const imgH = qrImg.naturalHeight || 640;
    const imgRatio = imgW / imgH;
    let drawW = qrImgW - 8;
    let drawH = drawW / imgRatio;
    if (drawH > qrImgH - 8) {
      drawH = qrImgH - 8;
      drawW = drawH * imgRatio;
    }
    const drawX = qrImgX + (qrImgW - drawW) / 2;
    const drawY = qrImgY + (qrImgH - drawH) / 2;
    ctx.drawImage(qrImg, drawX, drawY, drawW, drawH);
  } catch (err) {
    console.warn("Không thể tải ảnh vietQrUrl trực tiếp, thử sinh VietQR nội bộ:", err);
    try {
      const localDataUrl = await generateVietQrDataUrl({
        bankName: data.bankName,
        accountNo: data.bankAccount,
        accountName: data.accountHolder,
        amount: data.totalAmount,
        description: data.transferContent,
      });
      const localImg = await loadQrImage(localDataUrl);
      const imgW = localImg.naturalWidth || 400;
      const imgH = localImg.naturalHeight || 400;
      const imgRatio = imgW / imgH;
      let drawW = qrImgW - 8;
      let drawH = drawW / imgRatio;
      if (drawH > qrImgH - 8) {
        drawH = qrImgH - 8;
        drawW = drawH * imgRatio;
      }
      const drawX = qrImgX + (qrImgW - drawW) / 2;
      const drawY = qrImgY + (qrImgH - drawH) / 2;
      ctx.drawImage(localImg, drawX, drawY, drawW, drawH);
    } catch (e2) {
      console.error("Lỗi vẽ VietQR lên Canvas:", e2);
      ctx.fillStyle = "#64748B";
      ctx.font = "600 12px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Mã VietQR Chuyển Khoản", qrImgX + qrImgW / 2, qrImgY + qrImgH / 2 - 10);
      ctx.fillText(data.transferContent, qrImgX + qrImgW / 2, qrImgY + qrImgH / 2 + 10);
    }
  }

  // Ghi chú dưới QR
  ctx.font = "italic 11.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const noteStr = "Quét mã QR bằng App Ngân Hàng bất kỳ để chuyển khoản tự động chính xác.";
  ctx.fillText(noteStr, cardX + cardW / 2, qrImgY + qrImgH + 11);

  // 9. Nút Call to Action dưới cùng
  curY = qrBoxY + qrBoxH + 14;
  const ctaH = 42;
  ctx.fillStyle = "#059669";
  roundRect(ctx, padLeft, curY, cardW - 48, ctaH, 12);
  ctx.fill();

  ctx.font = "700 13.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "📱 Quét mã QR bằng App Ngân Hàng để đóng học phí",
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
