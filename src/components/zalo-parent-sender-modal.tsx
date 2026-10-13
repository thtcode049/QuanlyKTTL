"use client";

import React, { useState } from "react";
import {
  X,
  Send,
  ExternalLink,
  Phone,
  CheckCircle2,
  Clock,
  Sparkles,
  Terminal,
  Eye,
  QrCode,
  Image as ImageIcon,
  Check,
  Download,
  GraduationCap,
} from "lucide-react";
import { ClassroomData, BranchData } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export interface StudentParentInvoiceItem {
  invoiceId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  cleanParentPhone: string;
  className: string;
  branchName: string;
  month: number;
  year: number;
  presentCount: number;
  presentDates: string[];
  feePerSession: number;
  totalAmount: number;
  status: "PENDING" | "PAID";
  transferContent: string;
  vietQrUrl: string;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
}

interface ZaloParentSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: ClassroomData | null;
  branch: BranchData | null;
  month: number;
  year: number;
  students: StudentParentInvoiceItem[];
}

export default function ZaloParentSenderModal({
  isOpen,
  onClose,
  classroom,
  branch,
  month,
  year,
  students,
}: ZaloParentSenderModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentParentInvoiceItem | null>(
    students[0] || null
  );
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  if (!isOpen || !classroom) return null;

  const totalAmount = students.reduce((sum, s) => sum + s.totalAmount, 0);

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const previewStudent = selectedStudent || students[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Send className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black">
                HLV Gửi Thẻ Học Phí Đến Phụ Huynh (Zalo Cá Nhân)
              </h2>
              <p className="text-xs text-emerald-100">
                Lớp {classroom.name} • Tháng {month}/{year} • Tự động gửi bằng ảnh Thẻ Báo Học Phí chuyên nghiệp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* CLI Automation Banner */}
          <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Tool Tự Động Bắn Thẻ Ảnh Zalo Cá Nhân (Puppeteer)
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Tool tự động mở Zalo Web cá nhân của HLV, tìm SĐT phụ huynh và <strong>tự động gửi ảnh Thẻ Báo Học Phí</strong> (chuẩn 100% mẫu mocktest có VietQR). Không cần sao chép tin nhắn thủ công!
                </p>
              </div>
              <span className="shrink-0 self-start sm:self-center rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30">
                npm run zalo:send-parents
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
              <span className="text-slate-400">Lệnh chạy nhanh cho lớp này:</span>
              <code className="rounded bg-slate-800 px-2 py-0.5 text-emerald-300">
                node scripts/send-invoices-to-parents.js --class={classroom.id}
              </code>
              <span className="text-slate-500">•</span>
              <code className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                node scripts/send-invoices-to-parents.js --dry-run --class={classroom.id}
              </code>
            </div>
          </div>

          {/* Main Grid: Student List (Left) + Card Mocktest Preview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Student List (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Danh sách học viên trong lớp ({students.length} học sinh)
                </h3>
                <span className="text-xs font-bold text-emerald-600">
                  Tổng học phí: {formatCurrencyVND(totalAmount)}
                </span>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {students.map((st) => {
                  const isSelected = previewStudent?.studentId === st.studentId;

                  return (
                    <div
                      key={st.studentId}
                      onClick={() => setSelectedStudent(st)}
                      className={`cursor-pointer rounded-2xl p-3.5 transition-all border ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500"
                          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                              isSelected
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {st.studentCode}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                                {st.studentName}
                              </h4>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  st.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {st.status === "PAID" ? "Đã đóng" : "Chờ đóng"}
                              </span>
                            </div>

                            <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5">
                              <span>Phụ huynh: <strong>{st.parentName || "Chưa có"}</strong></span>
                              <span>•</span>
                              <span className="font-mono text-slate-700">{st.parentPhone}</span>
                            </p>
                            <p className="mt-1 text-[11px] text-slate-600">
                              Thực học: <strong>{st.presentCount}</strong> buổi | Số tiền:{" "}
                              <strong className="text-emerald-700">
                                {formatCurrencyVND(st.totalAmount)}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Actions for this student */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <a
                            href={`https://zalo.me/${st.cleanParentPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm"
                            title="Mở Zalo phụ huynh"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Mở Zalo</span>
                          </a>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent(st);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Xem thẻ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Card Mocktest Visual Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  Mẫu Thẻ Ảnh Sẽ Gửi Cho Phụ Huynh:
                </h3>
              </div>

              {previewStudent ? (
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-lg relative overflow-hidden">
                  {/* Stamp */}
                  <div className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-black text-xs shadow-md">
                    ♔
                  </div>

                  {/* Header Badge */}
                  <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold uppercase text-emerald-700 tracking-wide">
                    HỌC PHÍ THÁNG {previewStudent.month}/{previewStudent.year}
                  </span>

                  {/* Title */}
                  <h4 className="mt-2 text-sm font-extrabold text-slate-900 leading-tight">
                    [KTTLL] THÔNG BÁO HỌC PHÍ THÁNG {previewStudent.month}/{previewStudent.year}
                  </h4>

                  <p className="mt-2 text-[11.5px] leading-relaxed text-slate-600">
                    Kính gửi phụ huynh em <strong>{previewStudent.studentName}</strong>, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng {previewStudent.month}/{previewStudent.year} theo nguyên tắc <em>Thực học - Thực trả</em>.
                  </p>

                  {/* Details Table */}
                  <div className="mt-3.5 space-y-1.5 text-xs border-t border-b border-slate-100 py-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Học viên:</span>
                      <span className="font-bold text-slate-900">
                        {previewStudent.studentName} ({previewStudent.studentCode})
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Lớp học:</span>
                      <span className="font-bold text-slate-900 text-right max-w-[65%]">
                        {previewStudent.className} – {previewStudent.branchName}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Số buổi thực học:</span>
                      <span className="font-bold text-slate-900">
                        {previewStudent.presentCount} buổi
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Các ngày có mặt:</span>
                      <span className="font-bold text-slate-900 text-right">
                        {previewStudent.presentDates && previewStudent.presentDates.length > 0
                          ? previewStudent.presentDates.join(", ")
                          : "Chưa có buổi học"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Đơn giá:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrencyVND(previewStudent.feePerSession)}/buổi
                      </span>
                    </div>

                    {/* Highlight row */}
                    <div className="my-1.5 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 border border-emerald-200">
                      <span className="font-bold text-emerald-800 text-xs">Tổng học phí:</span>
                      <span className="font-black text-emerald-600 text-base">
                        {formatCurrencyVND(previewStudent.totalAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                      <span className="font-semibold text-slate-900 text-right max-w-[60%]">
                        {previewStudent.bankName} – {previewStudent.bankAccount} ({previewStudent.accountHolder})
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Cú pháp chuyển khoản:</span>
                      <span className="font-mono font-bold text-orange-600">
                        {previewStudent.transferContent}
                      </span>
                    </div>
                  </div>

                  {/* QR Box */}
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-center border border-slate-200/70">
                    <p className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                      <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                      Mã VietQR thanh toán nhanh Napas 247
                    </p>
                    <div className="mt-2 mx-auto flex h-36 w-36 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm border border-slate-200">
                      <img
                        src={previewStudent.vietQrUrl}
                        alt="VietQR"
                        className="h-full w-full object-contain rounded-lg"
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-400 italic">
                      Quét mã bằng App Ngân Hàng để tự động điền STK & số tiền
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
                  Chọn một học viên để xem trước thẻ học phí.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 gap-3">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Ảnh thẻ sắc nét được tự động render và gửi thẳng vào cuộc trò chuyện Zalo của từng phụ huynh.
            </span>
          </p>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
