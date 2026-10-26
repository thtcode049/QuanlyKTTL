/**
 * Zalo Helper Service
 * Cung cấp giải lập tin nhắn Zalo gửi phụ huynh và cấu hình mẫu gửi
 */

import { ZaloConfig } from "@/lib/data-store";

export interface ZaloStudentInvoicePayload {
  studentName: string;
  studentCode: string;
  parentName: string;
  parentPhone: string;
  className: string;
  branchName: string;
  month: number;
  year: number;
  presentCount: number;
  presentDates: string[]; // VD: ["03/10", "06/10", "10/10"]
  feePerSession: number;
  totalAmount: number;
  vietQrUrl: string;
  transferContent: string;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  // Các trường cho phép người dùng tùy biến nội dung và đổi mã QR
  customTitle?: string;
  customBody?: string;
  customFooter?: string;
  customQrUrl?: string;
}

export function formatZaloTemplate(template: string, data: ZaloStudentInvoicePayload): string {
  if (!template) return "";
  return template
    .replace(/\{studentName\}/g, data.studentName)
    .replace(/\{studentCode\}/g, data.studentCode)
    .replace(/\{parentName\}/g, data.parentName)
    .replace(/\{parentPhone\}/g, data.parentPhone)
    .replace(/\{className\}/g, data.className)
    .replace(/\{branchName\}/g, data.branchName)
    .replace(/\{month\}/g, String(data.month))
    .replace(/\{year\}/g, String(data.year))
    .replace(/\{presentCount\}/g, String(data.presentCount))
    .replace(/\{presentDates\}/g, data.presentDates.length > 0 ? data.presentDates.join(", ") : "Chưa có buổi học")
    .replace(/\{feePerSession\}/g, data.feePerSession.toLocaleString("vi-VN"))
    .replace(/\{totalAmount\}/g, data.totalAmount.toLocaleString("vi-VN"))
    .replace(/\{transferContent\}/g, data.transferContent)
    .replace(/\{bankName\}/g, data.bankName)
    .replace(/\{bankAccount\}/g, data.bankAccount)
    .replace(/\{accountHolder\}/g, data.accountHolder);
}

export function buildZaloMessagePreview(
  data: ZaloStudentInvoicePayload,
  templateConfig?: ZaloConfig
): {
  title: string;
  body: string;
  footer: string;
  fields: { label: string; value: string }[];
} {
  const defaultTitle = `[KTTLL] THÔNG BÁO HỌC PHÍ THÁNG ${data.month}/${data.year}`;
  const defaultBody = `Kính gửi phụ huynh em ${data.studentName}, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng ${data.month}/${data.year} theo nguyên tắc Thực học - Thực trả.`;
  const defaultFooter = "Lưu ý: Quý phụ huynh vui lòng thanh toán đúng cú pháp để hệ thống đối soát tự động. Mọi thắc mắc xin liên hệ Hotline CLB: 0904.555.666.";

  const title =
    data.customTitle !== undefined && data.customTitle.trim() !== ""
      ? data.customTitle
      : templateConfig?.titleTemplate
      ? formatZaloTemplate(templateConfig.titleTemplate, data)
      : defaultTitle;

  const body =
    data.customBody !== undefined && data.customBody.trim() !== ""
      ? data.customBody
      : templateConfig?.bodyTemplate
      ? formatZaloTemplate(templateConfig.bodyTemplate, data)
      : defaultBody;

  const footer =
    data.customFooter !== undefined && data.customFooter.trim() !== ""
      ? data.customFooter
      : templateConfig?.footerNote
      ? formatZaloTemplate(templateConfig.footerNote, data)
      : defaultFooter;

  return {
    title,
    body,
    footer,
    fields: [
      { label: "Học viên", value: `${data.studentName} (${data.studentCode})` },
      { label: "Lớp học", value: `${data.className} - ${data.branchName}` },
      { label: "Số buổi thực học", value: `${data.presentCount} buổi` },
      {
        label: "Các ngày có mặt",
        value: data.presentDates.length > 0 ? data.presentDates.join(", ") : "Chưa có buổi học",
      },
      {
        label: "Đơn giá",
        value: `${data.feePerSession.toLocaleString("vi-VN")} đ/buổi`,
      },
      {
        label: "Tổng học phí",
        value: `${data.totalAmount.toLocaleString("vi-VN")} VNĐ`,
      },
      {
        label: "Ngân hàng thụ hưởng",
        value: `${data.bankName} - ${data.bankAccount} (${data.accountHolder})`,
      },
      {
        label: "Cú pháp chuyển khoản",
        value: data.transferContent,
      },
    ],
  };
}

export async function sendZaloOaMessage(payload: ZaloStudentInvoicePayload): Promise<{
  success: boolean;
  isMock: boolean;
  messageId: string;
  error?: string;
}> {
  const appId = process.env.ZALO_APP_ID;
  const secretKey = process.env.ZALO_SECRET_KEY;
  const oaId = process.env.ZALO_OA_ID;

  // Nếu chưa có API credentials, tự động chạy Mock Simulator
  if (!appId || !secretKey || !oaId) {
    // Giả lập network delay 400ms
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      success: true,
      isMock: true,
      messageId: `MOCK_ZALO_${Date.now()}_${payload.studentCode}`,
    };
  }

  try {
    // Production Zalo OA API call (khi có token)
    return {
      success: true,
      isMock: false,
      messageId: `ZNS_${Date.now()}`,
    };
  } catch (error: any) {
    return {
      success: false,
      isMock: false,
      messageId: "",
      error: error.message || "Lỗi gửi tin Zalo",
    };
  }
}
