"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Settings,
  Upload,
  RefreshCw,
  Eye,
  Save,
  ImageIcon,
} from "lucide-react";
import { formatCurrencyVND, generateVietQrUrl, SUPPORTED_BANKS } from "@/lib/vietqr";
import { dataStore } from "@/lib/data-store";

interface VietQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentCode: string;
  amount: number;
  month: number;
  year: number;
  qrUrl: string;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  transferContent?: string;
}

export const VietQrModal: React.FC<VietQrModalProps> = ({
  isOpen,
  onClose,
  studentName,
  studentCode,
  amount: initialAmount,
  month,
  year,
  qrUrl: initialQrUrl,
  bankName: initialBankName,
  bankAccount: initialBankAccount,
  accountHolder: initialAccountHolder,
  transferContent: initialTransferContent,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"VIEW" | "CUSTOMIZE">("VIEW");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields for changing QR code
  const [bankId, setBankId] = useState("MB");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [amount, setAmount] = useState<number>(initialAmount);
  const [transferContent, setTransferContent] = useState("");
  const [qrTemplate, setQrTemplate] = useState<"compact2" | "compact" | "qr_only">("compact2");
  const [customQrImage, setCustomQrImage] = useState<string>("");
  const [useCustomQrImage, setUseUploadedQrImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const cfg = dataStore.bankConfig;
      setBankId(cfg.bankId || "MB");
      setBankAccount(initialBankAccount || cfg.bankAccount || "0987654321");
      setBankName(initialBankName || cfg.bankName || "Ngân hàng TMCP Quân Đội (MBBank)");
      setAccountHolder(initialAccountHolder || cfg.accountHolder || "CLB CO VUA KIEN TUONG TUONG LAI");
      setAmount(initialAmount);
      setTransferContent(initialTransferContent || `HP ${studentCode} T${month}`);
      setQrTemplate((cfg.qrTemplate as any) || "compact2");
      setCustomQrImage(cfg.customQrImage || "");
      setUseUploadedQrImage(Boolean(cfg.useCustomQr && cfg.customQrImage));
      setActiveTab("VIEW");
      setSaveSuccess(false);
    }
  }, [isOpen, initialAmount, studentCode, month, initialBankAccount, initialBankName, initialAccountHolder, initialTransferContent]);

  if (!isOpen) return null;

  // Generate dynamic QR code based on current editable parameters
  const dynamicQrUrl = generateVietQrUrl({
    bankId,
    accountNo: bankAccount,
    accountName: accountHolder,
    amount,
    description: transferContent,
    template: qrTemplate,
  });

  const activeQrDisplayUrl = useCustomQrImage && customQrImage ? customQrImage : dynamicQrUrl;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleBankSelect = (selectedId: string) => {
    setBankId(selectedId);
    const found = SUPPORTED_BANKS.find((b) => b.id === selectedId);
    if (found) {
      setBankName(`${found.name} (${found.shortName})`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Vui lòng chọn ảnh dung lượng dưới 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomQrImage(base64);
      setUseUploadedQrImage(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAsDefault = () => {
    dataStore.updateBankConfig({
      bankId,
      bankAccount,
      bankName,
      accountHolder,
      qrTemplate,
      customQrImage,
      useCustomQr: useCustomQrImage,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-transparent animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-slate-200 ring-1 ring-slate-900/10 my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-primary to-brand-primary-hover px-5 py-4 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Mã VietQR Thanh Toán Học Phí</h3>
              <p className="text-xs text-white/80">
                Tháng {month}/{year} • Kỳ thủ {studentName} ({studentCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs between View & Customize */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab("VIEW")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "VIEW"
                ? "border-brand-primary text-brand-primary bg-white rounded-t-xl shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Mã QR Thanh Toán</span>
          </button>

          <button
            onClick={() => setActiveTab("CUSTOMIZE")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "CUSTOMIZE"
                ? "border-brand-primary text-brand-primary bg-white rounded-t-xl shadow-sm"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Settings className="h-3.5 w-3.5 text-amber-500" />
            <span>Thay Đổi Mã QR & Tài Khoản</span>
          </button>
        </div>

        {/* Tab 1: VIEW QR CODE */}
        {activeTab === "VIEW" && (
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Học viên & Số tiền Banner */}
            <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-100 text-center">
              <p className="text-xs text-slate-600">
                Học phí kỳ thủ <strong className="text-slate-900">{studentName}</strong> ({studentCode})
              </p>
              <p className="mt-1 text-2xl font-black text-brand-primary">
                {formatCurrencyVND(amount)}
              </p>
            </div>

            {/* QR Code Image Display */}
            <div className="relative mx-auto flex w-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 shadow-inner">
              <img
                src={activeQrDisplayUrl}
                alt="Mã VietQR Thanh Toán"
                className="h-auto w-full rounded-xl object-contain shadow-sm bg-white"
              />
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setActiveTab("CUSTOMIZE")}
                className="text-xs font-bold text-brand-primary hover:underline inline-flex items-center gap-1"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Muốn đổi sang tài khoản khác hoặc tải ảnh QR riêng? Bấm vào đây</span>
              </button>
            </div>

            {/* Copyable Transfer Details */}
            <div className="space-y-2 text-xs">
              {/* STK */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/80">
                <div>
                  <span className="text-slate-500">Số tài khoản: </span>
                  <span className="font-mono font-bold text-slate-900">{bankAccount}</span>
                  <span className="text-[10px] text-slate-400 block">{bankName}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(bankAccount, "acc")}
                  className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
                >
                  {copiedField === "acc" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedField === "acc" ? "Đã chép" : "Chép"}</span>
                </button>
              </div>

              {/* Chủ TK */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/80">
                <div>
                  <span className="text-slate-500">Chủ tài khoản: </span>
                  <span className="font-bold text-slate-900">{accountHolder}</span>
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>

              {/* Cú pháp */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/80">
                <div>
                  <span className="text-slate-500">Nội dung CK: </span>
                  <span className="font-mono font-bold text-brand-secondary">{transferContent}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(transferContent, "memo")}
                  className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
                >
                  {copiedField === "memo" ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedField === "memo" ? "Đã chép" : "Chép"}</span>
                </button>
              </div>
            </div>

            {/* Hint */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-800 border border-amber-200/80">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <span>
                Phụ huynh mở bất kỳ App ngân hàng nào để quét mã QR. Số tiền và nội dung sẽ được điền tự động chính xác.
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: CUSTOMIZE & CHANGE QR CODE */}
        {activeTab === "CUSTOMIZE" && (
          <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Tùy Chỉnh Thông Tin Mã QR Nhận Tiền
                </h4>
                <p className="text-[11px] text-slate-500">
                  Thay đổi ngân hàng, số tài khoản thụ hưởng hoặc tải lên mã QR riêng của bạn.
                </p>
              </div>

              {saveSuccess && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Đã lưu mặc định!
                </span>
              )}
            </div>

            {/* Banner gợi ý trang cài đặt */}
            <div className="rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-200 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-emerald-900 font-medium">
                💡 Cài đặt STK nhận tiền cố định cho toàn bộ học sinh tại <strong>Trang Cài Đặt QR & Zalo</strong>:
              </span>
              <a
                href="/coach/settings"
                className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline shrink-0"
              >
                Mở Cài Đặt →
              </a>
            </div>

            {/* QR Mode Switcher */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Loại mã QR sử dụng</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUseUploadedQrImage(false)}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 font-bold transition-all border ${
                    !useCustomQrImage
                      ? "bg-white text-brand-primary border-brand-primary shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  <span>VietQR Tự Động</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUseUploadedQrImage(true)}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 font-bold transition-all border ${
                    useCustomQrImage
                      ? "bg-white text-brand-primary border-brand-primary shadow-sm"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Tải Lên Ảnh QR Riêng</span>
                </button>
              </div>
            </div>

            {/* If using Custom QR Image */}
            {useCustomQrImage ? (
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-3 animate-fade-in">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Ảnh mã QR riêng</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 font-bold text-white hover:bg-slate-800 shadow-sm"
                  >
                    <Upload className="h-3.5 w-3.5 text-brand-primary" />
                    <span>Tải ảnh từ máy</span>
                  </button>
                </div>

                {customQrImage ? (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    <img
                      src={customQrImage}
                      alt="Custom QR Preview"
                      className="h-20 w-20 object-contain rounded-lg border border-slate-100 shadow-sm"
                    />
                    <div>
                      <p className="font-bold text-slate-900">Đã nạp mã QR tùy chỉnh</p>
                      <p className="text-[11px] text-emerald-600 font-medium">
                        ✓ Mã này sẽ được hiển thị cho phụ huynh quét thanh toán.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Chưa có ảnh mã QR tùy chỉnh. Bấm "Tải ảnh từ máy" để chọn file ảnh mã QR (MoMo, ZaloPay, QR ngân hàng...).
                  </p>
                )}
              </div>
            ) : (
              /* If using dynamic VietQR */
              <div className="space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700">Ngân hàng thụ hưởng</label>
                    <select
                      value={bankId}
                      onChange={(e) => handleBankSelect(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none bg-white font-medium"
                    >
                      {SUPPORTED_BANKS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.shortName} - {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700">Số tài khoản *</label>
                    <input
                      type="text"
                      required
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="0987654321"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700">Tên chủ tài khoản (In hoa không dấu)</label>
                    <input
                      type="text"
                      required
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                      placeholder="CLB CO VUA KIEN TUONG TUONG LAI"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 uppercase font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Template style */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kiểu dáng hiển thị mã VietQR</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "compact2", name: "Chuẩn Napas (Đầy đủ)" },
                      { id: "compact", name: "Gọn gàng (Compact)" },
                      { id: "qr_only", name: "Chỉ mã QR vuông" },
                    ].map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setQrTemplate(tpl.id as any)}
                        className={`rounded-xl p-2 text-center border font-semibold transition-all ${
                          qrTemplate === tpl.id
                            ? "bg-brand-primary/10 border-brand-primary text-brand-primary font-bold shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Editable Amount & Transfer Content */}
            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 block">Điều chỉnh số tiền & cú pháp chuyển khoản</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-[11px] font-semibold">Số tiền thanh toán (VNĐ)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono font-bold text-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-[11px] font-semibold">Cú pháp chuyển khoản</label>
                  <input
                    type="text"
                    value={transferContent}
                    onChange={(e) => setTransferContent(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono font-bold text-brand-secondary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Save as default button */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSaveAsDefault}
                className="flex items-center gap-1.5 rounded-xl border border-brand-primary bg-emerald-50 px-3.5 py-2 font-bold text-brand-primary hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <Save className="h-4 w-4" />
                <span>Lưu làm tài khoản nhận mặc định</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("VIEW")}
                className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Xem Mã QR Mới</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center gap-2.5 border-t border-slate-100 bg-slate-50 p-4 flex-shrink-0">
          <a
            href={activeQrDisplayUrl}
            download={`VietQR_${studentCode}_T${month}.png`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Tải Ảnh QR</span>
          </a>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-brand-primary py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default VietQrModal;
