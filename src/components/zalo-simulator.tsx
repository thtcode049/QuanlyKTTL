"use client";

import React, { useState } from "react";
import {
  X,
  Send,
  CheckCircle2,
  Phone,
  Copy,
  Check,
  Calendar,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ZaloStudentInvoicePayload, buildZaloMessagePreview } from "@/lib/zalo";
import confetti from "canvas-confetti";

interface ZaloSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: ZaloStudentInvoicePayload | null;
  onSentSuccess?: () => void;
}

export const ZaloSimulatorModal: React.FC<ZaloSimulatorModalProps> = ({
  isOpen,
  onClose,
  payload,
  onSentSuccess,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !payload) return null;

  const preview = buildZaloMessagePreview(payload);

  const handleSendSimulation = async () => {
    setIsSending(true);
    // Simulate API request to Zalo OA
    await new Promise((r) => setTimeout(r, 600));
    setIsSending(false);
    setHasSent(true);

    // Fire fireworks / confetti!
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#00B18A", "#E67E22", "#0068FF", "#FFD700"],
    });

    if (onSentSuccess) {
      onSentSuccess();
    }
  };

  const handleCopyText = () => {
    const text = `[KTTLL] THÔNG BÁO HỌC PHÍ THÁNG ${payload.month}/${payload.year}
Kính gửi phụ huynh em ${payload.studentName}, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng học phí:
- Lớp: ${payload.className} (${payload.branchName})
- Số buổi đi học: ${payload.presentCount} buổi (${payload.presentDates.join(", ")})
- Đơn giá: ${payload.feePerSession.toLocaleString("vi-VN")} đ/buổi
- Tổng học phí: ${payload.totalAmount.toLocaleString("vi-VN")} VNĐ
- Thông tin CK: ${payload.bankName} - STK: ${payload.bankAccount} (${payload.accountHolder})
- Cú pháp CK: ${payload.transferContent}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-[#0068FF] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <span className="font-extrabold text-sm">Z</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">Zalo OA Simulator</span>
                <span className="rounded bg-amber-400 px-1 py-0.2 text-[9px] font-extrabold text-slate-900">
                  MOCK TEST
                </span>
              </div>
              <p className="text-[11px] text-white/80">Xem trước tin nhắn Zalo gửi phụ huynh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Smartphone Zalo Chat Simulation Box */}
        <div className="max-h-[70vh] overflow-y-auto bg-[#E5E9EC] p-4 text-slate-800">
          {/* Zalo Verified OA Header Info */}
          <div className="mb-3 flex items-center justify-between rounded-xl bg-white/90 p-2.5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative h-10 w-10 flex-shrink-0 rounded-full bg-white p-0.5 shadow-sm ring-2 ring-emerald-500 flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Logo CLB"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900">
                    CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI
                  </span>
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] text-white font-bold" title="Tài khoản Doanh nghiệp Xác thực">
                    ✓
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Official Account • Hotline: 0904.555.666</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-400">
              Gửi tới: <span className="font-semibold text-slate-700">{payload.parentPhone}</span>
            </div>
          </div>

          {/* Time separator */}
          <div className="my-2 text-center">
            <span className="rounded-full bg-slate-300/60 px-2 py-0.5 text-[10px] text-slate-600">
              Hôm nay 18:30
            </span>
          </div>

          {/* Message Bubble Card */}
          <div className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-sm border border-slate-200/60">
            {/* Title */}
            <div className="border-b border-slate-100 pb-2.5">
              <span className="inline-block rounded-md bg-brand-primary/10 px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                HỌC PHÍ THÁNG {payload.month}/{payload.year}
              </span>
              <h4 className="mt-1 text-sm font-bold text-slate-900">
                {preview.title}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {preview.body}
              </p>
            </div>

            {/* Structured Fields */}
            <div className="my-3 space-y-2 text-xs">
              {preview.fields.map((field, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between py-1 border-b border-slate-50 ${
                    field.label === "Tổng học phí"
                      ? "rounded-lg bg-emerald-50 px-2 py-1.5 font-bold text-brand-primary"
                      : ""
                  }`}
                >
                  <span className="text-slate-500">{field.label}:</span>
                  <span className={`text-right ${
                    field.label === "Tổng học phí"
                      ? "text-base font-extrabold text-brand-primary"
                      : field.label === "Cú pháp chuyển khoản"
                      ? "font-mono font-bold text-brand-secondary"
                      : "font-semibold text-slate-800"
                  }`}>
                    {field.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Embedded QR Code in message */}
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-700 mb-2">
                Mã VietQR thanh toán nhanh (Đã kèm số tiền & nội dung)
              </p>
              <div className="mx-auto flex w-44 items-center justify-center rounded-lg bg-white p-2 shadow-sm border border-slate-200">
                <img
                  src={payload.vietQrUrl}
                  alt="VietQR Zalo Embed"
                  className="h-auto w-full rounded"
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                Lưu ý: Quý phụ huynh vui lòng thanh toán đúng cú pháp để hệ thống đối soát tự động.
              </p>
            </div>

            {/* CTA in message */}
            <div className="mt-3">
              <div className="rounded-xl bg-gradient-to-r from-brand-primary to-emerald-600 py-2.5 text-center text-xs font-bold text-white shadow-sm">
                Quét mã QR để đóng học phí ngay
              </div>
            </div>
          </div>

          {/* Delivery status indicator */}
          {hasSent && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Đã gửi thành công tới số {payload.parentPhone} (Zalo ID phụ huynh)</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white p-4">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Đã sao chép" : "Sao chép văn bản"}</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              onClick={handleSendSimulation}
              disabled={isSending}
              className="flex items-center gap-2 rounded-xl bg-[#0068FF] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-600 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang gửi...</span>
                </>
              ) : hasSent ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Gửi lại</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Mô phỏng gửi Zalo OA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZaloSimulatorModal;
