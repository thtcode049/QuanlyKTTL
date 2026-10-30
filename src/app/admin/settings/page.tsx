"use client";

import React, { useState, useRef } from "react";
import {
  Settings,
  CreditCard,
  QrCode,
  Send,
  Save,
  Check,
  ShieldCheck,
  ExternalLink,
  Smartphone,
  Eye,
  Upload,
  RotateCcw,
  Sparkles,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { dataStore } from "@/lib/data-store";
import { generateVietQrUrl, SUPPORTED_BANKS } from "@/lib/vietqr";
import VietQrModal from "@/components/vietqr-modal";
import ZaloSimulatorModal from "@/components/zalo-simulator";
import confetti from "canvas-confetti";

export default function AdminSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bank config state
  const [bankId, setBankId] = useState(dataStore.bankConfig.bankId || "MB");
  const [bankAccount, setBankAccount] = useState(dataStore.bankConfig.bankAccount || "0987654321");
  const [bankName, setBankName] = useState(dataStore.bankConfig.bankName || "Ngân hàng TMCP Quân Đội (MBBank)");
  const [accountHolder, setAccountHolder] = useState(dataStore.bankConfig.accountHolder || "CLB CO VUA KIEN TUONG TUONG LAI");
  const [qrTemplate, setQrTemplate] = useState<"compact2" | "compact" | "qr_only">(
    (dataStore.bankConfig.qrTemplate as any) || "compact2"
  );
  const [customQrImage, setCustomQrImage] = useState<string>(dataStore.bankConfig.customQrImage || "");
  const [useCustomQr, setUseCustomQr] = useState<boolean>(Boolean(dataStore.bankConfig.useCustomQr));

  // Zalo Template state (Hệ thống dùng Tool gửi Zalo hàng loạt, không dùng Zalo OA)
  const [titleTemplate, setTitleTemplate] = useState(dataStore.zaloConfig.titleTemplate);
  const [bodyTemplate, setBodyTemplate] = useState(dataStore.zaloConfig.bodyTemplate);
  const [footerNote, setFooterNote] = useState(dataStore.zaloConfig.footerNote);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modals for testing
  const [testQrModalOpen, setTestQrModalOpen] = useState(false);
  const [testZaloModalOpen, setTestZaloModalOpen] = useState(false);

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
      accountHolder,
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
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#00B18A", "#E67E22", "#0068FF"],
    });

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
          template: qrTemplate,
        });

  const sampleZaloPayload = {
    studentName: "Nguyễn Minh Khang",
    studentCode: "HS001",
    parentName: "Nguyễn Hoàng Nam",
    parentPhone: "0912.111.222",
    className: "Cờ vua Nhập Môn - K01",
    branchName: "Cơ sở Bạch Mai",
    month: 10,
    year: 2026,
    presentCount: 4,
    presentDates: ["02/10", "06/10", "09/10", "13/10"],
    feePerSession: 150000,
    totalAmount: 600000,
    vietQrUrl: sampleQrUrl,
    transferContent: "HP HS001 T10",
    bankName,
    bankAccount,
    accountHolder,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Cài Đặt VietQR & Mẫu Tin Nhắn Zalo
          </h1>
          <p className="text-xs text-slate-500">
            Tùy chỉnh thông tin tài khoản ngân hàng, mã QR thanh toán và mẫu nội dung tin nhắn gửi phụ huynh.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 rounded bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover active:scale-95 transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>Lưu Toàn Bộ Cấu Hình</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 animate-fade-in shadow-xs">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Đã lưu thành công cấu hình ngân hàng VietQR và mẫu tin nhắn Zalo vào hệ thống!</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* VietQR Bank Configuration & QR Changing */}
        <div className="rounded bg-white p-5 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-50 text-brand-primary">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cấu Hình Ngân Hàng Thụ Hưởng & Thay Đổi Mã QR
                </h3>
                <p className="text-xs text-slate-500">
                  Cấu hình tài khoản VietQR Napas hoặc tải lên ảnh mã QR riêng của CLB
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTestQrModalOpen(true)}
              className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-brand-primary" />
              <span>Xem Thử Mã QR</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Ngân hàng thụ hưởng</label>
              <select
                value={bankId}
                onChange={(e) => handleBankSelect(e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-white p-2 font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
              >
                {SUPPORTED_BANKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.shortName} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Số tài khoản thụ hưởng *</label>
              <input
                type="text"
                required
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="VD: 0987654321"
                className="mt-1 w-full rounded border border-slate-200 bg-white p-2 font-mono font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700">Tên chủ tài khoản (In hoa không dấu) *</label>
              <input
                type="text"
                required
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                placeholder="VD: CLB CO VUA KIEN TUONG TUONG LAI"
                className="mt-1 w-full rounded border border-slate-200 bg-white p-2 font-bold uppercase text-slate-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            {/* QR Template style */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kiểu dáng hiển thị VietQR</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "compact2", name: "Chuẩn Napas" },
                  { id: "compact", name: "Gọn gàng" },
                  { id: "qr_only", name: "Chỉ mã QR" },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setQrTemplate(tpl.id as any)}
                    className={`rounded p-1.5 text-center border font-semibold transition-colors text-xs ${
                      qrTemplate === tpl.id
                        ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom QR Image upload */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Mã QR riêng / Tĩnh của CLB</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrUpload}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5 text-brand-primary" />
                  <span>Tải ảnh QR riêng</span>
                </button>

                {customQrImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomQrImage("");
                      setUseCustomQr(false);
                    }}
                    className="flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xóa</span>
                  </button>
                )}
              </div>

              {customQrImage && (
                <div className="mt-2 flex items-center gap-2.5 p-2 bg-slate-50 rounded border border-slate-100">
                  <img
                    src={customQrImage}
                    alt="Custom QR Preview"
                    className="h-10 w-10 object-contain rounded border border-slate-200 bg-white"
                  />
                  <div>
                    <label className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustomQr}
                        onChange={(e) => setUseCustomQr(e.target.checked)}
                        className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                      />
                      <span>Ưu tiên dùng ảnh QR này</span>
                    </label>
                    <span className="text-[10px] text-slate-500 block">
                      Áp dụng thay cho mã VietQR sinh tự động
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zalo Template Configuration */}
        <div className="rounded bg-white p-5 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-50 text-[#0068FF]">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Mẫu Nội Dung Tin Nhắn Zalo Thông Báo Học Phí
                </h3>
                <p className="text-xs text-slate-500">
                  Tùy chỉnh tiêu đề, lời mở đầu, ghi chú gửi phụ huynh kèm các thẻ dữ liệu động
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetZaloTemplate}
                className="flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Mẫu gốc</span>
              </button>

              <button
                type="button"
                onClick={() => setTestZaloModalOpen(true)}
                className="flex items-center gap-1.5 rounded bg-[#0068FF] px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Xem Thử Zalo</span>
              </button>
            </div>
          </div>

          {/* Variable chips */}
          <div className="rounded bg-slate-50/70 p-2.5 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-700 block mb-1">
              💡 Bấm vào thẻ để chèn biến tự động vào nội dung tin nhắn:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { tag: "{studentName}", label: "Tên học viên" },
                { tag: "{studentCode}", label: "Mã học viên" },
                { tag: "{className}", label: "Tên lớp học" },
                { tag: "{month}", label: "Tháng" },
                { tag: "{year}", label: "Năm" },
                { tag: "{presentCount}", label: "Số buổi học" },
                { tag: "{totalAmount}", label: "Tổng học phí" },
                { tag: "{transferContent}", label: "Cú pháp chuyển khoản" },
              ].map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => handleInsertTag(item.tag)}
                  className="rounded bg-white px-2 py-0.5 text-[11px] font-mono font-semibold text-brand-primary border border-slate-200 hover:border-brand-primary hover:bg-emerald-50 transition-colors"
                  title={`Chèn ${item.label}`}
                >
                  {item.tag}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Tiêu đề */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Mẫu Tiêu Đề Tin Nhắn Zalo
              </label>
              <input
                type="text"
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                placeholder="VD: [KTTLL] THÔNG BÁO HỌC PHÍ THÁNG {month}/{year}"
                className="w-full rounded border border-slate-200 bg-white p-2 font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            {/* Nội dung lời chào & thân tin nhắn */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Mẫu Lời Mở Đầu & Thân Tin Nhắn
              </label>
              <textarea
                rows={3}
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                placeholder="Nhập nội dung tin nhắn gửi phụ huynh..."
                className="w-full rounded border border-slate-200 bg-white p-2 text-slate-800 focus:border-brand-primary focus:outline-none leading-relaxed"
              />
            </div>

            {/* Lưu ý / Ghi chú chân trang */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Mẫu Lưu Ý / Ghi Chú Chân Trang
              </label>
              <textarea
                rows={2}
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                placeholder="VD: Lưu ý: Quý phụ huynh vui lòng thanh toán đúng cú pháp..."
                className="w-full rounded border border-slate-200 bg-white p-2 text-slate-800 focus:border-brand-primary focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Quản lý & Dọn Dẹp Dữ Liệu Mẫu */}
        <div className="rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Trash2 className="h-4 w-4 text-rose-500" />
            <h2 className="text-xs font-bold text-slate-900">
              Quản Trị Dữ Liệu Mẫu & Khởi Tạo Môi Trường Thật
            </h2>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <div className="max-w-xl text-slate-500 leading-relaxed">
              <p>
                <strong>Dọn sạch dữ liệu mẫu:</strong> Xóa toàn bộ 4 lớp học mẫu (K01, K02, N01, DT01), 25 học sinh thử nghiệm và các lượt điểm danh mẫu. Giữ nguyên 8 cơ sở CLB và các tài khoản HLV thật đã đăng ký.
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Thao tác này đưa toàn bộ hệ thống về trạng thái trắng chuẩn để bắt đầu triển khai giảng dạy thực tế.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu mẫu (các lớp K01-DT01, 25 học sinh mẫu và điểm danh thử nghiệm) không?\n\nChỉ giữ lại các tài khoản HLV thật và 8 cơ sở CLB."
                    )
                  ) {
                    dataStore.cleanDemoData();
                    alert("Đã xóa sạch toàn bộ dữ liệu mẫu! Hệ thống đã sẵn sàng cho dữ liệu thật.");
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-1.5 rounded bg-rose-50 px-3.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa Sạch Dữ Liệu Mẫu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Khôi phục lại dữ liệu mẫu cho mục đích demo?")) {
                    dataStore.restoreDemoData();
                    alert("Đã khôi phục lại dữ liệu mẫu!");
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Nạp Lại Dữ Liệu Demo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded bg-brand-primary px-5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover active:scale-95 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>Lưu Toàn Bộ Cấu Hình</span>
          </button>
        </div>
      </form>

      {/* Test VietQR Modal */}
      <VietQrModal
        isOpen={testQrModalOpen}
        onClose={() => setTestQrModalOpen(false)}
        studentName="Nguyễn Minh Khang (Mẫu kiểm tra)"
        studentCode="HS001"
        amount={600000}
        month={10}
        year={2026}
        qrUrl={sampleQrUrl}
        bankName={bankName}
        bankAccount={bankAccount}
        accountHolder={accountHolder}
      />

      {/* Test Zalo Simulator Modal */}
      <ZaloSimulatorModal
        isOpen={testZaloModalOpen}
        onClose={() => setTestZaloModalOpen(false)}
        payload={sampleZaloPayload}
      />
    </div>
  );
}
