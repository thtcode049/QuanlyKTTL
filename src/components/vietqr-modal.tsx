"use client";

import React, { useState } from "react";
import { X, Copy, Check, Download, QrCode, ShieldCheck, AlertCircle } from "lucide-react";
import { formatCurrencyVND } from "@/lib/vietqr";

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
  amount,
  month,
  year,
  qrUrl,
  bankName = "MBBank (Ngân hàng Quân Đội)",
  bankAccount = "0987654321",
  accountHolder = "CLB CO VUA KIEN TUONG TUONG LAI",
  transferContent,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const memo = transferContent || `HP ${studentCode} T${month}`;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-primary to-brand-primary-hover px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Mã VietQR Napas 247</h3>
              <p className="text-xs text-white/80">Học phí tháng {month}/{year}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Học viên & Số tiền Banner */}
          <div className="mb-4 rounded-xl bg-emerald-50/70 p-3.5 border border-emerald-100 text-center">
            <p className="text-xs text-slate-600">
              Thanh toán học phí cho kỳ thủ <strong className="text-slate-900">{studentName}</strong> ({studentCode})
            </p>
            <p className="mt-1 text-2xl font-black text-brand-primary">
              {formatCurrencyVND(amount)}
            </p>
          </div>

          {/* QR Code Image */}
          <div className="relative mx-auto flex w-60 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-2 shadow-inner">
            <img
              src={qrUrl}
              alt="Mã VietQR Thanh Toán"
              className="h-auto w-full rounded-lg object-contain shadow-sm"
              onError={(e) => {
                // Fallback nếu chặn hình
                const target = e.target as HTMLElement;
                target.style.display = "none";
              }}
            />
          </div>

          {/* Copyable Transfer Details */}
          <div className="mt-5 space-y-2.5 text-xs">
            {/* STK */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
              <div>
                <span className="text-slate-500">Số tài khoản: </span>
                <span className="font-bold text-slate-800">{bankAccount}</span>
                <span className="text-[10px] text-slate-400 block">{bankName}</span>
              </div>
              <button
                onClick={() => copyToClipboard(bankAccount, "acc")}
                className="flex items-center gap-1 rounded bg-white px-2 py-1 font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
              >
                {copiedField === "acc" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedField === "acc" ? "Đã chép" : "Chép"}</span>
              </button>
            </div>

            {/* Chủ TK */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
              <div>
                <span className="text-slate-500">Chủ tài khoản: </span>
                <span className="font-bold text-slate-800">{accountHolder}</span>
              </div>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>

            {/* Cú pháp */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
              <div>
                <span className="text-slate-500">Nội dung CK: </span>
                <span className="font-mono font-bold text-brand-secondary">{memo}</span>
              </div>
              <button
                onClick={() => copyToClipboard(memo, "memo")}
                className="flex items-center gap-1 rounded bg-white px-2 py-1 font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100"
              >
                {copiedField === "memo" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedField === "memo" ? "Đã chép" : "Chép"}</span>
              </button>
            </div>
          </div>

          {/* Hint */}
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800 border border-amber-200/80">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <span>
              Phụ huynh mở App ngân hàng quét mã QR để thông tin số tiền và nội dung tự động điền chính xác.
            </span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-2.5">
            <a
              href={qrUrl}
              download={`VietQR_${studentCode}_T${month}.png`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              <span>Tải ảnh QR</span>
            </a>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-brand-primary py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VietQrModal;
