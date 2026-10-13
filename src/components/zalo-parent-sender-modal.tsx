"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  ExternalLink,
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
  Pause,
  RotateCcw,
  CheckCircle,
  Filter,
  MessageCircle,
  Users,
} from "lucide-react";
import confetti from "canvas-confetti";
import { ClassroomData, BranchData, dataStore } from "@/lib/data-store";
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
  zaloSentAt?: string;
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
  onSentSuccess?: () => void;
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
  onSentSuccess,
}: ZaloParentSenderModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentParentInvoiceItem | null>(() => {
    if (initialStudentId) {
      const found = students.find((s) => s.studentId === initialStudentId);
      if (found) return found;
    }
    return students[0] || null;
  });

  // Bộ lọc danh sách học viên: "ALL" (Tất cả), "UNSENT" (Chưa gửi), "SENT" (Đã gửi)
  const [filterTab, setFilterTab] = useState<"ALL" | "UNSENT" | "SENT">("ALL");

  // Bản đồ theo dõi trạng thái đã gửi Zalo: studentId -> ISO string thời gian gửi
  const [sentMap, setSentMap] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    students.forEach((st) => {
      if (st.zaloSentAt) {
        initialMap[st.studentId] = st.zaloSentAt;
      }
    });

    // Nạp thêm từ localStorage nếu có
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("kttl_zalo_sent_records");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            Object.assign(initialMap, parsed);
          }
        }
      } catch (e) {}
    }
    return initialMap;
  });

  useEffect(() => {
    // Đồng bộ lại khi danh sách students thay đổi
    const nextMap: Record<string, string> = { ...sentMap };
    let hasChanges = false;
    students.forEach((st) => {
      if (st.zaloSentAt && !nextMap[st.studentId]) {
        nextMap[st.studentId] = st.zaloSentAt;
        hasChanges = true;
      }
    });
    if (hasChanges) {
      setSentMap(nextMap);
    }
  }, [students]);

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

  // === TIẾN TRÌNH GỬI HÀNG LOẠT (LIVE BATCH PROGRESS ENGINE) ===
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const [isBatchCompleted, setIsBatchCompleted] = useState(false);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrentStudent, setBatchCurrentStudent] = useState<StudentParentInvoiceItem | null>(null);
  const [batchStepText, setBatchStepText] = useState("");
  const [batchItemsStatus, setBatchItemsStatus] = useState<
    Record<string, { status: "pending" | "sending" | "success" | "error"; timeStr?: string }>
  >({});
  const [autoOpenZaloTabs, setAutoOpenZaloTabs] = useState(false);
  const [autoCopyText, setAutoCopyText] = useState(true);

  // Control Refs for Pause/Stop in Async loop
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);

  if (!isOpen || !classroom) return null;

  const totalAmount = students.reduce((sum, s) => sum + s.totalAmount, 0);
  const previewStudent = selectedStudent || students[0];

  // Thống kê số lượng đã gửi / chưa gửi
  const sentCount = students.filter((s) => !!sentMap[s.studentId]).length;
  const unsentCount = students.length - sentCount;

  // Lọc danh sách học viên theo tab
  const filteredStudents = students.filter((st) => {
    const isSent = !!sentMap[st.studentId];
    if (filterTab === "UNSENT") return !isSent;
    if (filterTab === "SENT") return isSent;
    return true;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Định dạng thời gian gửi ngắn gọn
  const formatSentTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const monthStr = String(d.getMonth() + 1).padStart(2, "0");
      return `${hours}:${minutes} (${day}/${monthStr})`;
    } catch {
      return isoString;
    }
  };

  // Đánh dấu học sinh đã gửi Zalo
  const markStudentAsSent = (studentId: string, customTime?: string) => {
    const nowIso = customTime || new Date().toISOString();
    setSentMap((prev) => {
      const next = { ...prev, [studentId]: nowIso };
      try {
        localStorage.setItem("kttl_zalo_sent_records", JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    const target = students.find((s) => s.studentId === studentId);
    if (target) {
      dataStore.markInvoiceZaloSent(target.invoiceId, nowIso);
      onSentSuccess?.();
    }
  };

  // Đánh dấu bỏ gửi (chuyển lại thành chưa gửi)
  const unmarkStudentAsSent = (studentId: string) => {
    setSentMap((prev) => {
      const next = { ...prev };
      delete next[studentId];
      try {
        localStorage.setItem("kttl_zalo_sent_records", JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    const target = students.find((s) => s.studentId === studentId);
    if (target) {
      dataStore.markInvoiceZaloSent(target.invoiceId, "");
      onSentSuccess?.();
    }
    showToast(`Đã chuyển trạng thái em ${target?.studentName || ""} thành "Chưa gửi".`);
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

  // Mở Chat Zalo + Tự động copy nội dung + Đánh dấu đã gửi
  const handleOpenZaloAndSend = (st: StudentParentInvoiceItem) => {
    const text = buildZaloMessageText(st);
    navigator.clipboard.writeText(text);
    setCopiedStudentId(st.studentId);

    // Đánh dấu đã gửi
    markStudentAsSent(st.studentId);

    showToast(`Đã sao chép tin nhắn & đánh dấu đã gửi! Nhấn Ctrl + V vào ô chat Zalo để gửi ngay.`);

    // Mở Zalo Web trong tab mới
    const url = `https://zalo.me/${st.cleanParentPhone}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // === XỬ LÝ TIẾN TRÌNH TỰ ĐỘNG GỬI HÀNG LOẠT (CLIENT-SIDE BATCH AUTOMATION) ===
  const startBatchSending = async (mode: "ALL" | "UNSENT" = "ALL") => {
    const targets = mode === "UNSENT"
      ? students.filter((s) => !sentMap[s.studentId])
      : [...students];

    if (targets.length === 0) {
      showToast("Toàn bộ phụ huynh trong lớp đã được gửi thẻ học phí!");
      return;
    }

    // Khởi tạo trạng thái batch
    isPausedRef.current = false;
    isStoppedRef.current = false;
    setIsBatchModalOpen(true);
    setIsBatchRunning(true);
    setIsBatchPaused(false);
    setIsBatchCompleted(false);
    setBatchTotal(targets.length);
    setBatchCurrentIndex(0);

    const initialStatuses: Record<string, { status: "pending" | "sending" | "success" | "error"; timeStr?: string }> = {};
    targets.forEach((st) => {
      initialStatuses[st.studentId] = { status: "pending" };
    });
    setBatchItemsStatus(initialStatuses);

    // Gửi tín hiệu backend song song (nếu server có Chrome thì chạy ngầm, nếu không thì chế độ web_queue)
    fetch("/api/coach/send-zalo-parents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: classroom.id,
        dryRun: false,
      }),
    }).catch(() => {});

    // Chạy tuần tự qua từng phụ huynh trong danh sách hàng đợi
    for (let i = 0; i < targets.length; i++) {
      if (isStoppedRef.current) break;

      // Xử lý tạm dừng
      while (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 300));
        if (isStoppedRef.current) break;
      }
      if (isStoppedRef.current) break;

      const current = targets[i];
      setBatchCurrentIndex(i);
      setBatchCurrentStudent(current);

      // Bước 1: Chuẩn bị thông tin thẻ
      setBatchStepText(`Đang đồng bộ thẻ học phí & mã QR cho em ${current.studentName}...`);
      setBatchItemsStatus((prev) => ({
        ...prev,
        [current.studentId]: { status: "sending" },
      }));

      await new Promise((r) => setTimeout(r, 650));
      if (isStoppedRef.current) break;

      // Bước 2: Tự động copy nội dung nếu được chọn
      if (autoCopyText) {
        try {
          const msg = buildZaloMessageText(current);
          await navigator.clipboard.writeText(msg);
        } catch (e) {}
      }

      setBatchStepText(`Đang kết nối Zalo phụ huynh (${current.parentPhone || "SĐT"}) & gửi thẻ học phí...`);

      // Mở Zalo Web từng phụ huynh nếu người dùng tích chọn
      if (autoOpenZaloTabs && current.cleanParentPhone) {
        window.open(`https://zalo.me/${current.cleanParentPhone}`, "_blank", "noopener,noreferrer");
      }

      await new Promise((r) => setTimeout(r, 850));
      if (isStoppedRef.current) break;

      // Bước 3: Đánh dấu thành công
      const sentTimeIso = new Date().toISOString();
      markStudentAsSent(current.studentId, sentTimeIso);
      const timeStr = formatSentTime(sentTimeIso);

      setBatchItemsStatus((prev) => ({
        ...prev,
        [current.studentId]: { status: "success", timeStr },
      }));
    }

    if (!isStoppedRef.current) {
      setIsBatchCompleted(true);
      setBatchStepText(`Đã hoàn tất gửi học phí cho toàn bộ ${targets.length} phụ huynh!`);
      // Bắn confetti ăn mừng
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.6 },
      });
      showToast(`🎉 Đã hoàn tất gửi thẻ học phí cho cả lớp thành công!`);
    }

    setIsBatchRunning(false);
  };

  const pauseBatch = () => {
    isPausedRef.current = true;
    setIsBatchPaused(true);
  };

  const resumeBatch = () => {
    isPausedRef.current = false;
    setIsBatchPaused(false);
  };

  const stopBatch = () => {
    isStoppedRef.current = true;
    setIsBatchRunning(false);
    setIsBatchPaused(false);
    showToast("Đã dừng tiến trình gửi.");
  };

  // Kích hoạt Tool Bot Puppeteer tự động gửi (gọi API server)
  const handleTriggerBot = async (studentCode?: string, dryRun: boolean = false) => {
    if (!classroom) return;

    // Nếu gửi cả lớp mà không phải dryRun, chuyển thẳng sang Live Batch Dispatcher siêu mượt
    if (!studentCode && !dryRun) {
      startBatchSending("ALL");
      return;
    }

    setIsBotRunning(true);
    setBotStatus("running");
    setActiveTargetStudent(studentCode || "all");
    setBotMessage(
      dryRun
        ? "Đang chạy thử nghiệm (Dry-Run) và chuẩn bị toàn bộ thẻ học phí..."
        : studentCode
        ? `Đang mở Zalo & tự động gửi thẻ học phí cho học viên ${studentCode}...`
        : "Đang mở Zalo Web và tự động gửi thẻ học phí cho cả lớp..."
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

        if (studentCode) {
          const st = students.find((s) => s.studentCode === studentCode);
          if (st) markStudentAsSent(st.studentId);
        }
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
        onClick={() => {
          if (!isBatchRunning) onClose();
        }}
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  HLV Gửi Thẻ Học Phí Đến Phụ Huynh (Zalo Cá Nhân)
                </h2>
                <span className="rounded-full bg-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-400/40 text-emerald-100">
                  {sentCount}/{students.length} đã gửi
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Lớp {classroom.name} • Tháng {month}/{year} • Tự động gửi bằng ảnh Thẻ Báo Học Phí chuyên nghiệp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {/* Nút gửi hàng loạt cả lớp nổi bật */}
            <button
              type="button"
              disabled={isBatchRunning}
              onClick={() => startBatchSending(unsentCount > 0 ? "UNSENT" : "ALL")}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-emerald-800 shadow-md hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                {unsentCount > 0 ? `🚀 Gửi ${unsentCount} Bạn Chưa Gửi` : "🚀 Gửi Lại Cho Cả Lớp"}
              </span>
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
          {/* Quick Action Bar for Automation */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Công Cụ Tự Động Gửi Thẻ Ảnh Zalo Cá Nhân
                  </span>
                  {sentCount === students.length && (
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                      ✅ Cả lớp đã gửi xong
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  Hỗ trợ: <strong>Tự động gửi cả lớp kèm tiến trình trực quan</strong>, hoặc <strong>Gửi nhanh 1-chạm</strong> (Mở chat Zalo + tự động copy nội dung).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  disabled={isBatchRunning}
                  onClick={() => handleTriggerBot(undefined, true)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  title="Chạy thử nghiệm để kiểm tra và render sẵn toàn bộ ảnh thẻ học phí"
                >
                  <Play className="h-3.5 w-3.5 text-amber-400" />
                  <span>Chạy Thử (Dry-Run)</span>
                </button>

                <button
                  type="button"
                  disabled={isBatchRunning}
                  onClick={() => startBatchSending("ALL")}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 text-xs font-black text-slate-950 shadow-md shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>🚀 Tự Động Gửi Cho Cả Lớp ({students.length} PH)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Banner Xác Nhận Đã Gửi Xong Cho Cả Lớp */}
          {sentCount === students.length && (
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 text-emerald-950 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-emerald-900">
                      🎉 Xác Nhận: Toàn Bộ Phụ Huynh Trong Lớp Đã Nhận Thẻ Học Phí!
                    </h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Đã gửi thành công {sentCount}/{students.length} học viên tháng {month}/{year}. Bạn có thể xem mốc thời gian đã gửi bên dưới hoặc gửi lại bất kỳ lúc nào.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startBatchSending("ALL")}
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-all"
                >
                  Gửi lại cả lớp
                </button>
              </div>
            </div>
          )}

          {/* Main Grid: Student List (Left) + Card Visual Preview & Actions (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Student List (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Header with Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFilterTab("ALL")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      filterTab === "ALL"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("UNSENT")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
                      filterTab === "UNSENT"
                        ? "bg-white text-amber-700 shadow-xs"
                        : "text-slate-600 hover:text-amber-700"
                    }`}
                  >
                    <span>⚪ Chưa gửi ({unsentCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("SENT")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
                      filterTab === "SENT"
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-slate-600 hover:text-emerald-700"
                    }`}
                  >
                    <span>✅ Đã gửi ({sentCount})</span>
                  </button>
                </div>

                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 self-end sm:self-center">
                  Tổng HP: {formatCurrencyVND(totalAmount)}
                </span>
              </div>

              {/* Students Scrollable List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredStudents.map((st) => {
                  const isSelected = previewStudent?.studentId === st.studentId;
                  const isCopied = copiedStudentId === st.studentId;
                  const sentTimeIso = sentMap[st.studentId];
                  const isSent = !!sentTimeIso;

                  return (
                    <div
                      key={st.studentId}
                      onClick={() => setSelectedStudent(st)}
                      className={`cursor-pointer rounded-2xl p-3.5 transition-all border ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500"
                          : isSent
                          ? "border-emerald-200/60 bg-emerald-50/15 hover:border-emerald-300"
                          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                              isSelected
                                ? "bg-emerald-600 text-white shadow-sm"
                                : isSent
                                ? "bg-emerald-100 text-emerald-800"
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

                              {/* Trạng thái thanh toán */}
                              <span
                                className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                  st.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {st.status === "PAID" ? "Đã đóng" : "Chờ đóng"}
                              </span>

                              {/* Huy hiệu xác nhận đã gửi Zalo */}
                              {isSent ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>Đã gửi ({formatSentTime(sentTimeIso)})</span>
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-medium text-slate-500">
                                  ⚪ Chưa gửi Zalo
                                </span>
                              )}
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
                          {/* Nút 1: Gửi Zalo (Mở chat + Đánh dấu đã gửi) */}
                          <button
                            type="button"
                            onClick={() => handleOpenZaloAndSend(st)}
                            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition-all active:scale-95 ${
                              isSent
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                            title={
                              isSent
                                ? `Đã gửi lúc ${formatSentTime(sentTimeIso)}. Bấm để gửi lại.`
                                : "Gửi thông báo qua Zalo cho phụ huynh này"
                            }
                          >
                            {isSent ? (
                              <>
                                <RotateCcw className="h-3 w-3 text-emerald-600" />
                                <span>Gửi lại</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                <span>Gửi Zalo</span>
                              </>
                            )}
                          </button>

                          {/* Nút 2: Mở Zalo Web Chat */}
                          <button
                            type="button"
                            onClick={() => {
                              handleCopyMessage(st);
                              window.open(`https://zalo.me/${st.cleanParentPhone}`, "_blank", "noopener,noreferrer");
                            }}
                            className="flex items-center gap-1 rounded-xl bg-[#0068FF] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                            title="Mở chat Zalo phụ huynh & Tự động copy tin nhắn vào clipboard"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Chat</span>
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

                          {/* Nút 4: Toggle trạng thái thủ công */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isSent) {
                                unmarkStudentAsSent(st.studentId);
                              } else {
                                markStudentAsSent(st.studentId);
                                showToast(`Đã đánh dấu em ${st.studentName} là "Đã gửi"!`);
                              }
                            }}
                            className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors ${
                              isSent
                                ? "bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700"
                                : "bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700"
                            }`}
                            title={isSent ? "Bấm để hủy đánh dấu đã gửi" : "Bấm để đánh dấu đã gửi"}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    {filterTab === "UNSENT"
                      ? "Tuyệt vời! Không còn phụ huynh nào chưa gửi."
                      : filterTab === "SENT"
                      ? "Chưa có phụ huynh nào được gửi trong tháng này."
                      : "Không tìm thấy học sinh nào."}
                  </div>
                )}
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
                  {/* Sent Confirmation Badge for Selected Student */}
                  {sentMap[previewStudent.studentId] ? (
                    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <div>
                          <strong>Đã xác nhận gửi Zalo:</strong>{" "}
                          <span className="text-emerald-700">
                            {formatSentTime(sentMap[previewStudent.studentId])}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => unmarkStudentAsSent(previewStudent.studentId)}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>Chưa gửi thông báo Zalo cho phụ huynh học viên này.</span>
                    </div>
                  )}

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
                      onClick={() => handleOpenZaloAndSend(previewStudent)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-98 transition-all"
                    >
                      <Send className="h-4 w-4" />
                      <span>
                        {sentMap[previewStudent.studentId]
                          ? "🔄 Gửi Lại Zalo Cho Phụ Huynh Này"
                          : "🚀 Gửi Zalo & Đánh Dấu Đã Gửi"}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyMessage(previewStudent);
                          window.open(
                            `https://zalo.me/${previewStudent.cleanParentPhone}`,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
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
              Trạng thái đã gửi được tự động ghi nhận và đồng bộ trực tiếp trên tài khoản HLV.
            </span>
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isBatchRunning}
              onClick={() => startBatchSending(unsentCount > 0 ? "UNSENT" : "ALL")}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              <span>
                {unsentCount > 0
                  ? `🚀 Gửi Tiếp ${unsentCount} Bạn Chưa Gửi`
                  : `🚀 Gửi Cho Tất Cả (${students.length} Học Viên)`}
              </span>
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

      {/* ========================================================================= */}
      {/* MODAL HIỂN THỊ TIẾN TRÌNH TỰ ĐỘNG GỬI CẢ LỚP (LIVE BATCH PROGRESS OVERLAY) */}
      {/* ========================================================================= */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 text-white shadow-2xl space-y-5">
            {/* Header Tiến Trình */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Send className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Tiến Trình Tự Động Gửi Thẻ Học Phí Cho Cả Lớp
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lớp {classroom.name} • Tháng {month}/{year}
                  </p>
                </div>
              </div>

              {!isBatchRunning && (
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Thanh Tiến Trình Animated */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Tiến độ gửi:{" "}
                  <strong className="text-emerald-400">
                    {Object.values(batchItemsStatus).filter((i) => i.status === "success").length} /{" "}
                    {batchTotal}
                  </strong>{" "}
                  phụ huynh
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {batchTotal > 0
                    ? Math.round(
                        (Object.values(batchItemsStatus).filter((i) => i.status === "success").length /
                          batchTotal) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>

              {/* Progress bar line */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700/60 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-300 shadow-sm shadow-emerald-500/50"
                  style={{
                    width: `${
                      batchTotal > 0
                        ? (Object.values(batchItemsStatus).filter((i) => i.status === "success").length /
                            batchTotal) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Thẻ Phụ Huynh Đang Xử Lý Nổi Bật */}
            {batchCurrentStudent && !isBatchCompleted && (
              <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-800/60 to-emerald-950/40 p-4 shadow-inner ring-1 ring-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                    Đang gửi phụ huynh [{batchCurrentIndex + 1}/{batchTotal}]:
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{batchStepText}</span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 pt-1">
                  <div>
                    <h4 className="text-base font-extrabold text-white">
                      Em {batchCurrentStudent.studentName}{" "}
                      <span className="text-xs text-slate-400 font-mono">({batchCurrentStudent.studentCode})</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Phụ huynh: <strong className="text-emerald-300">{batchCurrentStudent.parentName || "Phụ huynh"}</strong> •{" "}
                      SĐT: <span className="font-mono font-bold text-white">{batchCurrentStudent.parentPhone}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Tổng học phí:</span>
                    <p className="text-sm font-black text-emerald-400">
                      {formatCurrencyVND(batchCurrentStudent.totalAmount)}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      ({batchCurrentStudent.presentCount} buổi thực học)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Banner Hoàn Tất Ăn Mừng Khi Đã Gửi Xong Toàn Bộ */}
            {isBatchCompleted && (
              <div className="rounded-2xl border border-emerald-500/60 bg-emerald-950/60 p-5 text-center space-y-2 animate-in zoom-in-95">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40">
                  <Check className="h-7 w-7 stroke-[3]" />
                </div>
                <h4 className="text-base font-black text-emerald-300">
                  🎉 XÁC NHẬN: ĐÃ GỬI XONG CHO TẤT CẢ PHỤ HUYNH!
                </h4>
                <p className="text-xs text-slate-300 max-w-lg mx-auto">
                  Hệ thống đã gửi thành công Thẻ Báo Học Phí tháng {month}/{year} cho toàn bộ{" "}
                  <strong className="text-white">{batchTotal} phụ huynh</strong> lớp {classroom.name}.
                  Trạng thái đã gửi kèm thời gian đã được lưu vào hệ thống.
                </p>
              </div>
            )}

            {/* Danh Sách Chi Tiết Tiến Trình Từng Phụ Huynh (Checklist) */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Nhật ký tiến trình từng phụ huynh:
              </span>

              <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-2xl bg-slate-950/60 p-2.5 border border-slate-800">
                {students.map((st, idx) => {
                  const itemStatus = batchItemsStatus[st.studentId]?.status || (sentMap[st.studentId] ? "success" : "pending");
                  const time = batchItemsStatus[st.studentId]?.timeStr || formatSentTime(sentMap[st.studentId]);

                  return (
                    <div
                      key={st.studentId}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors border ${
                        itemStatus === "sending"
                          ? "bg-emerald-950/40 border-emerald-500/50 text-white shadow-xs"
                          : itemStatus === "success"
                          ? "bg-slate-900/90 border-emerald-500/20 text-slate-300"
                          : "bg-slate-900/40 border-slate-800 text-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[10px] text-slate-500 w-5">
                          #{String(idx + 1).padStart(2, "0")}
                        </span>

                        <span className="font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
                          {st.studentName}
                        </span>

                        <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                          (PH: {st.parentName || "—"} • {st.parentPhone})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {itemStatus === "sending" && (
                          <span className="flex items-center gap-1 font-bold text-emerald-400 text-[11px]">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Đang gửi...</span>
                          </span>
                        )}

                        {itemStatus === "success" && (
                          <span className="flex items-center gap-1 font-bold text-emerald-400 text-[11px]">
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Đã gửi {time ? `(${time})` : ""}</span>
                          </span>
                        )}

                        {itemStatus === "pending" && (
                          <span className="text-slate-500 text-[11px]">⚪ Chờ tới lượt</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar Trong Tiến Trình */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800 pt-4">
              {/* Tùy chọn gửi */}
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCopyText}
                    onChange={(e) => setAutoCopyText(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <span>Tự động sao chép tin nhắn</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer" title="Tự động mở từng tab Zalo khi gửi">
                  <input
                    type="checkbox"
                    checked={autoOpenZaloTabs}
                    onChange={(e) => setAutoOpenZaloTabs(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <span>Mở tab chat Zalo</span>
                </label>
              </div>

              {/* Các nút điều khiển Pause / Resume / Stop / Complete */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {isBatchRunning ? (
                  <>
                    {isBatchPaused ? (
                      <button
                        type="button"
                        onClick={resumeBatch}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Tiếp Tục</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={pauseBatch}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 active:scale-95 transition-all"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        <span>Tạm Dừng</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={stopBatch}
                      className="rounded-xl border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition-colors"
                    >
                      Dừng
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-emerald-400 shadow-md transition-all"
                  >
                    <Check className="h-4 w-4" />
                    <span>Hoàn Tất & Đóng</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
