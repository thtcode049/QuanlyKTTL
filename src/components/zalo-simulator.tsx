"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Edit3,
  RotateCcw,
  Eye,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { ZaloStudentInvoicePayload, buildZaloMessagePreview } from "@/lib/zalo";
import { dataStore } from "@/lib/data-store";
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
  const [activeTab, setActiveTab] = useState<"PREVIEW" | "EDIT">("PREVIEW");
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable message fields
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [customFooter, setCustomFooter] = useState("");
  const [customQrUrl, setCustomQrUrl] = useState<string>("");
  const [useUploadedQr, setUseUploadedQr] = useState<boolean>(false);

  // Sync state whenever payload opens
  useEffect(() => {
    if (payload) {
      const template = dataStore.zaloConfig;
      const initialPreview = buildZaloMessagePreview(payload, template);
      setCustomTitle(payload.customTitle || initialPreview.title);
      setCustomBody(payload.customBody || initialPreview.body);
      setCustomFooter(payload.customFooter || initialPreview.footer);
      setCustomQrUrl(payload.customQrUrl || dataStore.bankConfig.customQrImage || payload.vietQrUrl);
      setUseUploadedQr(Boolean(dataStore.bankConfig.useCustomQr && dataStore.bankConfig.customQrImage));
      setActiveTab("PREVIEW");
      setHasSent(false);
    }
  }, [payload, isOpen]);

  if (!isOpen || !payload) return null;

  // Active QR image to show
  const activeQrImage =
    useUploadedQr && customQrUrl ? customQrUrl : payload.customQrUrl || payload.vietQrUrl;

  const currentPreview = buildZaloMessagePreview(
    {
      ...payload,
      customTitle,
      customBody,
      customFooter,
      customQrUrl: activeQrImage,
    },
    dataStore.zaloConfig
  );

  const handleResetToDefault = () => {
    const initial = buildZaloMessagePreview(payload, dataStore.zaloConfig);
    setCustomTitle(initial.title);
    setCustomBody(initial.body);
    setCustomFooter(initial.footer);
    setCustomQrUrl(payload.vietQrUrl);
    setUseUploadedQr(false);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Vui lòng chọn ảnh dung lượng dưới 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      setCustomQrUrl(base64Url);
      setUseUploadedQr(true);
    };
    reader.readAsDataURL(file);
  };

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
    const text = `${currentPreview.title}
${currentPreview.body}
- Lớp: ${payload.className} (${payload.branchName})
- Số buổi đi học: ${payload.presentCount} buổi (${payload.presentDates.join(", ")})
- Đơn giá: ${payload.feePerSession.toLocaleString("vi-VN")} đ/buổi
- Tổng học phí: ${payload.totalAmount.toLocaleString("vi-VN")} VNĐ
- Thông tin CK: ${payload.bankName} - STK: ${payload.bankAccount} (${payload.accountHolder})
- Cú pháp CK: ${payload.transferContent}

${currentPreview.footer}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-transparent animate-fade-in overflow-y-auto">
      <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-slate-200 ring-1 ring-slate-900/10 my-auto max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between bg-[#0068FF] px-5 py-3.5 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white font-black text-sm">
              Z
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">Zalo OA Simulator & Message Editor</span>
                <span className="rounded bg-amber-400 px-1.5 py-0.2 text-[9px] font-extrabold text-slate-900">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-white/80">
                Tùy biến nội dung tin nhắn và thay đổi mã QR gửi phụ huynh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs between Preview & Edit */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2.5 flex-shrink-0">
          <button
            onClick={() => setActiveTab("PREVIEW")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "PREVIEW"
                ? "border-[#0068FF] text-[#0068FF] bg-white rounded-t-xl shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>Xem Tin Nhắn ({payload.studentName})</span>
          </button>

          <button
            onClick={() => setActiveTab("EDIT")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "EDIT"
                ? "border-[#0068FF] text-[#0068FF] bg-white rounded-t-xl shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Edit3 className="h-4 w-4 text-amber-500" />
            <span>Sửa Nội Dung & Đổi Mã QR</span>
          </button>
        </div>

        {/* Tab 1: PREVIEW IN SMARTPHONE MOCKUP */}
        {activeTab === "PREVIEW" && (
          <div className="flex-1 overflow-y-auto bg-[#E5E9EC] p-4 text-slate-800">
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
                    <span
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] text-white font-bold"
                      title="Tài khoản Doanh nghiệp Xác thực"
                    >
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
              {/* Title & Body */}
              <div className="border-b border-slate-100 pb-2.5">
                <span className="inline-block rounded-md bg-brand-primary/10 px-2 py-0.5 text-[11px] font-bold text-brand-primary">
                  HỌC PHÍ THÁNG {payload.month}/{payload.year}
                </span>
                <h4 className="mt-1 text-sm font-bold text-slate-900">
                  {currentPreview.title}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                  {currentPreview.body}
                </p>
              </div>

              {/* Structured Fields */}
              <div className="my-3 space-y-2 text-xs">
                {currentPreview.fields.map((field, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between py-1 border-b border-slate-50 ${
                      field.label === "Tổng học phí"
                        ? "rounded-lg bg-emerald-50 px-2 py-1.5 font-bold text-brand-primary"
                        : ""
                    }`}
                  >
                    <span className="text-slate-500">{field.label}:</span>
                    <span
                      className={`text-right ${
                        field.label === "Tổng học phí"
                          ? "text-base font-extrabold text-brand-primary"
                          : field.label === "Cú pháp chuyển khoản"
                          ? "font-mono font-bold text-brand-secondary"
                          : "font-semibold text-slate-800"
                      }`}
                    >
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Embedded QR Code in message */}
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <p className="text-[11px] font-semibold text-slate-700">
                    {useUploadedQr ? "Mã QR thanh toán tùy chỉnh" : "Mã VietQR thanh toán nhanh Napas 247"}
                  </p>
                  <button
                    onClick={() => setActiveTab("EDIT")}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Đổi mã QR ➔
                  </button>
                </div>

                <div className="mx-auto flex w-44 items-center justify-center rounded-xl bg-white p-2 shadow-sm border border-slate-200">
                  <img
                    src={activeQrImage}
                    alt="VietQR Zalo Embed"
                    className="h-auto w-full rounded-lg object-contain"
                  />
                </div>

                <p className="mt-2 text-[10px] text-slate-500 italic whitespace-pre-line">
                  {currentPreview.footer}
                </p>
              </div>

              {/* CTA button */}
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
        )}

        {/* Tab 2: EDIT MESSAGE CONTENT & CHANGE QR CODE */}
        {activeTab === "EDIT" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chỉnh Sửa Tin Nhắn Cho Em {payload.studentName}
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Thay đổi tiêu đề, lời nhắn riêng của HLV hoặc đổi mã QR trước khi gửi.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Khôi phục mẫu gốc</span>
              </button>
            </div>

            {/* 1. Sửa Tiêu đề tin nhắn */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Tiêu đề tin nhắn Zalo OA
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="VD: [KTTLL] THÔNG BÁO HỌC PHÍ THÁNG..."
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            {/* 2. Sửa Thân tin nhắn & Lời nhắn HLV */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800">
                  Nội dung lời nhắn đến phụ huynh
                </label>
                <span className="text-[10px] text-brand-primary font-semibold">
                  Gợi ý: Thêm lời nhận xét tiến bộ của kỳ thủ
                </span>
              </div>
              <textarea
                rows={4}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder="Nhập lời chào và nhận xét của HLV..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:border-brand-primary focus:outline-none leading-relaxed"
              />
            </div>

            {/* 3. Thay đổi mã QR */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-brand-primary" />
                  <span className="font-bold text-slate-900">Thay Đổi Mã QR Thanh Toán</span>
                </div>
                <span className="text-[11px] text-slate-500">Tùy chọn mã QR</span>
              </div>

              {/* Toggle switch between Auto VietQR and Custom Image */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUseUploadedQr(false)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 font-bold transition-all border ${
                    !useUploadedQr
                      ? "bg-white text-brand-primary border-brand-primary shadow-sm"
                      : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  <span>VietQR Động Napas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUseUploadedQr(true)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl p-2.5 font-bold transition-all border ${
                    useUploadedQr
                      ? "bg-white text-brand-primary border-brand-primary shadow-sm"
                      : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Ảnh QR Tùy Chỉnh</span>
                </button>
              </div>

              {/* Upload QR File Input */}
              {useUploadedQr ? (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleQrUpload}
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Upload className="h-3.5 w-3.5 text-brand-primary" />
                      <span>Tải ảnh mã QR từ máy tính</span>
                    </button>

                    <span className="text-[11px] text-slate-500">
                      Hỗ trợ PNG, JPG, WebP (mã MoMo, VNPAY, QR quầy...)
                    </span>
                  </div>

                  {customQrUrl && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl bg-white p-2.5 border border-slate-200">
                      <img
                        src={customQrUrl}
                        alt="Custom QR Preview"
                        className="h-16 w-16 object-contain rounded-lg border border-slate-100"
                      />
                      <div>
                        <p className="font-bold text-slate-800">Ảnh QR tùy chỉnh đang được chọn</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          ✓ Sẽ đính kèm mã này trong tin nhắn Zalo gửi phụ huynh
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <p>
                    <strong>Tài khoản nhận tiền:</strong> {payload.bankName} - STK:{" "}
                    <span className="font-mono font-bold text-slate-900">{payload.bankAccount}</span>
                  </p>
                  <p>
                    <strong>Số tiền tự động điền:</strong>{" "}
                    <span className="font-bold text-brand-primary">
                      {payload.totalAmount.toLocaleString("vi-VN")} đ
                    </span>
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    (Mã VietQR tự động sinh kèm số tiền và cú pháp chuyển khoản chính xác)
                  </p>
                </div>
              )}
            </div>

            {/* 4. Sửa Chân trang / Ghi chú */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Lưu ý / Ghi chú chân trang tin nhắn
              </label>
              <textarea
                rows={2}
                value={customFooter}
                onChange={(e) => setCustomFooter(e.target.value)}
                placeholder="VD: Quý phụ huynh vui lòng thanh toán đúng cú pháp..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("PREVIEW")}
                className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Áp Dụng & Xem Trước Tin Nhắn</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white p-4 flex-shrink-0">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Đã sao chép văn bản" : "Sao chép văn bản"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSendSimulation}
              disabled={isSending}
              className="flex items-center gap-2 rounded-xl bg-[#0068FF] px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-600 transition-colors disabled:opacity-50"
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
                  <span>Gửi Tin Zalo OA</span>
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
