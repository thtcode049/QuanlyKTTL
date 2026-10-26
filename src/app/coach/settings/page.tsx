"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Settings,
  CreditCard,
  QrCode,
  Send,
  Save,
  Check,
  ShieldCheck,
  Smartphone,
  Eye,
  Upload,
  RotateCcw,
  Sparkles,
  ImageIcon,
  Trash2,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import { dataStore } from "@/lib/data-store";
import { generateVietQrUrl, SUPPORTED_BANKS, formatCurrencyVND } from "@/lib/vietqr";
import confetti from "canvas-confetti";

export default function CoachSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bank config state
  const [bankId, setBankId] = useState("MB");
  const [bankAccount, setBankAccount] = useState("04092004369");
  const [bankName, setBankName] = useState("Ngân hàng TMCP Quân Đội (MBBank)");
  const [accountHolder, setAccountHolder] = useState("TRAN HUYEN TRANG");
  const [qrTemplate, setQrTemplate] = useState<"compact2" | "compact" | "qr_only" | "print">("compact2");
  const [customQrImage, setCustomQrImage] = useState<string>("");
  const [useCustomQr, setUseCustomQr] = useState<boolean>(false);

  // Zalo template state (Không chứa Zalo OA)
  const [titleTemplate, setTitleTemplate] = useState(dataStore.zaloConfig.titleTemplate);
  const [bodyTemplate, setBodyTemplate] = useState(dataStore.zaloConfig.bodyTemplate);
  const [footerNote, setFooterNote] = useState(dataStore.zaloConfig.footerNote);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Khởi tạo từ dataStore và localStorage khi mount
  useEffect(() => {
    const cfg = dataStore.bankConfig;
    if (cfg.bankId) setBankId(cfg.bankId);
    if (cfg.bankAccount) setBankAccount(cfg.bankAccount);
    if (cfg.bankName) setBankName(cfg.bankName);
    if (cfg.accountHolder) setAccountHolder(cfg.accountHolder);
    if (cfg.qrTemplate) setQrTemplate(cfg.qrTemplate);
    if (cfg.customQrImage) setCustomQrImage(cfg.customQrImage);
    if (cfg.useCustomQr !== undefined) setUseCustomQr(Boolean(cfg.useCustomQr));

    const zcfg = dataStore.zaloConfig;
    if (zcfg.titleTemplate) setTitleTemplate(zcfg.titleTemplate);
    if (zcfg.bodyTemplate) setBodyTemplate(zcfg.bodyTemplate);
    if (zcfg.footerNote) setFooterNote(zcfg.footerNote);
  }, []);

  const handleBankSelect = (selectedId: string) => {
    setBankId(selectedId);
    const found = SUPPORTED_BANKS.find((b) => b.id === selectedId);
    if (found) {
      setBankName(`${found.name} (${found.shortName})`);
    }
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
      const base64 = reader.result as string;
      setCustomQrImage(base64);
      setUseCustomQr(true);
    };
    reader.readAsDataURL(file);
  };

  const handleResetZaloTemplate = () => {
    setTitleTemplate("[KTTLL] THÔNG BÁO HỌC PHÍ THÁNG {month}/{year}");
    setBodyTemplate(
      "Kính gửi phụ huynh em {studentName}, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng {month}/{year} theo nguyên tắc Thực học - Thực trả."
    );
    setFooterNote(
      "Lưu ý: Quý phụ huynh vui lòng thanh toán đúng cú pháp để hệ thống đối soát tự động. Mọi thắc mắc xin liên hệ Hotline CLB: 0904.555.666."
    );
  };

  const handleInsertTag = (tag: string) => {
    setBodyTemplate((prev) => `${prev} ${tag}`);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    dataStore.updateBankConfig({
      bankId,
      bankAccount,
      bankName,
      accountHolder: accountHolder.trim().toUpperCase(),
      qrTemplate,
      customQrImage,
      useCustomQr,
    });

    dataStore.updateZaloConfig({
      titleTemplate,
      bodyTemplate,
      footerNote,
    });

    setSavedSuccess(true);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#00B18A", "#E67E22", "#0068FF"],
      });
    } catch (e) {}

    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const sampleQrUrl =
    useCustomQr && customQrImage
      ? customQrImage
      : generateVietQrUrl({
          bankId,
          accountNo: bankAccount,
          accountName: accountHolder,
          amount: 600000,
          description: "HP HS001 T10",
          template: qrTemplate as any,
        });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              Cài Đặt VietQR & Mẫu Tin Nhắn Zalo
            </h1>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-brand-primary">
              Quyền HLV
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Tùy chỉnh thông tin tài khoản ngân hàng thụ hưởng nhận học phí và mẫu tin nhắn gửi đến phụ huynh. Toàn bộ mã QR và file xuất sẽ tự động cập nhật theo cấu hình này.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/coach/invoices"
            className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Đến Trang Học Phí</span>
          </Link>

          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{savedSuccess ? "Đã Lưu Xong!" : "Lưu Cấu Hình"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {savedSuccess && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-brand-primary animate-fade-in shadow-soft">
          <Check className="h-5 w-5 flex-shrink-0" />
          <span>
            Đã lưu thành công cấu hình ngân hàng VietQR và mẫu tin nhắn Zalo vào hệ thống! Trang học phí và tính năng xuất ảnh thẻ đã được áp dụng ngay lập tức.
          </span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* SECTION 1: CẤU HÌNH NGÂN HÀNG & MÃ VIETQR */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-soft border border-slate-200/80">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-brand-primary shadow-sm">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                1. Tài Khoản Ngân Hàng Thụ Hưởng & Mã VietQR
              </h3>
              <p className="text-xs text-slate-500">
                Thông tin nhận học phí của Huấn luyện viên khi phụ huynh quét mã thanh toán.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Fields (7 cols) */}
            <div className="lg:col-span-7 space-y-5 text-xs">
              {/* Lựa chọn loại QR */}
              <div>
                <label className="font-bold text-slate-700 block mb-2">
                  Hình thức mã QR nhận học phí
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUseCustomQr(false)}
                    className={`flex items-center justify-center gap-2 rounded-2xl p-3 border-2 font-bold transition-all ${
                      !useCustomQr
                        ? "border-brand-primary bg-emerald-50/50 text-brand-primary shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <span>VietQR Tự Động (Khuyên dùng)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseCustomQr(true)}
                    className={`flex items-center justify-center gap-2 rounded-2xl p-3 border-2 font-bold transition-all ${
                      useCustomQr
                        ? "border-brand-primary bg-emerald-50/50 text-brand-primary shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    <span>Tải Lên Ảnh QR Riêng</span>
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  VietQR tự động sẽ tự điền chính xác số tiền học phí và cú pháp học viên khi phụ huynh quét.
                </p>
              </div>

              {!useCustomQr ? (
                <>
                  {/* Chọn Ngân Hàng */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Ngân hàng thụ hưởng
                    </label>
                    <select
                      value={bankId}
                      onChange={(e) => handleBankSelect(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                    >
                      {SUPPORTED_BANKS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.shortName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Số Tài Khoản */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Số tài khoản thụ hưởng
                    </label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="VD: 04092004369"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-sm font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                      required
                    />
                  </div>

                  {/* Tên Chủ Tài Khoản */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Tên chủ tài khoản (In hoa không dấu)
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                      placeholder="VD: TRAN HUYEN TRANG"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold uppercase text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                      required
                    />
                  </div>

                  {/* Kiểu Dáng VietQR */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">
                      Kiểu dáng hiển thị mã VietQR
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "compact2", name: "Chuẩn Napas" },
                        { id: "compact", name: "Gọn gàng" },
                        { id: "qr_only", name: "Chỉ mã QR" },
                        { id: "print", name: "Bản in" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setQrTemplate(t.id as any)}
                          className={`rounded-xl border py-2 px-2.5 text-center font-bold text-xs transition-all ${
                            qrTemplate === t.id
                              ? "border-brand-primary bg-emerald-50 text-brand-primary ring-1 ring-brand-primary/30"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Tải lên ảnh QR riêng */
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-brand-primary transition-colors bg-slate-50/50">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleQrUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-brand-primary">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-800">
                      Bấm vào đây để chọn ảnh mã QR từ máy tính của bạn
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Hỗ trợ định dạng PNG, JPG, JPEG (Dung lượng tối đa 5MB)
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover transition-colors"
                    >
                      Chọn Ảnh QR
                    </button>
                  </div>

                  {customQrImage && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
                      <div className="flex items-center gap-3">
                        <img
                          src={customQrImage}
                          alt="QR riêng"
                          className="h-12 w-12 rounded-lg object-contain border border-slate-200 bg-white"
                        />
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            Đã tải lên ảnh mã QR riêng thành công
                          </p>
                          <p className="text-[11px] text-emerald-600">Đang được chọn làm mã QR ưu tiên</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomQrImage("");
                          setUseCustomQr(false);
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Xóa ảnh QR này và dùng VietQR tự động"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live QR Preview Box (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/80 p-6 border border-slate-200/80 text-center">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2">
                Bản Xem Trước Mã VietQR Thực Tế
              </span>

              <div className="mt-2 flex h-64 w-64 items-center justify-center rounded-2xl bg-white p-3 shadow-md border border-slate-200">
                <img
                  src={sampleQrUrl}
                  alt="VietQR Preview"
                  className="h-full w-full object-contain rounded-xl"
                />
              </div>

              <div className="mt-4 space-y-1 text-xs">
                <p className="font-bold text-slate-900">{accountHolder || "TÊN CHỦ TÀI KHOẢN"}</p>
                <p className="font-mono text-slate-600">
                  STK: <strong>{bankAccount || "0000000000"}</strong> ({bankId})
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  ✓ Quét thử được ngay bằng ứng dụng ngân hàng bất kỳ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: CẤU HÌNH MẪU TIN NHẮN ZALO GỬI PHỤ HUYNH */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-brand-primary shadow-sm">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  2. Mẫu Tin Nhắn Zalo Thông Báo Học Phí
                </h3>
                <p className="text-xs text-slate-500">
                  Nội dung tin nhắn đi kèm thẻ học phí khi gửi qua phần mềm Zalo Bulk Sender hoặc sao chép gửi thủ công.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetZaloTemplate}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              title="Khôi phục mẫu tin nhắn mặc định ban đầu"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Khôi Phục Mẫu</span>
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Template Inputs (7 cols) */}
            <div className="lg:col-span-7 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tiêu đề tin nhắn
                </label>
                <input
                  type="text"
                  value={titleTemplate}
                  onChange={(e) => setTitleTemplate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Nội dung thông báo
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Bấm các thẻ bên dưới để chèn nhanh thông tin học viên
                  </span>
                </div>

                {/* Các thẻ Tag chèn nhanh */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[
                    { tag: "{studentName}", label: "Tên học viên" },
                    { tag: "{studentCode}", label: "Mã HV" },
                    { tag: "{className}", label: "Lớp học" },
                    { tag: "{month}", label: "Tháng" },
                    { tag: "{year}", label: "Năm" },
                    { tag: "{presentCount}", label: "Số buổi học" },
                    { tag: "{totalAmount}", label: "Tổng học phí" },
                    { tag: "{transferContent}", label: "Cú pháp CK" },
                  ].map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-brand-primary border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Ghi chú chân trang / Số Hotline hỗ trợ
                </label>
                <textarea
                  rows={2}
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Live Zalo Preview (5 cols) */}
            <div className="lg:col-span-5">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-2 block text-center">
                Mô Phỏng Tin Nhắn Zalo Phụ Huynh Nhận Được
              </span>

              <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-inner">
                {/* Zalo Chat Bubble */}
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">
                      Zalo
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">CLB Kiện Tướng Tương Lai</p>
                      <p className="text-[10px] text-slate-400">Vừa xong</p>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-blue-800 text-xs">
                    {titleTemplate.replace("{month}", "10").replace("{year}", "2026")}
                  </h4>

                  <p className="text-slate-700 leading-relaxed text-[11.5px]">
                    {bodyTemplate
                      .replace("{studentName}", "Nguyễn Minh Khang")
                      .replace("{studentCode}", "HS001")
                      .replace("{className}", "Cờ vua Nhập Môn - K01")
                      .replace("{month}", "10")
                      .replace("{year}", "2026")
                      .replace("{presentCount}", "4")
                      .replace("{totalAmount}", "600.000 đ")
                      .replace("{transferContent}", "HP HS001 T10")}
                  </p>

                  <div className="rounded-xl bg-blue-50/60 p-2.5 border border-blue-100 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số buổi học:</span>
                      <strong className="text-slate-800">4 / 4 buổi</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tổng học phí:</span>
                      <strong className="text-emerald-700">600.000 VNĐ</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cú pháp CK:</span>
                      <strong className="font-mono text-orange-600">HP HS001 T10</strong>
                    </div>
                  </div>

                  <p className="text-[10.5px] italic text-slate-500">{footerNote}</p>

                  <div className="pt-1 text-center">
                    <span className="inline-block rounded-lg bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                      [Ảnh thẻ học phí VietQR sẽ được đính kèm tự động]
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar Button Bottom */}
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-soft border border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-brand-primary" />
            <span>Thông tin được lưu trữ bảo mật và đồng bộ tức thì trên tài khoản của bạn.</span>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95 transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{savedSuccess ? "Đã Lưu Xong!" : "Lưu Toàn Bộ Cấu Hình"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
