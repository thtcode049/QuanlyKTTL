"use client";

import React, { useState, useEffect } from "react";
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
  Copy,
  Loader2,
  AlertCircle,
  Play,
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
  initialStudentId?: string;
}

export default function ZaloParentSenderModal({
  isOpen,
  onClose,
  classroom,
  branch,
  month,
  year,
  students,
  initialStudentId,
}: ZaloParentSenderModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentParentInvoiceItem | null>(() => {
    if (initialStudentId) {
      const found = students.find((s) => s.studentId === initialStudentId);
      if (found) return found;
    }
    return students[0] || null;
  });

  useEffect(() => {
    if (initialStudentId) {
      const found = students.find((s) => s.studentId === initialStudentId);
      if (found) {
        setSelectedStudent(found);
        return;
      }
    }
    if (!selectedStudent && students.length > 0) {
      setSelectedStudent(students[0]);
    }
  }, [initialStudentId, students]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Automation Bot Execution State
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botStatus, setBotStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [botMessage, setBotMessage] = useState("");
  const [botLogs, setBotLogs] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [activeTargetStudent, setActiveTargetStudent] = useState<string | null>(null);

  if (!isOpen || !classroom) return null;

  const totalAmount = students.reduce((sum, s) => sum + s.totalAmount, 0);
  const previewStudent = selectedStudent || students[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Tạo nội dung tin nhắn gửi Zalo chuyên nghiệp
  const buildZaloMessageText = (st: StudentParentInvoiceItem) => {
    const datesStr =
      st.presentDates && st.presentDates.length > 0
        ? st.presentDates.join(", ")
        : "Theo lịch học";

    return `🥋 CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTLL)
📋 THÔNG BÁO HỌC PHÍ THÁNG ${st.month}/${st.year}
----------------------------------------
Kính gửi: Phụ huynh em ${st.studentName} (${st.studentCode})
• Lớp học: ${st.className} – ${st.branchName}
• Số buổi thực học: ${st.presentCount} buổi (${datesStr})
• Đơn giá: ${formatCurrencyVND(st.feePerSession)}/buổi
💰 TỔNG HỌC PHÍ: ${formatCurrencyVND(st.totalAmount)}

🏦 THÔNG TIN THANH TOÁN (VietQR Napas 24/7):
• Ngân hàng: ${st.bankName}
• Số tài khoản: ${st.bankAccount}
• Chủ tài khoản: ${st.accountHolder}
• Cú pháp chuyển khoản: ${st.transferContent}
----------------------------------------
(CLB xin gửi kèm Thẻ Báo Học Phí có mã VietQR để Quý phụ huynh quét mã chuyển khoản nhanh).
Trân trọng cảm ơn Quý phụ huynh!`;
  };

  // Sao chép tin nhắn vào Clipboard
  const handleCopyMessage = (st: StudentParentInvoiceItem) => {
    const text = buildZaloMessageText(st);
    navigator.clipboard.writeText(text);
    setCopiedStudentId(st.studentId);
    showToast(`Đã sao chép tin nhắn thông báo học phí của em ${st.studentName}!`);
    setTimeout(() => setCopiedStudentId(null), 2500);
  };

  // Mở Chat Zalo + Tự động copy nội dung
  const handleOpenZaloAndCopy = (st: StudentParentInvoiceItem) => {
    const text = buildZaloMessageText(st);
    navigator.clipboard.writeText(text);
    setCopiedStudentId(st.studentId);
    showToast(`Đã sao chép tin nhắn! Bạn chỉ cần nhấn Ctrl + V vào ô chat Zalo để gửi ngay.`);
    
    // Mở Zalo Web trong tab mới
    const url = `https://zalo.me/${st.cleanParentPhone}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Kích hoạt Tool Bot Puppeteer tự động gửi (Cả lớp hoặc 1 học sinh)
  const handleTriggerBot = async (studentCode?: string, dryRun: boolean = false) => {
    if (!classroom) return;

    setIsBotRunning(true);
    setBotStatus("running");
    setActiveTargetStudent(studentCode || "all");
    setBotMessage(
      dryRun
        ? "Đang chạy thử nghiệm (Dry-Run) và chuẩn bị toàn bộ thẻ học phí..."
        : studentCode
        ? `Đang mở Zalo & tự động gửi thẻ học phí cho học viên ${studentCode}...`
        : "Đang mở Zalo Web cá nhân của HLV và tự động gửi thẻ học phí cho cả lớp..."
    );

    try {
      const res = await fetch("/api/coach/send-zalo-parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: classroom.id,
          studentCode: studentCode || undefined,
          dryRun,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBotStatus("success");
        setBotMessage(data.message || "Hoàn thành gửi học phí!");
        setBotLogs(data.output || "");
        showToast(data.message || "Thao tác thành công!");
      } else {
        setBotStatus("error");
        setBotMessage(data.message || "Có lỗi xảy ra khi chạy bot.");
        setBotLogs(data.output || "");
      }
    } catch (err: any) {
      setBotStatus("error");
      setBotMessage(err.message || "Không thể kết nối đến máy chủ.");
    } finally {
      setIsBotRunning(false);
      setActiveTargetStudent(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white flex-shrink-0">
            <Check className="h-4 w-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-5 sm:px-6 py-4 text-white gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-inner flex-shrink-0">
              <Send className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                HLV Gửi Thẻ Học Phí Đến Phụ Huynh (Zalo Cá Nhân)
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Lớp {classroom.name} • Tháng {month}/{year} • Tự động gửi bằng ảnh Thẻ Báo Học Phí chuyên nghiệp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Nút gửi hàng loạt cả lớp nổi bật */}
            <button
              type="button"
              disabled={isBotRunning}
              onClick={() => handleTriggerBot(undefined, false)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-800 shadow-md hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-60"
            >
              {isBotRunning && activeTargetStudent === "all" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                  <span>Đang gửi cả lớp...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 text-emerald-700" />
                  <span>🚀 Gửi Zalo Cho Cả Lớp</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          {/* Bot Execution Status Alert */}
          {botStatus !== "idle" && (
            <div
              className={`rounded-2xl p-4 transition-all border ${
                botStatus === "running"
                  ? "bg-blue-50/80 border-blue-200 text-blue-900"
                  : botStatus === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-rose-50 border-rose-300 text-rose-900"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {botStatus === "running" && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 flex-shrink-0" />
                  )}
                  {botStatus === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  )}
                  {botStatus === "error" && (
                    <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold">{botMessage}</h4>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {botStatus === "running"
                        ? "Puppeteer đang mở trình duyệt Zalo Web cá nhân của HLV. Vui lòng giữ cửa sổ hoạt động."
                        : botStatus === "success"
                        ? "Tiến trình gửi Zalo đã hoàn thành."
                        : "Vui lòng kiểm tra lại kết nối mạng hoặc thử chức năng Gửi Chat 1-chạm."}
                    </p>
                  </div>
                </div>

                {botLogs && (
                  <button
                    type="button"
                    onClick={() => setShowLogs(!showLogs)}
                    className="rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-bold shadow-xs hover:bg-white border border-current transition-all"
                  >
                    {showLogs ? "Ẩn nhật ký" : "Xem nhật ký chi tiết"}
                  </button>
                )}
              </div>

              {showLogs && botLogs && (
                <div className="mt-3 rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-emerald-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {botLogs}
                </div>
              )}
            </div>
          )}

          {/* Quick Action Bar for Automation */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Công Cụ Tự Động Gửi Thẻ Ảnh Zalo Cá Nhân
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Hệ thống hỗ trợ 2 hình thức: <strong>Tự động bắn bot Zalo</strong> (Puppeteer mở Zalo gửi thẻ ảnh chuẩn) hoặc <strong>Gửi nhanh 1-chạm</strong> (Mở chat Zalo kèm tự động copy thông báo).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  disabled={isBotRunning}
                  onClick={() => handleTriggerBot(undefined, true)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  title="Chạy thử nghiệm để kiểm tra và render sẵn toàn bộ ảnh thẻ học phí"
                >
                  <Play className="h-3.5 w-3.5 text-amber-400" />
                  <span>Chạy Thử (Dry-Run)</span>
                </button>

                <button
                  type="button"
                  disabled={isBotRunning}
                  onClick={() => handleTriggerBot(undefined, false)}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 text-xs font-black text-slate-950 shadow-md shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isBotRunning && activeTargetStudent === "all" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Đang Gửi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Tự Động Bắn Zalo Cả Lớp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Main Grid: Student List (Left) + Card Visual Preview & Actions (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Student List (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Danh sách học viên ({students.length} học sinh)</span>
                </h3>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Tổng học phí: {formatCurrencyVND(totalAmount)}
                </span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {students.map((st) => {
                  const isSelected = previewStudent?.studentId === st.studentId;
                  const isCopied = copiedStudentId === st.studentId;
                  const isStudentBotRunning = isBotRunning && activeTargetStudent === st.studentCode;

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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                              isSelected
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {st.studentCode}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {st.studentName}
                              </h4>
                              <span
                                className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                  st.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {st.status === "PAID" ? "Đã đóng" : "Chờ đóng"}
                              </span>
                            </div>

                            <p className="mt-0.5 text-xs text-slate-500 truncate">
                              PH: <strong className="text-slate-800">{st.parentName || "Chưa có"}</strong> •{" "}
                              <span className="font-mono text-slate-700 font-semibold">{st.parentPhone}</span>
                            </p>

                            <p className="mt-1 text-[11px] text-slate-600">
                              Thực học: <strong>{st.presentCount}</strong> buổi | Số tiền:{" "}
                              <strong className="text-emerald-700 font-black">
                                {formatCurrencyVND(st.totalAmount)}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons for this Student */}
                        <div
                          className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Nút 1: Tự động gửi bot Zalo */}
                          <button
                            type="button"
                            disabled={isBotRunning}
                            onClick={() => handleTriggerBot(st.studentCode, false)}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                            title="Tự động mở Zalo và gửi thẻ ảnh học phí cho phụ huynh này"
                          >
                            {isStudentBotRunning ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            <span>Gửi Zalo</span>
                          </button>

                          {/* Nút 2: Mở Zalo Web & Tự động copy nội dung */}
                          <button
                            type="button"
                            onClick={() => handleOpenZaloAndCopy(st)}
                            className="flex items-center gap-1 rounded-xl bg-[#0068FF] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                            title="Mở chat Zalo phụ huynh & Tự động copy tin nhắn vào clipboard"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Chat Zalo</span>
                          </button>

                          {/* Nút 3: Sao chép lời nhắn */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(st)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            title="Sao chép nội dung tin nhắn học phí"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Nút 4: Xem thẻ */}
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(st)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            title="Xem mẫu thẻ học phí"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Card Mocktest Visual Preview & Big Action Buttons (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-emerald-600" />
                  Mẫu Thẻ Ảnh Sẽ Gửi Cho Phụ Huynh:
                </h3>
              </div>

              {previewStudent ? (
                <div className="space-y-3">
                  {/* Card Visual Preview */}
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
                        <span className="text-slate-500">Ngân hàng:</span>
                        <span className="font-semibold text-slate-900 text-right max-w-[60%]">
                          {previewStudent.bankName} – {previewStudent.bankAccount}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Cú pháp CK:</span>
                        <span className="font-mono font-bold text-orange-600">
                          {previewStudent.transferContent}
                        </span>
                      </div>
                    </div>

                    {/* QR Box */}
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-center border border-slate-200/70">
                      <p className="text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                        <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                        Mã VietQR thanh toán Napas 247
                      </p>
                      <div className="mt-2 mx-auto flex h-32 w-32 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm border border-slate-200">
                        <img
                          src={previewStudent.vietQrUrl}
                          alt="VietQR"
                          className="h-full w-full object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PROMINENT ACTION BUTTONS FOR SELECTED STUDENT */}
                  <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                      Thao tác gửi cho em {previewStudent.studentName}:
                    </span>

                    <button
                      type="button"
                      disabled={isBotRunning}
                      onClick={() => handleTriggerBot(previewStudent.studentCode, false)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-98 transition-all disabled:opacity-60"
                    >
                      {isBotRunning && activeTargetStudent === previewStudent.studentCode ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Đang tự động gửi Zalo...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>🚀 Tự Động Bắn Zalo Cho Phụ Huynh Này</span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenZaloAndCopy(previewStudent)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0068FF] px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm active:scale-98 transition-all"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Mở Chat Zalo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(previewStudent)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-98 transition-all shadow-xs"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Tin Nhắn</span>
                      </button>
                    </div>

                    <a
                      href={`/api/coach/send-zalo-parents?action=download&studentCode=${previewStudent.studentCode}&month=${month}&year=${year}`}
                      download={`${previewStudent.studentCode}_TheHocPhi.png`}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/70 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-98 transition-all"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Tải Ảnh Thẻ Học Phí PNG (Sắc Nét)</span>
                    </a>
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
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50 px-5 sm:px-6 py-3.5 gap-3">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Ảnh thẻ sắc nét được tự động render và gửi thẳng vào cuộc trò chuyện Zalo của từng phụ huynh.
            </span>
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isBotRunning}
              onClick={() => handleTriggerBot(undefined, false)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {isBotRunning && activeTargetStudent === "all" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang gửi {students.length} học viên...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>🚀 Gửi Zalo Cho Tất Cả ({students.length} Học Viên)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-300 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
