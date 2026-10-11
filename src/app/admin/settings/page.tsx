"use client";

import React, { useState } from "react";
import {
  Settings,
  CreditCard,
  QrCode,
  Send,
  Save,
  Check,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Smartphone,
  Eye,
} from "lucide-react";
import { dataStore } from "@/lib/data-store";
import { generateVietQrUrl } from "@/lib/vietqr";
import VietQrModal from "@/components/vietqr-modal";
import ZaloSimulatorModal from "@/components/zalo-simulator";
import confetti from "canvas-confetti";

export default function AdminSettingsPage() {
  // Bank config
  const [bankId, setBankId] = useState(dataStore.bankConfig.bankId);
  const [bankAccount, setBankAccount] = useState(dataStore.bankConfig.bankAccount);
  const [bankName, setBankName] = useState(dataStore.bankConfig.bankName);
  const [accountHolder, setAccountHolder] = useState(dataStore.bankConfig.accountHolder);

  // Zalo OA config
  const [zaloAppId, setZaloAppId] = useState(process.env.ZALO_APP_ID || "");
  const [zaloSecretKey, setZaloSecretKey] = useState(process.env.ZALO_SECRET_KEY || "");
  const [zaloOaId, setZaloOaId] = useState(process.env.ZALO_OA_ID || "");

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Test VietQR Modal
  const [testQrModalOpen, setTestQrModalOpen] = useState(false);

  // Test Zalo Simulator Modal
  const [testZaloModalOpen, setTestZaloModalOpen] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.bankConfig = {
      bankId,
      bankAccount,
      bankName,
      accountHolder,
    };

    setSavedSuccess(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#00B18A", "#E67E22", "#0068FF"],
    });

    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const sampleQrUrl = generateVietQrUrl({
    bankId,
    accountNo: bankAccount,
    accountName: accountHolder,
    amount: 600000,
    description: "HP HS001 T10",
  });

  const sampleZaloPayload = {
    studentName: "Nguyễn Minh Khang",
    studentCode: "HS001",
    parentName: "Nguyễn Hoàng Nam",
    parentPhone: "0912.111.222",
    className: "Cờ vua Vỡ Lòng - K01",
    branchName: "Cơ sở 1 - Bạch Mai",
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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
            <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
            <span>Cổng Thanh Toán & Tích Hợp Zalo OA</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            Cài Đặt VietQR & Zalo OA
          </h1>
          <p className="text-xs text-slate-500">
            Cấu hình tài khoản Napas 247 nhận học phí và hệ thống gửi tin Zalo thông báo tới phụ huynh.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95"
        >
          <Save className="h-4 w-4" />
          <span>Lưu Cấu Hình</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 animate-fade-in shadow-sm">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>Đã lưu thành công cấu hình ngân hàng VietQR và Zalo OA!</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* VietQR Bank Configuration */}
        <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-brand-primary">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cấu Hình Ngân Hàng Thụ Hưởng (VietQR Napas 247)
                </h3>
                <p className="text-xs text-slate-500">
                  Mã QR động sẽ được sinh tự động kèm số tiền học phí và cú pháp HP [MãHV] T[Tháng]
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTestQrModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Xem Thử Mã QR</span>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Ngân hàng (Mã BIN Napas)</label>
              <select
                value={bankId}
                onChange={(e) => {
                  setBankId(e.target.value);
                  if (e.target.value === "MB") setBankName("Ngân hàng TMCP Quân Đội (MBBank)");
                  if (e.target.value === "VCB") setBankName("Ngân hàng TMCP Ngoại Thương (Vietcombank)");
                  if (e.target.value === "TCB") setBankName("Ngân hàng TMCP Kỹ Thương (Techcombank)");
                  if (e.target.value === "BIDV") setBankName("Ngân hàng Đầu tư & Phát triển VN (BIDV)");
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
              >
                <option value="MB">MBBank - Ngân hàng Quân Đội (MB)</option>
                <option value="VCB">Vietcombank - Ngoại Thương Việt Nam</option>
                <option value="TCB">Techcombank - Kỹ Thương Việt Nam</option>
                <option value="BIDV">BIDV - Đầu tư và Phát triển Việt Nam</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Số tài khoản thụ hưởng *</label>
              <input
                type="text"
                required
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="VD: 0987654321"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Tên chủ tài khoản (Không dấu) *</label>
              <input
                type="text"
                required
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                placeholder="VD: CLB CO VUA KIEN TUONG TUONG LAI"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold uppercase text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Hiển thị chuẩn trên giao diện quét mã của tất cả các ứng dụng ngân hàng di động Việt Nam.
              </p>
            </div>
          </div>
        </div>

        {/* Zalo OA Configuration */}
        <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0068FF]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Cấu Hình Zalo Official Account (Zalo OA / ZNS)
                  </h3>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#0068FF]">
                    Tích hợp Mock Simulator
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Gửi tin nhắn thông báo học phí chi tiết có gắn link VietQR trực tiếp đến số điện thoại phụ huynh
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTestZaloModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#0068FF] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-600"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mở Zalo Simulator</span>
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Zalo App ID</label>
                <input
                  type="text"
                  value={zaloAppId}
                  onChange={(e) => setZaloAppId(e.target.value)}
                  placeholder="Để trống để chạy chế độ Simulator"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Zalo Secret Key</label>
                <input
                  type="password"
                  value={zaloSecretKey}
                  onChange={(e) => setZaloSecretKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Zalo OA ID</label>
                <input
                  type="text"
                  value={zaloOaId}
                  onChange={(e) => setZaloOaId(e.target.value)}
                  placeholder="VD: 123456789012345"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl bg-blue-50/70 p-3.5 text-xs text-slate-700 border border-blue-100 flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-[#0068FF] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Chế độ Zalo Simulator Modal đã sẵn sàng:</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Khi các biến Zalo để trống, hệ thống tự động kích hoạt Zalo Simulator Modal mô phỏng tin nhắn gửi cho phụ huynh ngay trên web giúp HLV và Quản lý kiểm tra nội dung, giao diện và mã QR trước khi triển khai thực tế.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
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
