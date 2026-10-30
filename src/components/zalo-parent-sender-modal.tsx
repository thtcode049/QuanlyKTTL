"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Users,
  BookOpen,
  Info,
  HelpCircle,
  FolderOpen,
  FileCode,
  Copy,
  FileImage,
  FolderArchive,
} from "lucide-react";
import confetti from "canvas-confetti";
import { ClassroomData, BranchData, dataStore } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import {
  downloadInvoiceCardPng,
  copyInvoiceCardToClipboard,
  batchExportInvoiceCardsAsZip,
  InvoiceCardData,
  InvoiceClassItem,
} from "@/lib/invoice-card-generator";

export interface StudentParentInvoiceItem {
  invoiceId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  parentName?: string;
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
  classList?: InvoiceClassItem[];
}

interface ZaloParentSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: ClassroomData | { id: string; name: string; level?: string; feePerSession?: number; schedule?: string } | null;
  branch?: BranchData | { id?: string; name: string; address?: string; phone?: string | null } | null;
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

  // Bộ lọc danh sách học viên: "ALL" | "UNSENT" | "SENT"
  const [filterTab, setFilterTab] = useState<"ALL" | "UNSENT" | "SENT">("ALL");

  // Hiển thị tab Hướng dẫn dùng tool
  const [showGuide, setShowGuide] = useState(false);

  // Bản đồ theo dõi trạng thái đã gửi Zalo qua Tool: studentId -> ISO string thời gian gửi
  const [sentMap, setSentMap] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    students.forEach((st) => {
      if (st.zaloSentAt) {
        initialMap[st.studentId] = st.zaloSentAt;
      }
    });

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

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [launchStatus, setLaunchStatus] = useState<{
    type: "loading" | "success" | "warn" | "error";
    message: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  useEffect(() => {
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

  if (!isOpen || !classroom) return null;

  // Đánh dấu 1 học sinh đã gửi qua Tool
  const markStudentAsSent = (studentId: string) => {
    const now = new Date().toISOString();
    const nextMap = { ...sentMap, [studentId]: now };
    setSentMap(nextMap);

    if (classroom.id === "all") {
      dataStore.invoices.forEach((inv) => {
        if (inv.studentId === studentId && inv.month === month && inv.year === year) {
          inv.zaloSentAt = now;
        }
      });
      dataStore.saveToLocalStorage();
    } else {
      dataStore.markInvoiceZaloSentByStudent(classroom.id, studentId, month, year, now);
    }

    try {
      localStorage.setItem("kttl_zalo_sent_records", JSON.stringify(nextMap));
    } catch (e) {}

    fetch("/api/coach/send-zalo-parents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_sent", studentId, month, year }),
    }).catch(() => {});

    if (onSentSuccess) onSentSuccess();
  };

  // Hủy đánh dấu đã gửi
  const unmarkStudentAsSent = (studentId: string) => {
    const nextMap = { ...sentMap };
    delete nextMap[studentId];
    setSentMap(nextMap);

    if (classroom.id === "all") {
      dataStore.invoices.forEach((inv) => {
        if (inv.studentId === studentId && inv.month === month && inv.year === year) {
          delete inv.zaloSentAt;
        }
      });
      dataStore.saveToLocalStorage();
    } else {
      const inv = dataStore.invoices.find(
        (i) => i.classId === classroom.id && i.studentId === studentId && i.month === month && i.year === year
      );
      if (inv) {
        delete inv.zaloSentAt;
        dataStore.saveToLocalStorage();
      }
    }

    try {
      localStorage.setItem("kttl_zalo_sent_records", JSON.stringify(nextMap));
    } catch (e) {}

    if (onSentSuccess) onSentSuccess();
    showToast("Đã hủy đánh dấu học viên này!");
  };

  // Đánh dấu toàn bộ học sinh trong lớp là ĐÃ GỬI
  const markAllStudentsAsSent = () => {
    const now = new Date().toISOString();
    const nextMap = { ...sentMap };
    students.forEach((st) => {
      nextMap[st.studentId] = now;
      if (classroom.id === "all") {
        dataStore.invoices.forEach((inv) => {
          if (inv.studentId === st.studentId && inv.month === month && inv.year === year) {
            inv.zaloSentAt = now;
          }
        });
      } else {
        dataStore.markInvoiceZaloSentByStudent(classroom.id, st.studentId, month, year, now);
      }
    });
    dataStore.saveToLocalStorage();
    setSentMap(nextMap);

    try {
      localStorage.setItem("kttl_zalo_sent_records", JSON.stringify(nextMap));
    } catch (e) {}

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    showToast(`Đã đánh dấu hoàn tất toàn bộ ${students.length} học viên trong lớp!`);
    if (onSentSuccess) onSentSuccess();
  };

  // Xuất file JSON dữ liệu học phí để nạp vào Tool Zalo
  const exportInvoicesJsonForTool = () => {
    const exportBundle = {
      version: "2.0",
      generatedAt: new Date().toISOString(),
      month,
      year,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        level: classroom.level || "Tất cả",
        feePerSession: classroom.feePerSession || 0,
        schedule: classroom.schedule || "",
      },
      branch: branch
        ? {
            id: branch.id || "",
            name: branch.name,
            address: branch.address || "",
            phone: branch.phone || null,
          }
        : null,
      bankConfig: {
        bankName: dataStore.bankConfig.bankName,
        bankAccount: dataStore.bankConfig.bankAccount,
        accountHolder: dataStore.bankConfig.accountHolder,
      },
      totalStudents: students.length,
      totalAmount: students.reduce((sum, s) => sum + s.totalAmount, 0),
      students: students.map((st) => ({
        invoiceId: st.invoiceId,
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
        status: st.status,
        transferContent: st.transferContent,
        vietQrUrl: st.vietQrUrl,
        bankName: st.bankName,
        bankAccount: st.bankAccount,
        accountHolder: st.accountHolder,
      })),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const downloadAnchor = document.createElement("a");
    const safeClassName = classroom.name.replace(/[^a-zA-Z0-9\-_]/g, "_");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `KTTLL_HocPhi_${safeClassName}_T${month}_${year}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast("Đã tải file dữ liệu học phí (.json) vào thư mục Downloads!");
  };

  // Khởi động trực tiếp Tool EXE trên máy tính (nạp sẵn danh sách học viên lớp này)
  const handleDirectLaunchTool = async () => {
    try {
      // 1. Tự động kết xuất và tải file JSON vào thư mục Downloads của máy
      exportInvoicesJsonForTool();

      setLaunchStatus({
        type: "loading",
        message: "⏳ Đang kết nối và khởi động Tool Zalo Bulk Sender trên máy tính...",
      });
      showToast("⏳ Đang khởi động Tool Zalo Bulk Sender trên máy tính...");

      // 2. Kích hoạt mở Tool trên máy
      const res = await fetch(
        `/api/coach/send-zalo-parents?action=open_tool&classId=${classroom.id}&month=${month}&year=${year}`
      );
      const data = await res.json();
      if (data.success) {
        setLaunchStatus({
          type: "success",
          message:
            "🚀 Đã kích hoạt Tool Zalo thành công và nạp sẵn dữ liệu học phí của lớp! Nếu cửa sổ Tool chưa nổi lên trên cùng, bạn vui lòng bấm vào biểu tượng Tool trên thanh Taskbar.",
        });
        showToast("🚀 Đã mở Tool Zalo trên máy tính!");
      } else {
        setLaunchStatus({
          type: "warn",
          message:
            data.message ||
            "💡 File dữ liệu học phí (.json) đã được tải vào thư mục Downloads của bạn. Bạn hãy mở file Zalo_Bulk_Sender.exe trên Desktop hoặc thư mục Downloads, rồi bấm nút xanh '⚡ Nhận file mới từ Downloads' trong Tool là xong ngay!",
        });
        showToast("💡 File dữ liệu đã tải vào Downloads. Vui lòng mở Tool để gửi!");
      }
    } catch (e: any) {
      setLaunchStatus({
        type: "warn",
        message:
          "💡 File dữ liệu học phí (.json) đã được tải vào thư mục Downloads của bạn. Bạn hãy mở file Zalo_Bulk_Sender.exe trên Desktop hoặc thư mục Downloads, rồi bấm nút xanh '⚡ Nhận file mới từ Downloads' trong Tool là xong ngay!",
      });
      showToast("💡 Vui lòng mở file Zalo_Bulk_Sender.exe trên máy tính để gửi!");
    }
  };

  // Định dạng mốc thời gian đã gửi
  const formatSentTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")} ${d.getDate()}/${d.getMonth() + 1}`;
    } catch (e) {
      return "";
    }
  };

  const sentCount = Object.keys(sentMap).length;
  const unsentCount = Math.max(0, students.length - sentCount);
  const totalAmount = students.reduce((sum, s) => sum + s.totalAmount, 0);

  const filteredStudents = students.filter((st) => {
    if (filterTab === "UNSENT") return !sentMap[st.studentId];
    if (filterTab === "SENT") return !!sentMap[st.studentId];
    return true;
  });

  const previewStudent = selectedStudent || students[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
      {/* Toast Popup */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-2.5 rounded-md bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-4 max-w-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span className="leading-snug flex-1">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5 rounded text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <div className="relative w-full max-w-5xl rounded-lg bg-white shadow-xl border border-slate-200 my-auto overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-brand-primary text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                  Gửi Thẻ Học Phí Bằng Tool Zalo Bulk Sender (EXE)
                </h3>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Tự Động 100%
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Lớp: <strong className="text-slate-800">{classroom?.name}</strong> • Tháng {month}/{year} • {students.length} phụ huynh
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-slate-900 p-3.5 text-white border-b border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Quy trình gửi thẻ học phí chuẩn
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Phần mềm độc lập tự động gửi thẻ ảnh VietQR Napas 24/7 đến Zalo của từng phụ huynh.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* NÚT 1: TẢI TOOL EXE & ZIP */}
              <div className="inline-flex rounded shadow-xs">
                <a
                  href="/api/tool/download"
                  download="Zalo_Bulk_Sender.exe"
                  className="rounded-l border border-amber-400/50 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 active:scale-95 transition-all flex items-center gap-1.5"
                  title="Tải trực tiếp phần mềm Zalo_Bulk_Sender.exe"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>📥 Tải Tool (.exe)</span>
                </a>
                <a
                  href="/api/tool/download?format=zip"
                  download="Zalo_Bulk_Sender.zip"
                  className="rounded-r border-y border-r border-amber-400/50 bg-amber-600 hover:bg-amber-500 px-2 py-1.5 text-[11px] font-semibold text-slate-950 active:scale-95 transition-all flex items-center"
                  title="Tải bản nén (.zip) dự phòng nếu máy tính chặn tải file .exe"
                >
                  <span>.ZIP</span>
                </a>
              </div>

              {/* NÚT: XUẤT TOÀN BỘ ẢNH THẺ PNG (.ZIP) */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    showToast("⏳ Đang tạo trọn bộ ảnh PNG thẻ học phí...");
                    const cardList: InvoiceCardData[] = students.map((s) => ({
                      studentCode: s.studentCode,
                      studentName: s.studentName,
                      className: s.className,
                      branchName: s.branchName,
                      month: s.month,
                      year: s.year,
                      presentCount: s.presentCount,
                      presentDates: s.presentDates,
                      feePerSession: s.feePerSession,
                      totalAmount: s.totalAmount,
                      bankName: s.bankName,
                      bankAccount: s.bankAccount,
                      accountHolder: s.accountHolder,
                      transferContent: s.transferContent,
                      vietQrUrl: s.vietQrUrl,
                      classList: s.classList,
                    }));
                    const safeClass = (classroom?.name || "Lop").replace(/[^a-zA-Z0-9\-_]/g, "_");
                    await batchExportInvoiceCardsAsZip(
                      cardList,
                      `KTTLL_AnhTheHocPhi_${safeClass}_T${month}_${year}.zip`,
                      (curr, tot) => {
                        if (curr === tot) {
                          showToast(`✅ Đã tải xong ${tot} ảnh thẻ PNG (.zip)!`);
                        }
                      }
                    );
                  } catch (e) {
                    showToast("Lỗi khi xuất ảnh thẻ PNG!");
                  }
                }}
                className="rounded border border-teal-400/50 bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                title="Tải toàn bộ ảnh thẻ học phí định dạng PNG của lớp thành 1 file .ZIP"
              >
                <FolderArchive className="h-3.5 w-3.5" />
                <span>📥 Tải Bộ Ảnh PNG (.zip)</span>
              </button>

              {/* NÚT 2: TẢI FILE DỮ LIỆU JSON */}
              <button
                type="button"
                onClick={exportInvoicesJsonForTool}
                className="rounded border border-emerald-400/50 bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                title="Tải file dữ liệu học phí JSON của cả lớp để nạp vào Tool Zalo"
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>📥 Tải File Dữ Liệu (.json)</span>
              </button>

              {/* NÚT 3: KHỞI ĐỘNG TOOL TRÊN MÁY */}
              <button
                type="button"
                onClick={handleDirectLaunchTool}
                className="rounded border border-indigo-400/40 bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                title="Tự động tải file và khởi động phần mềm Zalo Bulk Sender trên máy có sẵn tool"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>🚀 Mở Tool Trên Máy</span>
              </button>

              {/* NÚT 4: XEM HƯỚNG DẪN */}
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className={`rounded px-2.5 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 border ${
                  showGuide
                    ? "bg-slate-700 text-white border-slate-500"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>{showGuide ? "Ẩn Hướng Dẫn" : "Hướng Dẫn"}</span>
              </button>
            </div>
          </div>

          {/* Banner Thông Báo Khởi Động Tool Trực Tiếp Trong Modal */}
          {launchStatus && (
            <div
              className={`mt-3 rounded p-3 text-xs flex items-start gap-2.5 border shadow-xs ${
                launchStatus.type === "success"
                  ? "bg-emerald-950/80 text-emerald-200 border-emerald-500/40"
                  : launchStatus.type === "loading"
                  ? "bg-indigo-950/80 text-indigo-200 border-indigo-500/40 animate-pulse"
                  : "bg-amber-950/80 text-amber-200 border-amber-500/40"
              }`}
            >
              <span className="text-base flex-shrink-0">
                {launchStatus.type === "success"
                  ? "🚀"
                  : launchStatus.type === "loading"
                  ? "⏳"
                  : "💡"}
              </span>
              <div className="flex-1 space-y-0.5">
                <div className="font-bold">{launchStatus.message}</div>
                <div className="text-[11px] opacity-85 leading-relaxed">
                  <strong>Thao tác nhanh:</strong> Trong cửa sổ phần mềm <strong>Zalo Bulk Sender</strong>, chỉ cần bấm nút xanh <strong>⚡ Nhận file mới từ Downloads</strong> là danh sách học phí vừa tải sẽ được nạp vào ngay lập tức!
                </div>
              </div>
              <button
                onClick={() => setLaunchStatus(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Collapsible Quick Guide */}
          {showGuide && (
            <div className="mt-3 rounded bg-slate-950 p-3.5 border border-slate-800 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>4 Bước Sử Dụng Phần Mềm Zalo Bulk Sender:</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Dành cho Huấn luyện viên & Quản trị viên
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <div className="rounded bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950">
                      1
                    </span>
                    <strong className="text-amber-300">Tải Tool Zalo (.exe)</strong>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Bấm nút <strong>"Tải Tool Zalo (.exe)"</strong> ở trên để tải về máy. Chỉ cần tải 1 lần đầu, không cần cài đặt.
                  </p>
                </div>

                <div className="rounded bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-slate-950">
                      2
                    </span>
                    <strong className="text-emerald-300">Tải File Dữ Liệu (.json)</strong>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Bấm <strong>"Tải File Dữ Liệu (.json)"</strong> của lớp học này. File sẽ tự động lưu vào thư mục <code className="text-emerald-400">Downloads</code>.
                  </p>
                </div>

                <div className="rounded bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white">
                      3
                    </span>
                    <strong className="text-indigo-300">Mở Tool & Nhận File</strong>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Mở <code className="text-indigo-400">Zalo_Bulk_Sender.exe</code>, bấm nút màu xanh: <strong>"⚡ Nhận file mới từ Downloads"</strong>.
                  </p>
                </div>

                <div className="rounded bg-slate-900 p-2.5 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[10px] font-black text-white">
                      4
                    </span>
                    <strong className="text-purple-300">Bắt Đầu Gửi</strong>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Kiểm tra danh sách học viên và bấm nút <strong>"🚀 BẮT ĐẦU GỬI"</strong> trên Tool để tự động gửi ảnh thẻ đến phụ huynh!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
          {/* Banner Xác Nhận Đã Gửi Xong Cho Cả Lớp */}
          {sentCount === students.length && (
            <div className="rounded border border-emerald-300 bg-emerald-50/80 p-3.5 text-emerald-950 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-600 text-white shadow-xs flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    🎉 Toàn Bộ Phụ Huynh Trong Lớp Đã Được Xác Nhận Gửi Thẻ Học Phí!
                  </h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Đã hoàn tất gửi {sentCount}/{students.length} học viên tháng {month}/{year}. Toàn bộ thẻ học phí đã được chuyển tới phụ huynh.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid: Student List (Left) + Card Visual Preview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Student List (7 cols) */}
            <div className="lg:col-span-7 space-y-2.5">
              {/* Header with Filter Tabs & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded">
                  <button
                    type="button"
                    onClick={() => setFilterTab("ALL")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                      filterTab === "ALL"
                        ? "bg-white text-slate-900 shadow-xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("UNSENT")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1 ${
                      filterTab === "UNSENT"
                        ? "bg-white text-amber-700 shadow-xs font-semibold"
                        : "text-slate-600 hover:text-amber-700"
                    }`}
                  >
                    <span>⚪ Chưa gửi ({unsentCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("SENT")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-all flex items-center gap-1 ${
                      filterTab === "SENT"
                        ? "bg-white text-emerald-700 shadow-xs font-semibold"
                        : "text-slate-600 hover:text-emerald-700"
                    }`}
                  >
                    <span>✅ Đã gửi ({sentCount})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={markAllStudentsAsSent}
                    className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition-colors"
                    title="Đánh dấu đã gửi thành công toàn bộ học viên bằng Tool"
                  >
                    Đánh dấu đã gửi cả lớp
                  </button>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Tổng: {formatCurrencyVND(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Students Scrollable List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredStudents.map((st) => {
                  const isSelected = previewStudent?.studentId === st.studentId;
                  const sentTimeIso = sentMap[st.studentId];
                  const isSent = !!sentTimeIso;

                  return (
                    <div
                      key={st.studentId}
                      onClick={() => setSelectedStudent(st)}
                      className={`cursor-pointer rounded p-3 transition-all border ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500"
                          : isSent
                          ? "border-emerald-200/60 bg-emerald-50/15 hover:border-emerald-300"
                          : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded font-bold text-xs ${
                              isSelected
                                ? "bg-emerald-600 text-white shadow-xs"
                                : isSent
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {st.studentCode}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {st.studentName}
                              </h4>

                              {/* Trạng thái thanh toán */}
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                                  st.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {st.status === "PAID" ? "Đã đóng" : "Chờ đóng"}
                              </span>

                              {/* Huy hiệu xác nhận đã gửi qua Tool */}
                              {isSent ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>Đã gửi ({formatSentTime(sentTimeIso)})</span>
                                </span>
                              ) : (
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-500">
                                  ⚪ Chờ gửi qua Tool
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 text-xs text-slate-500 truncate">
                              SĐT:{" "}
                              <span className="font-mono text-slate-700 font-semibold">{st.parentPhone}</span>
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-600">
                              Thực học: <strong>{st.presentCount}</strong> buổi | Số tiền:{" "}
                              <strong className="text-emerald-700 font-bold">
                                {formatCurrencyVND(st.totalAmount)}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Nút đánh dấu đã gửi qua Tool */}
                        <div
                          className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (isSent) {
                                unmarkStudentAsSent(st.studentId);
                              } else {
                                markStudentAsSent(st.studentId);
                                showToast(`Đã đánh dấu em ${st.studentName} là "Đã gửi qua Tool"!`);
                              }
                            }}
                            className={`flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition-all ${
                              isSent
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                            }`}
                            title={isSent ? "Bấm để hủy đánh dấu đã gửi" : "Bấm để đánh dấu đã gửi qua Tool"}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>{isSent ? "Đã gửi" : "Đánh dấu"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="rounded border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
                    {filterTab === "UNSENT"
                      ? "Tuyệt vời! Toàn bộ phụ huynh đã nhận thẻ học phí."
                      : filterTab === "SENT"
                      ? "Chưa có phụ huynh nào được gửi qua Tool trong tháng này."
                      : "Không tìm thấy học sinh nào."}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Card Visual Preview & Download (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Ảnh Thẻ Học Phí Tool Sẽ Tự Động Bắn:
                </h3>
              </div>

              {previewStudent ? (
                <div className="space-y-3">
                  {/* Sent Confirmation Badge for Selected Student */}
                  {sentMap[previewStudent.studentId] ? (
                    <div className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 flex items-center justify-between text-xs text-emerald-900 shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <div>
                          <strong>Đã gửi qua Tool:</strong>{" "}
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
                    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Chưa gửi thông báo qua Tool cho phụ huynh học viên này.</span>
                    </div>
                  )}

                  {/* Card Visual Preview */}
                  <div className="rounded-md border border-slate-200 bg-white p-4 shadow-xs relative overflow-hidden">
                    {/* Stamp */}
                    <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                      ♔
                    </div>

                    {/* Header Badge */}
                    <span className="inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 tracking-wide">
                      HỌC PHÍ THÁNG {previewStudent.month}/{previewStudent.year}
                    </span>

                    {/* Title */}
                    <h4 className="mt-1.5 text-xs font-bold text-slate-900 leading-tight">
                      [KTTLL] THÔNG BÁO HỌC PHÍ THÁNG {previewStudent.month}/{previewStudent.year}
                    </h4>

                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
                      Kính gửi phụ huynh em <strong>{previewStudent.studentName}</strong>, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng {previewStudent.month}/{previewStudent.year} theo nguyên tắc <em>Thực học - Thực trả</em>.
                    </p>

                    {/* Details Table */}
                    <div className="mt-2.5 space-y-1 text-xs border-t border-b border-slate-100 py-2.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Học viên:</span>
                        <span className="font-bold text-slate-900">
                          {previewStudent.studentName} ({previewStudent.studentCode})
                        </span>
                      </div>

                      {previewStudent.classList && previewStudent.classList.length > 1 ? (
                        <div className="space-y-1 py-1">
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                            <span>Chi tiết các lớp học ({previewStudent.classList.length} lớp):</span>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase">Thực học - Thực trả</span>
                          </div>
                          {previewStudent.classList.map((clsItem, cIdx) => (
                            <div key={cIdx} className="rounded bg-slate-50 p-2 border border-slate-200/80 text-xs">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-slate-800">{cIdx + 1}. {clsItem.className}</span>
                                <span className="font-bold text-emerald-700">{formatCurrencyVND(clsItem.totalAmount)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10.5px] text-slate-500 mt-0.5">
                                <span>{clsItem.presentCount} buổi × {formatCurrencyVND(clsItem.feePerSession)}/b</span>
                                {clsItem.presentDates && clsItem.presentDates.length > 0 && (
                                  <span className="text-slate-400">({clsItem.presentDates.join(", ")})</span>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-500">Tổng số buổi thực học:</span>
                            <span className="font-bold text-slate-900">{previewStudent.presentCount} buổi</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Lớp học:</span>
                            <span className="font-semibold text-slate-900 text-right max-w-[65%]">
                              {previewStudent.className} – {previewStudent.branchName}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-500">Số buổi thực học:</span>
                            <span className="font-semibold text-slate-900">
                              {previewStudent.presentCount} buổi
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-500">Các ngày có mặt:</span>
                            <span className="font-semibold text-slate-900 text-right">
                              {previewStudent.presentDates && previewStudent.presentDates.length > 0
                                ? previewStudent.presentDates.join(", ")
                                : "Chưa có buổi học"}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-slate-500">Đơn giá:</span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrencyVND(previewStudent.feePerSession)}/buổi
                            </span>
                          </div>
                        </>
                      )}

                      {/* Highlight row */}
                      <div className="my-1.5 flex items-center justify-between rounded bg-emerald-50 px-2.5 py-1.5 border border-emerald-200">
                        <span className="font-semibold text-emerald-800 text-xs">Tổng học phí:</span>
                        <span className="font-bold text-emerald-600 text-sm">
                          {formatCurrencyVND(previewStudent.totalAmount)}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Ngân hàng:</span>
                        <span className="font-medium text-slate-900 text-right max-w-[60%]">
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
                    <div className="mt-2.5 rounded bg-slate-50/70 p-2 text-center border border-slate-200/70">
                      <p className="text-[10px] font-semibold text-slate-700 flex items-center justify-center gap-1">
                        <QrCode className="h-3 w-3 text-emerald-600" />
                        Mã VietQR thanh toán Napas 247
                      </p>
                      <div className="mt-1.5 mx-auto flex h-28 w-28 items-center justify-center rounded bg-white p-1 shadow-xs border border-slate-200">
                        <img
                          src={previewStudent.vietQrUrl}
                          alt="VietQR"
                          className="h-full w-full object-contain rounded"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions for Selected Student */}
                  <div className="rounded bg-slate-50/70 p-2.5 border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                      Tùy chọn thẻ học phí em {previewStudent.studentName}:
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const cardData: InvoiceCardData = {
                            studentCode: previewStudent.studentCode,
                            studentName: previewStudent.studentName,
                            className: previewStudent.className,
                            branchName: previewStudent.branchName,
                            month: previewStudent.month,
                            year: previewStudent.year,
                            presentCount: previewStudent.presentCount,
                            presentDates: previewStudent.presentDates,
                            feePerSession: previewStudent.feePerSession,
                            totalAmount: previewStudent.totalAmount,
                            bankName: previewStudent.bankName,
                            bankAccount: previewStudent.bankAccount,
                            accountHolder: previewStudent.accountHolder,
                            transferContent: previewStudent.transferContent,
                            vietQrUrl: previewStudent.vietQrUrl,
                            classList: previewStudent.classList,
                          };
                          const success = await copyInvoiceCardToClipboard(cardData);
                          if (success) {
                            showToast(`📋 Đã chép ảnh thẻ em ${previewStudent.studentName} vào Clipboard!`);
                          } else {
                            showToast("Trình duyệt không hỗ trợ sao chép trực tiếp. Hãy bấm nút Tải PNG!");
                          }
                        }}
                        className="flex items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 active:scale-98 transition-all shadow-xs"
                      >
                        <Copy className="h-3.5 w-3.5 text-slate-600" />
                        <span>Sao Chép Ảnh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cardData: InvoiceCardData = {
                            studentCode: previewStudent.studentCode,
                            studentName: previewStudent.studentName,
                            className: previewStudent.className,
                            branchName: previewStudent.branchName,
                            month: previewStudent.month,
                            year: previewStudent.year,
                            presentCount: previewStudent.presentCount,
                            presentDates: previewStudent.presentDates,
                            feePerSession: previewStudent.feePerSession,
                            totalAmount: previewStudent.totalAmount,
                            bankName: previewStudent.bankName,
                            bankAccount: previewStudent.bankAccount,
                            accountHolder: previewStudent.accountHolder,
                            transferContent: previewStudent.transferContent,
                            vietQrUrl: previewStudent.vietQrUrl,
                            classList: previewStudent.classList,
                          };
                          downloadInvoiceCardPng(cardData);
                          showToast(`📥 Đã tải ảnh PNG thẻ học phí em ${previewStudent.studentName}!`);
                        }}
                        className="flex items-center justify-center gap-1 rounded border border-emerald-300 bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-98 transition-all shadow-xs"
                      >
                        <Download className="h-3.5 w-3.5 text-white" />
                        <span>Tải Ảnh PNG</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
                  Chọn một học viên để xem trước thẻ học phí.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 sm:px-5 py-3 gap-2.5">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              Mã VietQR Napas 24/7 tự động nhận diện tài khoản thụ hưởng và số tiền học phí thực tế.
            </span>
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={exportInvoicesJsonForTool}
              className="flex items-center gap-1.5 rounded bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs active:scale-95 transition-all"
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Tải File Dữ Liệu (.json)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded bg-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
