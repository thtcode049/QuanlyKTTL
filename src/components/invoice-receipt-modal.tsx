"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Send,
  QrCode,
  Sparkles,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import {
  InvoiceCardData,
  downloadInvoiceCardPng,
  copyInvoiceCardToClipboard,
} from "@/lib/invoice-card-generator";
import { formatCurrencyVND } from "@/lib/vietqr";

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceCardData | null;
  onOpenZaloTool?: (studentId?: string) => void;
}

export default function InvoiceReceiptModal({
  isOpen,
  onClose,
  data,
  onOpenZaloTool,
}: InvoiceReceiptModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copyImageSuccess, setCopyImageSuccess] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyImage = async () => {
    try {
      setIsCopyingImage(true);
      await copyInvoiceCardToClipboard(data);
      setCopyImageSuccess(true);
      setTimeout(() => setCopyImageSuccess(false), 2500);
    } catch (err) {
      alert("Không thể sao chép ảnh vào bộ nhớ tạm. Bạn có thể bấm 'Tải Ảnh PNG' để tải file về máy.");
    } finally {
      setIsCopyingImage(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const hasMultipleClasses = Boolean(data.classList && data.classList.length > 1);

  return (
    <>
      {/* Styles tối ưu riêng cho chế độ In (Print) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-area,
          #printable-receipt-area * {
            visibility: visible !important;
          }
          #printable-receipt-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-fade-in no-print"
        onClick={onClose}
      >
        <div
          className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Modal Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-brand-primary">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Phiếu Thu Học Phí Có Mã VietQR Động
                </h3>
                <p className="text-[11px] text-slate-500">
                  Học viên: <strong className="text-slate-800">{data.studentName}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Vùng Nội Dung Phiếu Thu (Có thể cuộn và hỗ trợ In trực tiếp) */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
            <div
              id="printable-receipt-area"
              className="border border-slate-200 rounded-2xl p-5 sm:p-7 bg-white shadow-xs space-y-5"
            >
              {/* Header Phiếu Thu */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-sm">
                      ♔
                    </span>
                    <h2 className="text-sm font-extrabold text-slate-800 tracking-tight uppercase">
                      CLB Cờ Vua Kiện Tướng Tương Lai (KTTLL)
                    </h2>
                  </div>
                  <h1 className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    PHIẾU THU HỌC PHÍ
                  </h1>
                  <p className="text-xs font-semibold text-emerald-700">
                    THÁNG {data.month}/{data.year}
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs space-y-1 text-slate-500">
                  <p>Ngày lập phiếu: <strong className="text-slate-700">{new Date().toLocaleDateString("vi-VN")}</strong></p>
                  <span className="inline-block rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                    Thực học - Thực trả
                  </span>
                </div>
              </div>

              {/* Thông tin học viên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50/80 p-3.5 text-xs border border-slate-100">
                <div>
                  <span className="text-slate-500">Học viên:</span>{" "}
                  <strong className="text-slate-900 font-bold text-sm ml-1">{data.studentName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Lớp học:</span>{" "}
                  <strong className="text-slate-800 font-medium ml-1">{data.className}</strong>
                </div>
                {data.branchName && (
                  <div>
                    <span className="text-slate-500">Cơ sở đào tạo:</span>{" "}
                    <strong className="text-slate-800 font-medium ml-1">{data.branchName}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Tổng số buổi thực học:</span>{" "}
                  <strong className="text-emerald-700 font-bold ml-1">{data.presentCount} buổi</strong>
                </div>
              </div>

              {/* Chi tiết từng lớp (nếu học nhiều lớp) hoặc chi tiết buổi học */}
              {hasMultipleClasses ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Chi tiết các lớp tham gia ({data.classList!.length} lớp):
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Lớp học</th>
                          <th className="p-2.5 text-center">Số buổi</th>
                          <th className="p-2.5">Ngày có mặt</th>
                          <th className="p-2.5 text-right">Đơn giá</th>
                          <th className="p-2.5 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.classList!.map((cls, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-medium text-slate-800">{cls.className}</td>
                            <td className="p-2.5 text-center font-bold text-slate-700">{cls.presentCount}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                              {cls.presentDates.length > 0 ? cls.presentDates.join(", ") : "Chưa có"}
                            </td>
                            <td className="p-2.5 text-right text-slate-600">{formatCurrencyVND(cls.feePerSession)}</td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">{formatCurrencyVND(cls.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Các ngày học sinh có mặt:</span>
                    <strong className="text-slate-800 font-mono">
                      {data.presentDates && data.presentDates.length > 0 ? data.presentDates.join(", ") : "Chưa có buổi học"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Đơn giá học phí:</span>
                    <strong className="text-slate-700">{formatCurrencyVND(data.feePerSession)} / buổi</strong>
                  </div>
                </div>
              )}

              {/* Hộp Tổng Học Phí */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Tổng Học Phí Phải Nộp:
                  </span>
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    (Đã tính theo số buổi thực tế học sinh tham gia lớp)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-brand-primary">
                    {formatCurrencyVND(data.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Khung VietQR Động & Cú Pháp Chuyển Khoản */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5">
                {/* Ảnh QR Động */}
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                    <img
                      src={data.vietQrUrl}
                      alt="Mã VietQR Chuyển Khoản"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  </div>
                  <span className="mt-1.5 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Mã VietQR Động Napas 24/7
                  </span>
                </div>

                {/* Thông tin chuyển khoản & Cú pháp */}
                <div className="w-full space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-500">Ngân hàng:</span>
                    <strong className="text-slate-900 font-bold">{data.bankName}</strong>
                  </div>

                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <div className="flex items-center gap-1.5">
                      <strong className="font-mono text-sm font-black text-slate-900">{data.bankAccount}</strong>
                      <button
                        type="button"
                        onClick={() => handleCopyText(data.bankAccount, "account")}
                        className="text-slate-400 hover:text-brand-primary p-0.5 rounded transition-colors"
                        title="Sao chép số tài khoản"
                      >
                        {copiedField === "account" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-500">Chủ tài khoản:</span>
                    <strong className="text-slate-800 font-bold uppercase">{data.accountHolder}</strong>
                  </div>

                  {/* Cú pháp chuyển khoản nổi bật */}
                  <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 uppercase">
                        Cú pháp chuyển khoản:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(data.transferContent, "syntax")}
                        className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10.5px] font-semibold text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors"
                        title="Sao chép cú pháp chuyển khoản"
                      >
                        {copiedField === "syntax" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="mt-1 font-mono text-sm font-extrabold text-orange-600 tracking-wide select-all">
                      {data.transferContent}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    💡 Quý phụ huynh chỉ cần mở bất kỳ ứng dụng ngân hàng và <strong>quét mã QR</strong> trên, hệ thống sẽ tự động điền sẵn số tiền và cú pháp chuẩn xác.
                  </p>
                </div>
              </div>

              {/* Lời cảm ơn */}
              <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-100">
                CLB Cờ vua Kiện Tướng Tương Lai trân trọng cảm ơn sự đồng hành của Quý phụ huynh!
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 no-print">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Mã QR đã sẵn sàng số tiền & cú pháp {data.transferContent}
            </span>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
              {/* Nút In Phiếu Thu */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs active:scale-95 transition-all"
                title="In phiếu thu ra máy in hoặc lưu file PDF"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span>In Phiếu Thu</span>
              </button>

              {/* Nút Sao Chép Ảnh Thẻ */}
              <button
                type="button"
                disabled={isCopyingImage}
                onClick={handleCopyImage}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs active:scale-95 transition-all disabled:opacity-50"
                title="Sao chép ảnh thẻ học phí vào bộ nhớ tạm để dán (Ctrl+V) vào Zalo"
              >
                {copyImageSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Đã Chép Ảnh</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-600" />
                    <span>Sao Chép Ảnh</span>
                  </>
                )}
              </button>

              {/* Nút Tải Ảnh PNG */}
              <button
                type="button"
                onClick={() => downloadInvoiceCardPng(data)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all"
                title="Tải ảnh thẻ học phí chất lượng cao (PNG) về máy"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải Ảnh PNG</span>
              </button>

              {/* Nút Gửi Zalo Tool nếu có callback */}
              {onOpenZaloTool && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenZaloTool();
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-3 py-1.5 text-xs font-semibold active:scale-95 transition-all"
                  title="Mở phần mềm Zalo gửi thẻ học phí đến phụ huynh"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Tool Zalo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
