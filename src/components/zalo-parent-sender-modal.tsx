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
  RotateCcw,
  CheckCircle,
  Filter,
  MessageCircle,
  Users,
  ArrowRight,
  Info,
  HelpCircle,
  Bot,
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

  // === HỘP THOẠI HƯỚNG DẪN GỬI 1-CHẠM (GUIDED SEND DIALOG) ===
  const [guidedStudent, setGuidedStudent] = useState<StudentParentInvoiceItem | null>(null);
  const [isCopiedInGuide, setIsCopiedInGuide] = useState(false);

  // === TRÌNH GỬI LẦN LƯỢT CHO CẢ LỚP (BATCH QUEUE RUNNER) ===
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queueTargets, setQueueTargets] = useState<StudentParentInvoiceItem[]>([]);
  const [queueCurrentIndex, setQueueCurrentIndex] = useState(0);
  const [queueCompleted, setQueueCompleted] = useState(false);

  // === BOT AUTOMATION PUPPETEER STATE ===
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botLogs, setBotLogs] = useState("");
  const [showBotLogs, setShowBotLogs] = useState(false);
  const [botStatusMessage, setBotStatusMessage] = useState("");

  // === TOOL ZALO BULK SENDER (EXE) MODAL STATE ===
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);

  // Xuất file JSON dữ liệu học phí cả lớp để Tool EXE tự động nhận diện
  const exportInvoicesJsonForTool = () => {
    if (!classroom) return;
    const cleanClassName = classroom.name.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");
    const fileName = `KTTL_TheHocPhi_Lop_${cleanClassName}_Thang_${month}_${year}.json`;

    const exportData = {
      createdAt: new Date().toISOString(),
      className: classroom.name,
      classId: classroom.id,
      branchName: branch?.name || "",
      month,
      year,
      totalStudents: students.length,
      students: students.map((st) => ({
        studentId: st.studentId,
        studentCode: st.studentCode,
        studentName: st.studentName,
        parentName: st.parentName,
        parentPhone: st.parentPhone,
        cleanParentPhone: st.cleanParentPhone,
        className: st.className,
        branchName: st.branchName,
        month: st.month,
        year: st.year,
        presentCount: st.presentCount,
        presentDates: st.presentDates,
        feePerSession: st.feePerSession,
        totalAmount: st.totalAmount,
        transferContent: st.transferContent,
        vietQrUrl: st.vietQrUrl,
        bankName: st.bankName,
        bankAccount: st.bankAccount,
        accountHolder: st.accountHolder,
      })),
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Đã tải file "${fileName}" về thư mục Downloads!`);

    // Thử kích hoạt mở tool qua giao thức kttl-zalo://run
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "kttl-zalo://run";
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2500);
    } catch (e) {}
  };

  // Tải file khởi động nhanh Mo_Tool_Zalo.bat về máy tính
  const downloadQuickLauncher = () => {
    const batContent = `@echo off\r
chcp 65001 > nul\r
title KTTL - MO TOOL ZALO BULK SENDER\r
echo ===================================================================\r
echo   CLB CO VUA KIEN TUONG TUONG LAI (KTTLL)\r
echo   DANG KHOI DONG PHAN MEM ZALO BULK SENDER...\r
echo ===================================================================\r
\r
set "EXE_PATH=d:\\Dự án\\QuanlyKTTL\\tools\\zalo-sender\\dist\\Zalo_Bulk_Sender\\Zalo_Bulk_Sender.exe"\r
if exist "%EXE_PATH%" (\r
    start "" "%EXE_PATH%"\r
    exit /b 0\r
)\r
\r
set "BAT_PATH=d:\\Dự án\\QuanlyKTTL\\Chay_Tool_Zalo_EXE.bat"\r
if exist "%BAT_PATH%" (\r
    call "%BAT_PATH%"\r
    exit /b 0\r
)\r
\r
set "PY_PATH=d:\\Dự án\\QuanlyKTTL\\tools\\zalo-sender\\.venv\\Scripts\\python.exe"\r
set "SCRIPT_PATH=d:\\Dự án\\QuanlyKTTL\\tools\\zalo-sender\\zalo_sender.py"\r
if exist "%PY_PATH%" (\r
    start "" "%PY_PATH%" "%SCRIPT_PATH%"\r
    exit /b 0\r
)\r
\r
echo Khong tim thay tool tai d:\\Dự án\\QuanlyKTTL\\\r
echo Vui long kiem tra thu muc du an hoac chay truc tiep Chay_Tool_Zalo_EXE.bat.\r
pause\r
`;
    const blob = new Blob([batContent], { type: "application/x-bat" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mo_Tool_Zalo.bat";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Đã tải file Mo_Tool_Zalo.bat về Downloads! Bấm mở file đó để bật tool.");
  };

  // Mở Tool EXE trực tiếp từ máy chủ Local hoặc tải file bat khởi động nhanh
  const handleDirectLaunchTool = async () => {
    try {
      const res = await fetch("/api/coach/send-zalo-parents?action=open_tool");
      const data = await res.json();
      if (data.success) {
        showToast("🚀 Đang khởi động Tool Zalo Bulk Sender trên máy tính!");
        return true;
      }
    } catch (e) {}

    // Fallback: Thử mở qua custom protocol kttl-zalo://run
    try {
      window.location.href = "kttl-zalo://run";
    } catch (e) {}

    // Nếu chạy trên Vercel/Cloud không thể can thiệp desktop, tự động tải file Mo_Tool_Zalo.bat
    setTimeout(() => {
      downloadQuickLauncher();
    }, 400);

    return false;
  };

  // Mở thư mục chứa tool trên máy tính trong File Explorer
  const handleOpenToolFolder = async () => {
    try {
      const res = await fetch("/api/coach/send-zalo-parents?action=open_folder");
      const data = await res.json();
      if (data.success) {
        showToast("📂 Đã mở thư mục chứa Tool Zalo trên máy tính!");
        return;
      }
    } catch (e) {}

    // Nếu chạy trên cloud, copy đường dẫn thư mục vào clipboard
    navigator.clipboard.writeText("d:\\Dự án\\QuanlyKTTL\\tools\\zalo-sender\\dist\\Zalo_Bulk_Sender");
    showToast("Đã sao chép đường dẫn thư mục Tool vào Clipboard! Nhấn Win+R và dán vào.");
  };

  // Click nút Gửi Bằng Tool EXE:
  // 1. Tự động tải luôn file JSON về Downloads
  // 2. Kích hoạt mở Tool trên máy
  // 3. Mở popup hướng dẫn
  const handleOpenToolSender = async () => {
    exportInvoicesJsonForTool();
    handleDirectLaunchTool();
    setIsToolModalOpen(true);
  };

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

  // Đánh dấu học sinh đã gửi Zalo thành công
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

  // Đánh dấu hủy gửi (chuyển lại thành chưa gửi)
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

  // Tạo nội dung tin nhắn gửi Zalo chuẩn
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
    showToast(`Đã sao chép tin nhắn học phí em ${st.studentName}!`);
    setTimeout(() => setCopiedStudentId(null), 2500);
  };

  // Mở hộp thoại hướng dẫn gửi Zalo 1-chạm & Tự động copy text + Mở Zalo
  const handleStartGuidedSend = (st: StudentParentInvoiceItem) => {
    const text = buildZaloMessageText(st);
    navigator.clipboard.writeText(text);
    setIsCopiedInGuide(true);
    setGuidedStudent(st);

    // Mở Zalo Web trong tab mới
    if (st.cleanParentPhone) {
      const url = `https://zalo.me/${st.cleanParentPhone}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Xác nhận đã gửi xong từ Hộp thoại Hướng dẫn 1-chạm
  const handleConfirmSentFromGuide = () => {
    if (!guidedStudent) return;
    markStudentAsSent(guidedStudent.studentId);
    showToast(`✅ Đã xác nhận gửi thẻ học phí cho em ${guidedStudent.studentName}!`);
    setGuidedStudent(null);
  };

  // === XỬ LÝ TRÌNH GỬI LẦN LƯỢT CHO CẢ LỚP (GUIDED QUEUE RUNNER) ===
  const startClassGuidedQueue = (mode: "ALL" | "UNSENT" = "UNSENT") => {
    const targets = mode === "UNSENT"
      ? students.filter((s) => !sentMap[s.studentId])
      : [...students];

    if (targets.length === 0) {
      showToast("Toàn bộ phụ huynh trong lớp đã được gửi thẻ học phí!");
      return;
    }

    setQueueTargets(targets);
    setQueueCurrentIndex(0);
    setQueueCompleted(false);
    setIsQueueOpen(true);
  };

  const handleQueueOpenCurrentStudentZalo = () => {
    const current = queueTargets[queueCurrentIndex];
    if (!current) return;

    const text = buildZaloMessageText(current);
    navigator.clipboard.writeText(text);
    showToast(`Đã tự động sao chép tin nhắn của em ${current.studentName}! Nhấn Ctrl + V vào Zalo.`);

    if (current.cleanParentPhone) {
      window.open(`https://zalo.me/${current.cleanParentPhone}`, "_blank", "noopener,noreferrer");
    }
  };

  const handleQueueConfirmAndNext = () => {
    const current = queueTargets[queueCurrentIndex];
    if (current) {
      markStudentAsSent(current.studentId);
    }

    if (queueCurrentIndex + 1 < queueTargets.length) {
      setQueueCurrentIndex(queueCurrentIndex + 1);
    } else {
      setQueueCompleted(true);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      showToast("🎉 Đã gửi xong cho toàn bộ phụ huynh trong đợt này!");
    }
  };

  const handleQueueSkipCurrent = () => {
    if (queueCurrentIndex + 1 < queueTargets.length) {
      setQueueCurrentIndex(queueCurrentIndex + 1);
    } else {
      setQueueCompleted(true);
    }
  };

  // === KÍCH HOẠT BOT PUPPETEER TỰ ĐỘNG GỬI (NẾU CHẠY TRÊN MÁY TÍNH HLV) ===
  const handleTriggerPuppeteerBot = async (dryRun: boolean = false) => {
    setIsBotRunning(true);
    setShowBotLogs(true);
    setBotStatusMessage("Đang chuẩn bị dữ liệu và khởi động Bot Zalo Puppeteer...");
    setBotLogs("⏳ Đang kết nối máy chủ để chạy tool tự động gửi Zalo...\n");

    try {
      const res = await fetch("/api/coach/send-zalo-parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: classroom.id,
          dryRun,
          customStudents: students, // Gửi danh sách học sinh hiện tại (kể cả vừa thêm mới)
        }),
      });

      const data = await res.json();

      if (data.mode === "puppeteer" && data.success) {
        setBotStatusMessage("✅ Bot đã gửi thành công toàn bộ thẻ học phí!");
        setBotLogs((prev) => prev + "\n" + (data.output || "Hoàn thành gửi học phí."));
        // Đánh dấu tất cả học sinh là đã gửi
        students.forEach((st) => markStudentAsSent(st.studentId));
        confetti({ particleCount: 80, spread: 60 });
        showToast("Bot đã hoàn thành gửi tin nhắn và thẻ học phí cho cả lớp!");
      } else {
        setBotStatusMessage("Chế độ gửi trực tiếp trên trình duyệt:");
        setBotLogs(
          `ℹ️ Máy chủ đang chạy trên môi trường đám mây (Cloud/Vercel).\n` +
          `Do chính sách bảo mật của Zalo, trình duyệt đám mây không thể tự can thiệp ngầm vào Zalo cá nhân của bạn.\n\n` +
          `👉 BẠN CÓ 2 CÁCH GỬI RẤT ĐƠN GIẢN:\n` +
          `1. Sử dụng tính năng "Gửi Lần Lượt Cho Cả Lớp": Hệ thống tự copy tin nhắn + mở Zalo, bạn chỉ cần bấm Ctrl+V rồi Enter, 30 giây là gửi xong cả lớp!\n` +
          `2. Chạy file Chay_Bot_Zalo.bat ngay trên máy tính của bạn để Chrome tự động gõ và gửi 100% không cần chạm tay!`
        );
      }
    } catch (err: any) {
      setBotStatusMessage("Không thể kích hoạt bot ngầm.");
      setBotLogs(`Lỗi kết nối: ${err.message || String(err)}`);
    } finally {
      setIsBotRunning(false);
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
              onClick={() => startClassGuidedQueue(unsentCount > 0 ? "UNSENT" : "ALL")}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-emerald-800 shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
            >
              <Send className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                {unsentCount > 0 ? `🚀 Gửi Lần Lượt (${unsentCount} PH Chưa Gửi)` : "🚀 Gửi Lại Cả Lớp"}
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
                    Hệ Thống Gửi Thẻ Học Phí Qua Zalo
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Hỗ trợ 2 hình thức: <strong>Gửi 1-chạm lần lượt cả lớp</strong> (Tự copy tin nhắn + mở Zalo chuẩn 100%) hoặc <strong>Bot tự động Puppeteer</strong> (mở Chrome tự gõ tự gửi).
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* NÚT TẢI FILE JSON TRỰC TIẾP */}
                <button
                  type="button"
                  onClick={exportInvoicesJsonForTool}
                  className="rounded-xl border border-emerald-400/50 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-black text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  title="Tải file dữ liệu học phí JSON của cả lớp để nạp vào Tool Zalo"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>📥 Tải File JSON ({students.length} PH)</span>
                </button>

                {/* NÚT MỞ TOOL VÀ TỰ ĐỘNG GỬI */}
                <button
                  type="button"
                  onClick={handleOpenToolSender}
                  className="rounded-xl border border-indigo-400/40 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 px-3.5 py-2 text-xs font-black text-white shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-1.5"
                  title="Tự động tải file và khởi động phần mềm Zalo Bulk Sender gửi ảnh thẻ học phí"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                  <span>⚡ Gửi Bằng Tool EXE (Thẻ Ảnh)</span>
                </button>

                <button
                  type="button"
                  disabled={isBotRunning}
                  onClick={() => handleTriggerPuppeteerBot(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1.5"
                  title="Chạy Bot Puppeteer tự động gửi trên máy tính"
                >
                  <Bot className="h-3.5 w-3.5 text-amber-400" />
                  <span>Bot Puppeteer</span>
                </button>

                <button
                  type="button"
                  onClick={() => startClassGuidedQueue("ALL")}
                  className="rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 px-3.5 py-2 text-xs font-bold text-slate-200 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Gửi Thủ Công (1-Chạm)</span>
                </button>
              </div>
            </div>

            {/* Logs Bot Panel if visible */}
            {showBotLogs && (
              <div className="mt-3 rounded-xl bg-slate-950 p-3 text-xs border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    {isBotRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{botStatusMessage}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBotLogs(false)}
                    className="text-slate-500 hover:text-slate-300 text-[11px]"
                  >
                    Đóng nhật ký
                  </button>
                </div>
                <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {botLogs}
                </pre>
              </div>
            )}
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
                  onClick={() => startClassGuidedQueue("ALL")}
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
                          {/* Nút 1: Gửi Zalo 1-Chạm (Tự copy tin nhắn + Mở Zalo + Hiện hướng dẫn) */}
                          <button
                            type="button"
                            onClick={() => handleStartGuidedSend(st)}
                            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold shadow-sm transition-all active:scale-95 ${
                              isSent
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                            title={
                              isSent
                                ? `Đã gửi lúc ${formatSentTime(sentTimeIso)}. Bấm để mở lại và gửi lại.`
                                : "Mở chat Zalo & Tự động copy nội dung học phí"
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

                          {/* Nút 2: Mở chat trực tiếp */}
                          <button
                            type="button"
                            onClick={() => handleStartGuidedSend(st)}
                            className="flex items-center gap-1 rounded-xl bg-[#0068FF] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                            title="Mở chat Zalo phụ huynh"
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
                      onClick={() => handleStartGuidedSend(previewStudent)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-98 transition-all"
                    >
                      <Send className="h-4 w-4" />
                      <span>
                        {sentMap[previewStudent.studentId]
                          ? "🔄 Gửi Lại Cho Phụ Huynh Này"
                          : "🚀 Mở Zalo & Gửi Cho Phụ Huynh Này"}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartGuidedSend(previewStudent)}
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
              Mỗi tin nhắn gửi đều được hệ thống tự động chuẩn bị sẵn thông tin thanh toán VietQR Napas 24/7.
            </span>
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => startClassGuidedQueue(unsentCount > 0 ? "UNSENT" : "ALL")}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Send className="h-4 w-4" />
              <span>
                {unsentCount > 0
                  ? `🚀 Gửi Lần Lượt ${unsentCount} PH Chưa Gửi`
                  : `🚀 Gửi Lần Lượt Cho Cả Lớp (${students.length} PH)`}
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
      {/* 1. HỘP THOẠI HƯỚNG DẪN GỬI ZALO 1-CHẠM (GUIDED SEND DIALOG) */}
      {/* ========================================================================= */}
      {guidedStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Gửi Học Phí Đến Zalo Phụ Huynh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Em {guidedStudent.studentName} ({guidedStudent.studentCode}) • PH: {guidedStudent.parentName || "Phụ huynh"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuidedStudent(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thông báo đã copy vào clipboard */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  Đã tự động sao chép toàn bộ thông báo học phí vào Clipboard!
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Số điện thoại phụ huynh: <strong className="font-mono">{guidedStudent.parentPhone}</strong> • Học phí: <strong>{formatCurrencyVND(guidedStudent.totalAmount)}</strong>
                </p>
              </div>
            </div>

            {/* Hướng dẫn 2 bước cực kỳ dễ hiểu */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
              <span className="text-xs font-black uppercase text-slate-600 tracking-wider block">
                👉 2 Bước Hoàn Tất Gửi Trên Zalo:
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    1
                  </span>
                  <p className="text-slate-700">
                    Trên tab Zalo vừa mở: Bấm vào nút màu xanh <strong>[Nhắn tin]</strong> (hoặc mở Zalo trên máy).
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                    2
                  </span>
                  <p className="text-slate-700">
                    Nhấn phím <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold border border-slate-300 shadow-xs">Ctrl + V</kbd> (Dán) vào ô nhập tin nhắn và bấm <strong>Enter (Gửi)</strong>!
                  </p>
                </div>
              </div>
            </div>

            {/* Tiện ích đính kèm */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(buildZaloMessageText(guidedStudent));
                  setIsCopiedInGuide(true);
                  showToast("Đã sao chép lại văn bản!");
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>{isCopiedInGuide ? "Đã chép lại text ✅" : "Sao chép lại text"}</span>
              </button>

              <a
                href={`/api/coach/send-zalo-parents?action=download&studentCode=${guidedStudent.studentCode}&month=${month}&year=${year}`}
                download={`${guidedStudent.studentCode}_TheHocPhi.png`}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tải ảnh thẻ PNG</span>
              </a>
            </div>

            {/* Nút hành động chính */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <button
                type="button"
                onClick={handleConfirmSentFromGuide}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/25 active:scale-98 transition-all"
              >
                <Check className="h-4 w-4" />
                <span>✅ Tôi Đã Gửi Xong Trên Zalo (Xác Nhận Đã Gửi)</span>
              </button>

              <div className="flex justify-between items-center text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (guidedStudent.cleanParentPhone) {
                      window.open(`https://zalo.me/${guidedStudent.cleanParentPhone}`, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Mở lại tab Zalo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGuidedStudent(null)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Đóng lại (Chưa gửi)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TRÌNH GỬI LẦN LƯỢT CHO CẢ LỚP (GUIDED QUEUE RUNNER MODAL) */}
      {/* ========================================================================= */}
      {isQueueOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 text-white shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Send className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Trình Gửi Thẻ Học Phí Lần Lượt Cho Cả Lớp
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lớp {classroom.name} • Tháng {month}/{year}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQueueOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress line */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">
                  Tiến độ:{" "}
                  <strong className="text-emerald-400">
                    {queueCurrentIndex + (queueCompleted ? 1 : 0)} / {queueTargets.length}
                  </strong>{" "}
                  phụ huynh
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {Math.round(
                    ((queueCurrentIndex + (queueCompleted ? 1 : 0)) / queueTargets.length) * 100
                  )}
                  %
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{
                    width: `${
                      ((queueCurrentIndex + (queueCompleted ? 1 : 0)) / queueTargets.length) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            {!queueCompleted ? (
              <>
                {/* Active Student Card in Queue */}
                {queueTargets[queueCurrentIndex] && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-800/80 to-emerald-950/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                        Phụ huynh đang xử lý [{queueCurrentIndex + 1}/{queueTargets.length}]:
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatCurrencyVND(queueTargets[queueCurrentIndex].totalAmount)}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-extrabold text-white">
                          Em {queueTargets[queueCurrentIndex].studentName}{" "}
                          <span className="text-xs text-slate-400 font-mono">
                            ({queueTargets[queueCurrentIndex].studentCode})
                          </span>
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Phụ huynh: <strong className="text-emerald-300">{queueTargets[queueCurrentIndex].parentName || "Phụ huynh"}</strong> •{" "}
                          SĐT Zalo: <span className="font-mono font-bold text-white">{queueTargets[queueCurrentIndex].parentPhone}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Thực học: <strong>{queueTargets[queueCurrentIndex].presentCount} buổi</strong> | Cú pháp:{" "}
                          <span className="text-amber-400 font-mono font-bold">
                            {queueTargets[queueCurrentIndex].transferContent}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Big Step Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleQueueOpenCurrentStudentZalo}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0068FF] hover:bg-blue-600 p-3.5 text-xs font-extrabold text-white shadow-lg shadow-blue-500/25 active:scale-98 transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Bước 1: Mở Tab Zalo & Tự Động Copy Tin Nhắn Cho Em Này</span>
                  </button>

                  <p className="text-center text-[11px] text-slate-400">
                    (Tại Zalo: Nhấn nút <strong>[Nhắn tin]</strong> ➔ Bấm <strong>Ctrl + V</strong> và nhấn <strong>Enter</strong> để gửi)
                  </p>

                  <button
                    type="button"
                    onClick={handleQueueConfirmAndNext}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 p-3.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>
                      Bước 2: Đã Gửi Xong Trên Zalo ➔ Chuyển Sang Phụ Huynh Tiếp Theo
                    </span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={handleQueueSkipCurrent}
                    className="text-slate-400 hover:text-white"
                  >
                    Bỏ qua em này ➔
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsQueueOpen(false)}
                    className="text-rose-400 hover:underline"
                  >
                    Tạm dừng tiến trình
                  </button>
                </div>
              </>
            ) : (
              /* Completed Queue View */
              <div className="rounded-2xl border border-emerald-500/60 bg-emerald-950/60 p-6 text-center space-y-3 animate-in zoom-in-95">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/40">
                  <Check className="h-8 w-8 stroke-[3]" />
                </div>
                <h4 className="text-base font-black text-emerald-300">
                  🎉 XÁC NHẬN: ĐÃ GỬI XONG CHO TẤT CẢ PHỤ HUYNH!
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Bạn đã hoàn tất gửi thông báo học phí tháng {month}/{year} cho phụ huynh lớp {classroom.name}.
                  Toàn bộ trạng thái đã được cập nhật chính xác kèm mốc thời gian.
                </p>

                <button
                  type="button"
                  onClick={() => setIsQueueOpen(false)}
                  className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 shadow-md transition-all"
                >
                  Hoàn Tất & Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 3. MODAL HƯỚNG DẪN & KẾT NỐI TOOL ZALO BULK SENDER (EXE) */}
      {/* ========================================================================= */}
      {isToolModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
          style={{ zIndex: 99999 }}
        >
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700/80 p-6 text-white shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                    <span>Phần Mềm Zalo Bulk Sender (EXE)</span>
                    <span className="rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 border border-indigo-500/30">
                      Gửi Thẻ Ảnh Tự Động
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lớp {classroom.name} • {students.length} học viên • Ảnh thẻ VietQR Napas 24/7 sắc nét
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsToolModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thông báo file đã tải */}
            <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/40 p-3 flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-300">File học phí đã được tạo sẵn sàng!</span>{" "}
                <span className="text-slate-300">File đã được tải về thư mục Downloads của bạn.</span>
              </div>
            </div>

            {/* 3 Bước thực hiện */}
            <div className="space-y-3">
              {/* Bước 1: Tải file dữ liệu */}
              <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Gói dữ liệu học phí cả lớp (.json)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bấm để tải lại nếu chưa có trong thư mục <code className="text-indigo-300 font-mono">Downloads</code>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={exportInvoicesJsonForTool}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>📥 Tải Lại File JSON</span>
                </button>
              </div>

              {/* Bước 2: Khởi động Tool */}
              <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white font-black text-xs shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Khởi động Phần Mềm Zalo Sender</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Bấm để mở tool, hoặc tải file khởi động <code className="text-purple-300 font-mono">Mo_Tool_Zalo.bat</code> về Downloads
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={handleDirectLaunchTool}
                      className="rounded-xl bg-purple-600 hover:bg-purple-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-purple-600/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>🚀 Mở Tool Ngay</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadQuickLauncher}
                      className="rounded-xl border border-purple-500/40 bg-purple-950/60 hover:bg-purple-900/60 px-3 py-2 text-xs font-bold text-purple-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      title="Tải file Mo_Tool_Zalo.bat về máy để nhấp đúp mở tool bất cứ lúc nào"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>📥 Tải File Mở Tool (.bat)</span>
                    </button>
                  </div>
                </div>

                {/* Gợi ý đường dẫn có sẵn trên máy */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-700/60 p-2.5 flex items-center justify-between text-[11px] gap-2">
                  <span className="text-slate-400 truncate">
                    File có sẵn trên máy: <code className="text-emerald-400 font-mono font-bold">D:\Dự án\QuanlyKTTL\Chay_Tool_Zalo_EXE.bat</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("D:\\Dự án\\QuanlyKTTL\\Chay_Tool_Zalo_EXE.bat");
                      showToast("Đã copy đường dẫn file! Dán vào Run (Win+R) hoặc Explorer để mở.");
                    }}
                    className="shrink-0 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy đường dẫn</span>
                  </button>
                </div>
              </div>

              {/* Bước 3: Nạp và gửi */}
              <div className="rounded-2xl bg-slate-800/50 border border-slate-700/60 p-4 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shrink-0">
                  3
                </div>
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-white">Trên Tool: Bấm Nhận File & Gửi</h4>
                  <p className="text-slate-300 text-[11.5px] leading-relaxed">
                    Trên thanh công cụ của phần mềm Zalo Sender, chỉ cần bấm nút màu xanh:
                  </p>
                  <p className="font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 rounded-lg px-3 py-1.5 inline-block text-xs">
                    ⚡ Nhận file mới từ Downloads
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Toàn bộ {students.length} học viên sẽ hiện lên kèm thẻ ảnh Retina 2x. Bấm <strong>[🚀 BẮT ĐẦU GỬI]</strong> là tool tự động chạy!
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
              <span className="text-slate-500">
                Phiên bản: <strong className="text-slate-400 font-mono">v2.0 (Retina 2x VietQR)</strong>
              </span>

              <button
                type="button"
                onClick={() => setIsToolModalOpen(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Đóng hộp thoại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
