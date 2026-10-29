"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  Download,
  Send,
  QrCode,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Check,
  Search,
  Edit3,
  X,
  GraduationCap,
  Settings,
  FileImage,
  FolderArchive,
  Layers,
} from "lucide-react";
import {
  dataStore,
  MonthlyInvoiceData,
  ClassroomData,
  StudentData,
  resolveCanonicalCoachId,
  getCoachClasses,
} from "@/lib/data-store";
import { formatCurrencyVND, generateVietQrUrl } from "@/lib/vietqr";
import { exportInvoicesToExcel, InvoiceExportRow } from "@/lib/excel";
import VietQrModal from "@/components/vietqr-modal";
import ZaloParentSenderModal, { StudentParentInvoiceItem } from "@/components/zalo-parent-sender-modal";
import BatchCardExportModal from "@/components/batch-card-export-modal";
import {
  downloadInvoiceCardPng,
  copyInvoiceCardToClipboard,
  InvoiceCardData,
  InvoiceClassItem,
} from "@/lib/invoice-card-generator";

export interface AggregatedStudentInvoice {
  studentId: string;
  student: StudentData;
  studentCode: string;
  studentName: string;
  parentPhone: string;
  classItems: Array<{
    invoiceId: string;
    classId: string;
    className: string;
    branchName: string;
    presentCount: number;
    presentDates: string[];
    feePerSession: number;
    totalAmount: number;
    status: "PENDING" | "PAID";
    zaloSentAt?: string;
  }>;
  totalPresentCount: number;
  totalAmount: number;
  status: "PENDING" | "PAID";
  invoiceIds: string[];
  zaloSentAt?: string;
  vietQrUrl: string;
  transferContent: string;
}

function InvoicesContent() {
  const searchParams = useSearchParams();

  const [currentCoachId, setCurrentCoachId] = useState<string>("user-coach-1");
  const [classes, setClasses] = useState<ClassroomData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [invoices, setInvoices] = useState<MonthlyInvoiceData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Tải lớp học của riêng HLV hiện tại
  useEffect(() => {
    let coachId = "";
    let coachEmail = "";
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) coachId = u.id;
        if (u.email) coachEmail = u.email;
      } catch (e) {}
    }
    setCurrentCoachId(coachId);

    const updateDisplay = () => {
      // Ở giao diện HLV, chỉ hiển thị hóa đơn các lớp của chính HLV phụ trách
      const myClasses = getCoachClasses(coachId, coachEmail);
      setClasses(myClasses);
      const paramClassId = searchParams.get("classId");
      if (paramClassId && (paramClassId === "all" || myClasses.some((c) => c.id === paramClassId))) {
        setSelectedClassId(paramClassId);
      } else {
        setSelectedClassId((prev) => (prev === "all" || myClasses.some((c) => c.id === prev) ? prev : "all"));
      }
    };

    updateDisplay();
    dataStore.syncWithDatabase().then(() => updateDisplay());
  }, [searchParams]);

  // Modal VietQR State
  const [vietQrModalOpen, setVietQrModalOpen] = useState(false);
  const [activeQrData, setActiveQrData] = useState<{
    studentName: string;
    studentCode: string;
    amount: number;
    month: number;
    year: number;
    qrUrl: string;
    transferContent: string;
    bankName?: string;
    bankAccount?: string;
    accountHolder?: string;
  } | null>(null);

  // Modal HLV Gửi Thẻ Học Phí Bằng Tool Zalo EXE
  const [zaloParentModalOpen, setZaloParentModalOpen] = useState(false);
  const [selectedStudentForParentModal, setSelectedStudentForParentModal] = useState<string | undefined>(undefined);

  // Modal Xuất Hàng Loạt Ảnh Thẻ Học Phí (PNG / ZIP)
  const [batchExportModalOpen, setBatchExportModalOpen] = useState(false);

  // Tùy chọn gộp phiếu thu cho học viên học nhiều lớp khi đang xem từng lớp riêng
  const [preferConsolidatedCards, setPreferConsolidatedCards] = useState<boolean>(true);

  // Helper tạo dữ liệu thẻ học phí cho từng dòng hóa đơn
  const buildInvoiceCardData = (
    inv: MonthlyInvoiceData,
    student: StudentData,
    includeOtherClasses: boolean = preferConsolidatedCards
  ): InvoiceCardData => {
    const bank = dataStore.bankConfig;
    const transferContent = `HP ${student.code} T${selectedMonth}`;
    const targetClass = classes.find((c) => c.id === inv.classId) || selectedClass;
    const targetBranch = dataStore.branches.find((b) => b.id === targetClass?.branchId);

    // Nếu yêu cầu gộp các lớp khác và học viên có nhiều hơn 1 lớp trong tháng
    const studentInvsInMonth = dataStore.invoices.filter(
      (i) => i.studentId === student.id && i.month === selectedMonth && i.year === selectedYear
    );

    if (includeOtherClasses && studentInvsInMonth.length > 1) {
      const classList: InvoiceClassItem[] = studentInvsInMonth.map((otherInv) => {
        const cls =
          classes.find((c) => c.id === otherInv.classId) ||
          dataStore.classes.find((c) => c.id === otherInv.classId);
        const br = dataStore.branches.find((b) => b.id === cls?.branchId);
        return {
          className: cls?.name || "Lớp học",
          branchName: br?.name || "",
          presentCount: otherInv.presentCount,
          presentDates: getPresentDatesForStudent(student.id, otherInv.classId),
          feePerSession: otherInv.feePerSession,
          totalAmount: otherInv.totalAmount,
        };
      });
      const totalAmount = studentInvsInMonth.reduce((s, i) => s + i.totalAmount, 0);
      const totalPresent = studentInvsInMonth.reduce((s, i) => s + i.presentCount, 0);
      const allDates = classList.flatMap((c) => c.presentDates);
      const classNames = classList.map((c) => c.className).join(", ");

      const vietQrUrl =
        bank.useCustomQr && bank.customQrImage
          ? bank.customQrImage
          : generateVietQrUrl({
              bankId: bank.bankId,
              accountNo: bank.bankAccount,
              accountName: bank.accountHolder,
              template: (bank.qrTemplate as any) || "compact2",
              amount: totalAmount,
              description: transferContent,
            });

      return {
        studentCode: student.code,
        studentName: student.fullName,
        className: `Tổng hợp ${classList.length} lớp (${classNames})`,
        branchName: targetBranch?.name || "",
        month: selectedMonth,
        year: selectedYear,
        presentCount: totalPresent,
        presentDates: allDates,
        feePerSession: 0,
        totalAmount,
        bankName: bank.bankName,
        bankAccount: bank.bankAccount,
        accountHolder: bank.accountHolder,
        transferContent,
        vietQrUrl,
        classList,
      };
    }

    const vietQrUrl =
      bank.useCustomQr && bank.customQrImage
        ? bank.customQrImage
        : generateVietQrUrl({
            bankId: bank.bankId,
            accountNo: bank.bankAccount,
            accountName: bank.accountHolder,
            template: (bank.qrTemplate as any) || "compact2",
            amount: inv.totalAmount,
            description: transferContent,
          });

    return {
      studentCode: student.code,
      studentName: student.fullName,
      className: targetClass?.name || "",
      branchName: targetBranch?.name || "",
      month: selectedMonth,
      year: selectedYear,
      presentCount: inv.presentCount,
      presentDates: getPresentDatesForStudent(student.id, inv.classId),
      feePerSession: inv.feePerSession,
      totalAmount: inv.totalAmount,
      bankName: bank.bankName,
      bankAccount: bank.bankAccount,
      accountHolder: bank.accountHolder,
      transferContent,
      vietQrUrl,
    };
  };

  // Helper tạo dữ liệu thẻ học phí gộp cho học sinh học nhiều lớp
  const buildAggregatedInvoiceCardData = (agg: AggregatedStudentInvoice): InvoiceCardData => {
    const bank = dataStore.bankConfig;
    const primaryClass = agg.classItems[0];
    const classNames = agg.classItems.map((c) => c.className).join(", ");
    const allDates = agg.classItems.flatMap((c) => c.presentDates);

    return {
      studentCode: agg.studentCode,
      studentName: agg.studentName,
      className:
        agg.classItems.length === 1
          ? primaryClass.className
          : `Tổng hợp ${agg.classItems.length} lớp (${classNames})`,
      branchName: primaryClass?.branchName || "",
      month: selectedMonth,
      year: selectedYear,
      presentCount: agg.totalPresentCount,
      presentDates: allDates,
      feePerSession: agg.classItems.length === 1 ? primaryClass.feePerSession : 0,
      totalAmount: agg.totalAmount,
      bankName: bank.bankName,
      bankAccount: bank.bankAccount,
      accountHolder: bank.accountHolder,
      transferContent: agg.transferContent,
      vietQrUrl: agg.vietQrUrl,
      classList: agg.classItems.map((c) => ({
        className: c.className,
        branchName: c.branchName,
        presentCount: c.presentCount,
        presentDates: c.presentDates,
        feePerSession: c.feePerSession,
        totalAmount: c.totalAmount,
      })),
    };
  };

  // Modal Chỉnh Sửa Học Phí Riêng Cho Học Viên
  const [editingStudentFee, setEditingStudentFee] = useState<{
    student: StudentData;
    currentFee: number;
  } | null>(null);
  const [customFeeInput, setCustomFeeInput] = useState<string>("");

  const handleOpenEditFee = (student: StudentData, currentFee: number) => {
    setEditingStudentFee({ student, currentFee });
    setCustomFeeInput(
      student.customFeePerSession !== undefined && student.customFeePerSession !== null
        ? String(student.customFeePerSession)
        : String(currentFee)
    );
  };

  const handleSaveCustomFee = async (resetToDefault = false) => {
    if (!editingStudentFee) return;
    if (resetToDefault) {
      await dataStore.updateStudentFee(editingStudentFee.student.id, null);
    } else {
      const fee = Number(customFeeInput);
      await dataStore.updateStudentFee(editingStudentFee.student.id, fee);
    }
    reloadInvoices();
    setEditingStudentFee(null);
  };

  const isAllClasses = selectedClassId === "all";
  const selectedClass = isAllClasses ? null : (classes.find((c) => c.id === selectedClassId) || classes[0]);
  const branchInfo = selectedClass ? dataStore.branches.find((b) => b.id === selectedClass?.branchId) : null;

  // Load và tính toán hóa đơn
  const reloadInvoices = () => {
    dataStore.recalculateAllInvoices(selectedMonth, selectedYear);
    const coachClassIds = classes.map((c) => c.id);
    if (coachClassIds.length === 0) {
      setInvoices([]);
      return;
    }

    if (selectedClassId === "all") {
      const filtered = dataStore.invoices.filter(
        (inv) => coachClassIds.includes(inv.classId) && inv.month === selectedMonth && inv.year === selectedYear
      );
      setInvoices(filtered);
    } else {
      const targetId = selectedClassId || classes[0]?.id;
      const filtered = dataStore.invoices.filter(
        (inv) => inv.classId === targetId && inv.month === selectedMonth && inv.year === selectedYear
      );
      setInvoices(filtered);
    }
  };

  useEffect(() => {
    reloadInvoices();
  }, [selectedClassId, selectedMonth, selectedYear, classes]);

  // Tìm các buổi học của lớp trong tháng để lấy danh sách ngày có mặt
  const classSessions = dataStore.sessions.filter((sess) => {
    if (!isAllClasses && sess.classId !== selectedClass?.id) return false;
    if (isAllClasses && !classes.some((c) => c.id === sess.classId)) return false;
    const d = new Date(sess.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  const getPresentDatesForStudent = (studentId: string, specificClassId?: string): string[] => {
    const dates: string[] = [];
    const targetClassId = specificClassId || selectedClass?.id;
    const sessions = dataStore.sessions.filter((sess) => {
      if (targetClassId && sess.classId !== targetClassId) return false;
      const d = new Date(sess.date);
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });

    sessions.forEach((sess) => {
      const rec = sess.records.find((r) => r.studentId === studentId);
      if (rec && rec.status === "PRESENT") {
        const d = new Date(sess.date);
        dates.push(`${d.getDate()}/${d.getMonth() + 1}`);
      }
    });
    return dates;
  };

  // Toggle trạng thái Đã thanh toán / Chờ thanh toán cho 1 hóa đơn lẻ
  const togglePaymentStatus = (invoiceId: string) => {
    const inv = dataStore.invoices.find((i) => i.id === invoiceId);
    if (inv) {
      inv.status = inv.status === "PAID" ? "PENDING" : "PAID";
      reloadInvoices();
    }
  };

  // Toggle trạng thái Đã thanh toán cho toàn bộ hóa đơn của học sinh gộp
  const toggleAggregatedPaymentStatus = (agg: AggregatedStudentInvoice) => {
    const nextStatus = agg.status === "PAID" ? "PENDING" : "PAID";
    agg.invoiceIds.forEach((id) => {
      const inv = dataStore.invoices.find((i) => i.id === id);
      if (inv) inv.status = nextStatus;
    });
    dataStore.saveToLocalStorage();
    reloadInvoices();
  };

  // Mở VietQR Modal cho hóa đơn đơn lẻ
  const handleOpenVietQr = (inv: MonthlyInvoiceData, student: StudentData) => {
    const bank = dataStore.bankConfig;
    const cardData = buildInvoiceCardData(inv, student, preferConsolidatedCards);
    setActiveQrData({
      studentName: student.fullName,
      studentCode: student.code,
      amount: cardData.totalAmount,
      month: selectedMonth,
      year: selectedYear,
      qrUrl: cardData.vietQrUrl,
      transferContent: cardData.transferContent,
      bankName: bank.bankName,
      bankAccount: bank.bankAccount,
      accountHolder: bank.accountHolder,
    });
    setVietQrModalOpen(true);
  };

  // Mở VietQR Modal cho học viên gộp nhiều lớp
  const handleOpenAggregatedVietQr = (agg: AggregatedStudentInvoice) => {
    const bank = dataStore.bankConfig;
    setActiveQrData({
      studentName: agg.studentName,
      studentCode: agg.studentCode,
      amount: agg.totalAmount,
      month: selectedMonth,
      year: selectedYear,
      qrUrl: agg.vietQrUrl,
      transferContent: agg.transferContent,
      bankName: bank.bankName,
      bankAccount: bank.bankAccount,
      accountHolder: bank.accountHolder,
    });
    setVietQrModalOpen(true);
  };

  // Danh sách học viên gộp nhiều lớp khi xem Toàn bộ các lớp
  const aggregatedInvoices: AggregatedStudentInvoice[] = useMemo(() => {
    if (!isAllClasses) return [];
    const bank = dataStore.bankConfig;
    const studentMap = new Map<string, AggregatedStudentInvoice>();

    invoices.forEach((inv) => {
      const student = dataStore.students.find((s) => s.id === inv.studentId);
      if (!student) return;

      const targetClass = classes.find((c) => c.id === inv.classId);
      const targetBranch = dataStore.branches.find((b) => b.id === targetClass?.branchId);
      const presentDates = getPresentDatesForStudent(student.id, inv.classId);

      const classItem = {
        invoiceId: inv.id,
        classId: inv.classId,
        className: targetClass?.name || "Lớp học",
        branchName: targetBranch?.name || "",
        presentCount: inv.presentCount,
        presentDates,
        feePerSession: inv.feePerSession,
        totalAmount: inv.totalAmount,
        status: inv.status,
        zaloSentAt: inv.zaloSentAt,
      };

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          studentId: student.id,
          student,
          studentCode: student.code || "HS",
          studentName: student.fullName,
          parentPhone: student.parentPhone || "",
          classItems: [classItem],
          totalPresentCount: inv.presentCount,
          totalAmount: inv.totalAmount,
          status: inv.status,
          invoiceIds: [inv.id],
          zaloSentAt: inv.zaloSentAt,
          vietQrUrl: "",
          transferContent: `HP ${student.code || "HS"} T${selectedMonth}`,
        });
      } else {
        const existing = studentMap.get(student.id)!;
        existing.classItems.push(classItem);
        existing.totalPresentCount += inv.presentCount;
        existing.totalAmount += inv.totalAmount;
        existing.invoiceIds.push(inv.id);
        if (inv.status === "PENDING") {
          existing.status = "PENDING";
        }
        if (inv.zaloSentAt && (!existing.zaloSentAt || inv.zaloSentAt > existing.zaloSentAt)) {
          existing.zaloSentAt = inv.zaloSentAt;
        }
      }
    });

    const result = Array.from(studentMap.values());
    result.forEach((item) => {
      item.vietQrUrl =
        bank.useCustomQr && bank.customQrImage
          ? bank.customQrImage
          : generateVietQrUrl({
              bankId: bank.bankId,
              accountNo: bank.bankAccount,
              accountName: bank.accountHolder,
              template: "compact2",
              amount: item.totalAmount,
              description: item.transferContent,
            });
    });

    return result;
  }, [isAllClasses, invoices, classes, selectedMonth, selectedYear]);

  // Bộ lọc tìm kiếm cho danh sách gộp
  const filteredAggregatedInvoices = useMemo(() => {
    if (!isAllClasses) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return aggregatedInvoices;
    return aggregatedInvoices.filter((agg) => {
      return (
        agg.studentName.toLowerCase().includes(term) ||
        agg.studentCode.toLowerCase().includes(term) ||
        agg.parentPhone.includes(term) ||
        agg.classItems.some((c) => c.className.toLowerCase().includes(term))
      );
    });
  }, [isAllClasses, aggregatedInvoices, searchTerm]);

  // Xuất file Excel (thông minh: gộp khi chọn Tất cả các lớp)
  const handleExportExcel = () => {
    if (isAllClasses) {
      const rows: InvoiceExportRow[] = aggregatedInvoices.map((agg, idx) => ({
        stt: idx + 1,
        studentCode: agg.studentCode,
        fullName: `${agg.studentName} [${agg.classItems.map((c) => `${c.className} (${c.presentCount}b)`).join(" + ")}]`,
        birthYear: agg.student?.birthYear || 0,
        parentPhone: agg.parentPhone,
        presentCount: agg.totalPresentCount,
        feePerSession: agg.classItems.length === 1 ? agg.classItems[0].feePerSession : 0,
        totalAmount: agg.totalAmount,
        statusText: agg.status === "PAID" ? "Đã thanh toán" : "Chờ thanh toán",
      }));

      exportInvoicesToExcel(
        rows,
        `Tat_Ca_${classes.length}_Lop_Tong_Hop`,
        selectedMonth,
        selectedYear
      );
      return;
    }

    const rows: InvoiceExportRow[] = invoices.map((inv, idx) => {
      const student = dataStore.students.find((s) => s.id === inv.studentId);
      return {
        stt: idx + 1,
        studentCode: student?.code || "",
        fullName: student?.fullName || "",
        birthYear: student?.birthYear || 0,
        parentPhone: student?.parentPhone || "",
        presentCount: inv.presentCount,
        feePerSession: inv.feePerSession,
        totalAmount: inv.totalAmount,
        statusText: inv.status === "PAID" ? "Đã thanh toán" : "Chờ thanh toán",
      };
    });

    exportInvoicesToExcel(
      rows,
      selectedClass?.name || "Lop_Co_Vua",
      selectedMonth,
      selectedYear
    );
  };

  // Tính tổng
  const totalDue = isAllClasses
    ? aggregatedInvoices.reduce((sum, agg) => sum + agg.totalAmount, 0)
    : invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalPaid = isAllClasses
    ? aggregatedInvoices.filter((i) => i.status === "PAID").reduce((sum, agg) => sum + agg.totalAmount, 0)
    : invoices.filter((i) => i.status === "PAID").reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalPending = totalDue - totalPaid;

  const filteredInvoices = invoices.filter((inv) => {
    const student = dataStore.students.find((s) => s.id === inv.studentId);
    if (!student) return false;
    return (
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentPhone.includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Tổng Kết Học Phí
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Học phí = (Số buổi Có mặt thực tế) × (Đơn giá/buổi). Tự động sinh mã VietQR và xuất ảnh thẻ PNG gửi phụ huynh.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Cài Đặt QR & Zalo cho HLV */}
          <Link
            href="/coach/settings"
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition-all"
            title="Cài đặt tài khoản ngân hàng nhận học phí VietQR và mẫu tin nhắn Zalo"
          >
            <Settings className="h-4 w-4 text-emerald-600" />
            <span>Cài Đặt QR & Zalo</span>
          </Link>

          {/* Nút Xuất Hàng Loạt Ảnh Thẻ PNG */}
          <button
            onClick={() => setBatchExportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2.5 text-xs font-black text-emerald-800 shadow-sm transition-all active:scale-95"
            title="Xuất hàng loạt ảnh thẻ học phí định dạng PNG thành file nén .ZIP hoặc từng ảnh"
          >
            <FileImage className="h-4 w-4 text-emerald-600" />
            <span>Xuất Ảnh Thẻ (PNG)</span>
          </button>

          {/* Nút tải trực tiếp Tool EXE & ZIP */}
          <div className="inline-flex rounded-xl shadow-md">
            <a
              href="/api/tool/download"
              download="Zalo_Bulk_Sender.exe"
              className="flex items-center gap-1.5 rounded-l-xl border border-amber-400/60 bg-amber-500 hover:bg-amber-600 px-3.5 py-2.5 text-xs font-black text-slate-950 active:scale-95 transition-all"
              title="Tải trực tiếp phần mềm Zalo_Bulk_Sender.exe"
            >
              <Download className="h-4 w-4" />
              <span>Tải Tool (.exe)</span>
            </a>
            <a
              href="/api/tool/download?format=zip"
              download="Zalo_Bulk_Sender.zip"
              className="flex items-center rounded-r-xl border-y border-r border-amber-400/60 bg-amber-600 hover:bg-amber-500 px-2.5 py-2.5 text-[11px] font-black text-slate-950 active:scale-95 transition-all"
              title="Tải bản nén (.zip) dự phòng nếu máy tính chặn tải file .exe"
            >
              <span>.ZIP</span>
            </a>
          </div>

          {/* Nút Mở Tool Gửi Thẻ Học Phí */}
          <button
            onClick={() => {
              setSelectedStudentForParentModal(undefined);
              setZaloParentModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
            title="Mở hướng dẫn & nạp dữ liệu vào phần mềm Zalo Bulk Sender"
          >
            <Send className="h-4 w-4" />
            <span>Gửi Bằng Tool Zalo (EXE)</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl bg-brand-secondary px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-secondary/20 hover:bg-brand-secondary-hover transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-soft">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-brand-primary shadow-sm">
            <DollarSign className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">
            Bạn chưa có lớp học nào để tổng kết học phí
          </h2>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Hệ thống không hiển thị hóa đơn học phí mẫu đối với tài khoản thật của bạn. Vui lòng tạo lớp học và điểm danh học sinh để sinh hóa đơn theo nguyên tắc Thực học - Thực trả.
          </p>
          <a
            href="/coach/classes"
            className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3 text-xs font-bold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-primary-hover active:scale-95 transition-all"
          >
            <GraduationCap className="h-4 w-4" />
            <span>Đến Quản Lý Lớp Học</span>
          </a>
        </div>
      ) : (
        <>
          {/* Filter and Class selector */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 sm:grid-cols-4">
            {/* Lớp */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Lớp học</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
              >
                <option value="all">
                  🌟 Tất cả các lớp ({classes.length} lớp học)
                </option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.level}) — {cls.schedule}
                  </option>
                ))}
              </select>
        </div>

        {/* Tháng */}
        <div>
          <label className="text-xs font-bold text-slate-700">Tháng tổng kết</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>

        {/* Năm */}
        <div>
          <label className="text-xs font-bold text-slate-700">Năm</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
          >
            <option value={2026}>Năm 2026</option>
            <option value={2025}>Năm 2025</option>
          </select>
        </div>
      </div>

      {/* Tùy chọn gộp phiếu thu cho học viên học nhiều lớp khi xem riêng từng lớp */}
      {!isAllClasses && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 p-3 sm:px-4 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-700 shrink-0" />
            <div>
              <span className="text-slate-900 font-bold">
                Học viên học nhiều lớp:
              </span>{" "}
              <span className="text-slate-600 text-[11.5px]">
                {preferConsolidatedCards
                  ? "Đang bật chế độ Gộp đủ các lớp (Thẻ học phí & VietQR tổng hợp 1 lần đóng cho phụ huynh)."
                  : "Đang bật chế độ Tách riêng từng lớp (Thẻ học phí & VietQR chỉ tính riêng buổi của lớp này)."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-emerald-200 shadow-xs self-start sm:self-center">
            <button
              type="button"
              onClick={() => setPreferConsolidatedCards(true)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                preferConsolidatedCards
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Khi bấm tải ảnh hoặc xem QR, tự động gộp cả các lớp khác của học sinh đó"
            >
              ✓ Gộp đủ các lớp
            </button>
            <button
              type="button"
              onClick={() => setPreferConsolidatedCards(false)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                !preferConsolidatedCards
                  ? "bg-slate-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Chỉ xuất phiếu thu riêng của lớp này"
            >
              Tách riêng lớp này
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Tổng Học Phí Phải Thu (Thực học)</p>
          <p className="mt-1.5 text-2xl font-black text-slate-900">
            {formatCurrencyVND(totalDue)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {isAllClasses
              ? `Toàn bộ ${classes.length} lớp học • ${aggregatedInvoices.length} học viên (${invoices.length} lượt học viên)`
              : `Tính trên ${invoices.length} học viên • Đơn giá ${formatCurrencyVND(selectedClass?.feePerSession || 0)}/b`}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Đã Thanh Toán</p>
          <p className="mt-1.5 text-2xl font-black text-brand-primary">
            {formatCurrencyVND(totalPaid)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {isAllClasses
                ? `${aggregatedInvoices.filter((i) => i.status === "PAID").length} / ${aggregatedInvoices.length} học viên đã hoàn tất`
                : `${invoices.filter((i) => i.status === "PAID").length} / ${invoices.length} học viên đã hoàn tất`}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Chưa Thanh Toán (Còn nợ)</p>
          <p className="mt-1.5 text-2xl font-black text-brand-secondary">
            {formatCurrencyVND(totalPending)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {isAllClasses
                ? `${aggregatedInvoices.filter((i) => i.status === "PENDING").length} học viên chờ thanh toán`
                : `${invoices.filter((i) => i.status === "PENDING").length} học viên chờ thanh toán`}
            </span>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Bảng Kê Chi Tiết Học Phí Tháng {selectedMonth}/{selectedYear}
            </h3>
            <p className="text-xs text-slate-500">
              {isAllClasses
                ? `Toàn bộ ${classes.length} lớp học của Huấn luyện viên`
                : `${selectedClass?.name} (${branchInfo?.name || "Cơ sở"})`}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học viên, SĐT..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-brand-primary focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Mobile Invoice Cards (< sm) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {isAllClasses ? (
            // Mobile: Chế độ Toàn Bộ Các Lớp (Gộp theo học viên)
            filteredAggregatedInvoices.map((agg) => {
              const isPaid = agg.status === "PAID";
              return (
                <div key={agg.studentId} className="p-3.5 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {agg.studentCode}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{agg.studentName}</h4>
                        {agg.classItems.length > 1 && (
                          <span className="rounded bg-teal-100 text-teal-800 px-1.5 py-0.2 text-[9.5px] font-extrabold border border-teal-200">
                            Học {agg.classItems.length} lớp
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agg.classItems.map((c) => (
                          <span key={c.classId} className="rounded bg-emerald-50 text-emerald-800 px-1.5 py-0.2 text-[9.5px] font-bold border border-emerald-200">
                            {c.className} ({c.presentCount}b)
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-1">
                        SĐT: {agg.parentPhone}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleAggregatedPaymentStatus(agg)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all shadow-sm ${
                        isPaid
                          ? "bg-emerald-100 text-brand-primary active:bg-emerald-200"
                          : "bg-amber-100 text-amber-800 active:bg-amber-200"
                      }`}
                    >
                      {isPaid ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      <span>{isPaid ? "Đã đóng" : "Chờ đóng"}</span>
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2">
                    <div>
                      <span className="text-[10px] text-slate-400">Tổng buổi học: </span>
                      <span className="text-xs font-bold text-slate-700">
                        {agg.totalPresentCount} buổi
                      </span>
                      {agg.classItems.length > 1 && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({agg.classItems.map((c) => `${c.presentCount}b`).join(" + ")})
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-black text-brand-primary">
                      {formatCurrencyVND(agg.totalAmount)}
                    </span>
                  </div>

                  {/* Quick Action Buttons on Mobile */}
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenAggregatedVietQr(agg)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-50 py-2 text-[11px] font-bold text-brand-primary border border-emerald-200 active:bg-emerald-100"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Mã QR</span>
                    </button>
                    <button
                      onClick={() => downloadInvoiceCardPng(buildAggregatedInvoiceCardData(agg))}
                      className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 py-2 text-[11px] font-bold text-slate-700 border border-slate-200 active:bg-slate-200"
                      title="Tải ảnh PNG thẻ học phí gộp"
                    >
                      <FileImage className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Ảnh PNG</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStudentForParentModal(agg.studentId);
                        setZaloParentModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-50 py-2 text-[11px] font-bold text-emerald-800 border border-emerald-200 active:bg-emerald-100"
                    >
                      <Send className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Tool Zalo</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            // Mobile: Chế độ Lớp Đơn lẻ
            filteredInvoices.map((inv) => {
              const student = dataStore.students.find((s) => s.id === inv.studentId);
              const isPaid = inv.status === "PAID";
              const otherInvs = student
                ? dataStore.invoices.filter(
                    (o) =>
                      o.studentId === student.id &&
                      o.classId !== inv.classId &&
                      o.month === selectedMonth &&
                      o.year === selectedYear
                  )
                : [];

              return (
                <div key={inv.id} className="p-3.5 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {student?.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{student?.fullName}</h4>
                        {otherInvs.length > 0 && (
                          <span className="rounded bg-teal-100 text-teal-800 px-1.5 py-0.2 text-[9.5px] font-extrabold border border-teal-200">
                            Học {1 + otherInvs.length} lớp
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        SĐT: {student?.parentPhone}
                      </p>
                    </div>

                    <button
                      onClick={() => togglePaymentStatus(inv.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all shadow-sm ${
                        isPaid
                          ? "bg-emerald-100 text-brand-primary active:bg-emerald-200"
                          : "bg-amber-100 text-amber-800 active:bg-amber-200"
                      }`}
                    >
                      {isPaid ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      <span>{isPaid ? "Đã đóng" : "Chờ đóng"}</span>
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2">
                    <div>
                      <span className="text-[10px] text-slate-400">Đã học: </span>
                      <span className="text-xs font-bold text-slate-700">
                        {inv.presentCount} / {classSessions.length} buổi
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({formatCurrencyVND(inv.feePerSession)}/b)
                      </span>
                    </div>
                    <span className="text-sm font-black text-brand-primary">
                      {formatCurrencyVND(inv.totalAmount)}
                    </span>
                  </div>

                  {/* Quick Action Buttons on Mobile */}
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => student && handleOpenVietQr(inv, student)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-50 py-2 text-[11px] font-bold text-brand-primary border border-emerald-200 active:bg-emerald-100"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Mã QR</span>
                    </button>
                    <button
                      onClick={() => student && downloadInvoiceCardPng(buildInvoiceCardData(inv, student, preferConsolidatedCards))}
                      className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 py-2 text-[11px] font-bold text-slate-700 border border-slate-200 active:bg-slate-200"
                      title="Tải ảnh PNG thẻ học phí"
                    >
                      <FileImage className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Ảnh PNG</span>
                    </button>
                    <button
                      onClick={() => {
                        if (student) {
                          setSelectedStudentForParentModal(student.id);
                          setZaloParentModalOpen(true);
                        }
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl bg-emerald-50 py-2 text-[11px] font-bold text-emerald-800 border border-emerald-200 active:bg-emerald-100"
                    >
                      <Send className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Tool Zalo</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {((isAllClasses && filteredAggregatedInvoices.length === 0) ||
            (!isAllClasses && filteredInvoices.length === 0)) && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Chưa có dữ liệu học phí cho lớp này.
            </div>
          )}
        </div>

        {/* Desktop Table (sm and up) */}
        <div className="hidden sm:block overflow-x-auto">
          {isAllClasses ? (
            // Bảng Desktop: Chế độ Toàn Bộ Các Lớp (Gộp học sinh 1 dòng duy nhất)
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã HV</th>
                  <th className="px-4 py-3">Họ và Tên</th>
                  <th className="px-4 py-3">Các Lớp Theo Học</th>
                  <th className="px-4 py-3">Số Điện Thoại</th>
                  <th className="px-4 py-3 text-center">Tổng Buổi Học</th>
                  <th className="px-4 py-3">Chi Tiết Ngày / Lớp</th>
                  <th className="px-4 py-3 text-right">Đơn Giá Từng Lớp</th>
                  <th className="px-4 py-3 text-right">Tổng Học Phí</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAggregatedInvoices.map((agg) => {
                  return (
                    <tr key={agg.studentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        {agg.studentCode}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{agg.studentName}</span>
                          {agg.classItems.length > 1 && (
                            <span className="rounded bg-teal-100 text-teal-800 px-1.5 py-0.5 text-[9.5px] font-extrabold border border-teal-200">
                              Học {agg.classItems.length} lớp
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {agg.classItems.map((c) => (
                            <span
                              key={c.classId}
                              className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-brand-primary border border-emerald-200"
                            >
                              {c.className} ({c.presentCount}b)
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {agg.parentPhone}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-extrabold text-brand-primary border border-emerald-200">
                          {agg.totalPresentCount} buổi
                        </span>
                        {agg.classItems.length > 1 && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            ({agg.classItems.map((c) => `${c.presentCount}b`).join(" + ")})
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 max-w-[220px]">
                        <div className="space-y-1">
                          {agg.classItems.map((c) => (
                            <div key={c.classId} className="truncate" title={`${c.className}: ${c.presentDates.join(", ")}`}>
                              <strong className="text-slate-800">{c.className}:</strong>{" "}
                              {c.presentDates.length > 0 ? c.presentDates.join(", ") : "Chưa có"}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {agg.classItems.length === 1 ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-bold text-slate-800">
                              {formatCurrencyVND(agg.classItems[0].feePerSession)}
                            </span>
                            <button
                              onClick={() => handleOpenEditFee(agg.student, agg.classItems[0].feePerSession)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-primary transition-colors"
                              title="Sửa đơn giá học phí"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-0.5 text-[10.5px]">
                            {agg.classItems.map((c) => (
                              <div key={c.classId} className="text-slate-600 font-medium">
                                {formatCurrencyVND(c.feePerSession)}/b
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                        {formatCurrencyVND(agg.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAggregatedPaymentStatus(agg)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                            agg.status === "PAID"
                              ? "bg-emerald-100 text-brand-primary hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title="Bấm để đổi trạng thái tất cả các lớp của học sinh này"
                        >
                          {agg.status === "PAID" ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Đã đóng</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Chờ đóng</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Nút VietQR Gộp */}
                          <button
                            onClick={() => handleOpenAggregatedVietQr(agg)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-brand-primary transition-colors hover:bg-emerald-100"
                            title="Xem mã VietQR tổng hợp đủ các lớp của học viên này"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>

                          {/* Nút Tải Ảnh Thẻ Gộp */}
                          <button
                            onClick={() => downloadInvoiceCardPng(buildAggregatedInvoiceCardData(agg))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                            title="Tải 1 ảnh PNG thẻ học phí tổng hợp đủ các lớp của em này"
                          >
                            <FileImage className="h-3.5 w-3.5 text-emerald-600" />
                          </button>

                          {/* Nút Gửi Qua Tool Zalo */}
                          <button
                            onClick={() => {
                              setSelectedStudentForParentModal(agg.studentId);
                              setZaloParentModalOpen(true);
                            }}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-xs transition-all active:scale-95 ${
                              agg.zaloSentAt
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                            title={
                              agg.zaloSentAt
                                ? `Đã gửi qua Tool lúc ${new Date(agg.zaloSentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}. Bấm để xem.`
                                : "Mở Tool Zalo để gửi thẻ học phí tổng hợp cho phụ huynh em này"
                            }
                          >
                            {agg.zaloSentAt ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span>Đã gửi Tool</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                <span>Tool Zalo</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredAggregatedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Chưa có dữ liệu học phí trong tháng {selectedMonth}/{selectedYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            // Bảng Desktop: Chế độ Lớp Đơn lẻ
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã HV</th>
                  <th className="px-4 py-3">Họ và Tên</th>
                  <th className="px-4 py-3">Số Điện Thoại</th>
                  <th className="px-4 py-3 text-center">Buổi Có Mặt</th>
                  <th className="px-4 py-3">Ngày Đi Học</th>
                  <th className="px-4 py-3 text-right">Đơn Giá</th>
                  <th className="px-4 py-3 text-right">Tổng Học Phí</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const student = dataStore.students.find((s) => s.id === inv.studentId);
                  const presentDates = student ? getPresentDatesForStudent(student.id, inv.classId) : [];
                  const otherInvs = student
                    ? dataStore.invoices.filter(
                        (o) =>
                          o.studentId === student.id &&
                          o.classId !== inv.classId &&
                          o.month === selectedMonth &&
                          o.year === selectedYear
                      )
                    : [];

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        {student?.code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{student?.fullName}</span>
                          {otherInvs.length > 0 && (
                            <span
                              className="rounded bg-teal-50 text-teal-700 px-1.5 py-0.5 text-[9.5px] font-extrabold border border-teal-200"
                              title={`Học sinh này còn tham gia ${otherInvs.length} lớp khác trong tháng`}
                            >
                              Học {1 + otherInvs.length} lớp
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-800">{student?.parentPhone}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-extrabold text-brand-primary border border-emerald-200">
                          {inv.presentCount} / {classSessions.length} buổi
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        {presentDates.length > 0 ? presentDates.join(", ") : "Chưa có"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{formatCurrencyVND(inv.feePerSession)}</p>
                            {student?.customFeePerSession !== undefined && student?.customFeePerSession !== null ? (
                              <span className="inline-block rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200">
                                Giá riêng
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Giá lớp</span>
                            )}
                          </div>
                          <button
                            onClick={() => student && handleOpenEditFee(student, inv.feePerSession)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-primary transition-colors"
                            title="Sửa đơn giá học phí cho học viên này"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                        {formatCurrencyVND(inv.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => togglePaymentStatus(inv.id)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                            inv.status === "PAID"
                              ? "bg-emerald-100 text-brand-primary hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title="Bấm để đổi trạng thái"
                        >
                          {inv.status === "PAID" ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Đã đóng</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Chờ đóng</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Nút VietQR */}
                          <button
                            onClick={() => student && handleOpenVietQr(inv, student)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-brand-primary transition-colors hover:bg-emerald-100"
                            title={
                              otherInvs.length > 0 && preferConsolidatedCards
                                ? "Xem mã VietQR tổng hợp đủ các lớp của em này"
                                : "Xem mã VietQR riêng lớp này"
                            }
                          >
                            <QrCode className="h-4 w-4" />
                          </button>

                          {/* Nút Tải Ảnh Thẻ Học Phí PNG */}
                          <button
                            onClick={() => student && downloadInvoiceCardPng(buildInvoiceCardData(inv, student, preferConsolidatedCards))}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                            title={
                              otherInvs.length > 0 && preferConsolidatedCards
                                ? "Tải ảnh thẻ PNG tổng hợp đủ các lớp của em này"
                                : "Tải ảnh thẻ PNG riêng lớp này"
                            }
                          >
                            <FileImage className="h-3.5 w-3.5 text-emerald-600" />
                          </button>

                          {/* Nút Gửi Qua Tool Zalo */}
                          <button
                            onClick={() => {
                              if (student) {
                                setSelectedStudentForParentModal(student.id);
                                setZaloParentModalOpen(true);
                              }
                            }}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-xs transition-all active:scale-95 ${
                              inv.zaloSentAt
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                            title={
                              inv.zaloSentAt
                                ? `Đã gửi qua Tool lúc ${new Date(inv.zaloSentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}. Bấm để xem.`
                                : "Mở Tool Zalo để gửi thẻ học phí cho phụ huynh em này"
                            }
                          >
                            {inv.zaloSentAt ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span>Đã gửi Tool</span>
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                <span>Tool Zalo</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Chưa có dữ liệu học phí cho lớp này trong tháng {selectedMonth}/{selectedYear}. Khi HLV thực hiện điểm danh học viên, hệ thống sẽ tự động tính học phí theo nguyên tắc Thực học - Thực trả.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )}

      {/* Modal Điều Chỉnh Học Phí Riêng Học Viên */}
      {editingStudentFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-slate-200 ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-brand-primary">
                  <DollarSign className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Điều Chỉnh Học Phí Học Viên
                </h3>
              </div>
              <button
                onClick={() => setEditingStudentFee(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <p className="font-bold text-slate-900 text-sm">
                  {editingStudentFee.student.fullName} ({editingStudentFee.student.code})
                </p>
                <p className="mt-1 text-slate-500">
                  Lớp: <strong className="text-slate-800">{selectedClass?.name}</strong> • Đơn giá chuẩn của lớp: <strong className="text-brand-primary">{formatCurrencyVND(selectedClass?.feePerSession || 150000)}/buổi</strong>
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700">
                  Đơn giá học phí áp dụng cho học viên này (VNĐ / buổi)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="10000"
                    value={customFeeInput}
                    onChange={(e) => setCustomFeeInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 pr-8 text-sm font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                  <span className="pointer-events-none absolute right-3 top-2.5 font-bold text-slate-400">
                    đ
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Áp dụng cho trường hợp học bổng, ưu đãi anh/chị em, hoặc đơn giá kèm riêng.
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveCustomFee(false)}
                  className="w-full rounded-xl bg-brand-primary py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95"
                >
                  Lưu Đơn Giá Riêng Cho Học Viên
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCustomFee(true)}
                  className="w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Đặt Lại Theo Giá Chung Của Lớp ({formatCurrencyVND(selectedClass?.feePerSession || 150000)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeQrData && (
        <VietQrModal
          isOpen={vietQrModalOpen}
          onClose={() => setVietQrModalOpen(false)}
          studentName={activeQrData.studentName}
          studentCode={activeQrData.studentCode}
          amount={activeQrData.amount}
          month={activeQrData.month}
          year={activeQrData.year}
          qrUrl={activeQrData.qrUrl}
          transferContent={activeQrData.transferContent}
          bankName={activeQrData.bankName}
          bankAccount={activeQrData.bankAccount}
          accountHolder={activeQrData.accountHolder}
        />
      )}

      {/* Modal HLV Gửi Thẻ Học Phí Bằng Tool Zalo EXE */}
      <ZaloParentSenderModal
        isOpen={zaloParentModalOpen}
        onClose={() => setZaloParentModalOpen(false)}
        classroom={
          selectedClass || {
            id: "all",
            name: "Toàn bộ các lớp",
            level: "Tất cả",
            feePerSession: 0,
            schedule: "",
            branchId: "",
            coachId: currentCoachId,
            isActive: true,
            shareWithAdmin: true,
          }
        }
        branch={branchInfo || null}
        month={selectedMonth}
        year={selectedYear}
        initialStudentId={selectedStudentForParentModal}
        onSentSuccess={reloadInvoices}
        students={
          isAllClasses
            ? aggregatedInvoices.map((agg) => {
                const primaryClass = agg.classItems[0];
                const classNames = agg.classItems.map((c) => c.className).join(", ");
                return {
                  invoiceId: agg.invoiceIds[0] || "",
                  studentId: agg.studentId,
                  studentCode: agg.studentCode,
                  studentName: agg.studentName,
                  parentName: agg.student?.parentName || "",
                  parentPhone: agg.parentPhone,
                  cleanParentPhone: agg.parentPhone.replace(/[^0-9]/g, ""),
                  className:
                    agg.classItems.length === 1
                      ? primaryClass?.className || "Lớp học"
                      : `Tổng hợp ${agg.classItems.length} lớp (${classNames})`,
                  branchName: primaryClass?.branchName || "",
                  month: selectedMonth,
                  year: selectedYear,
                  presentCount: agg.totalPresentCount,
                  presentDates: agg.classItems.flatMap((c) => c.presentDates),
                  feePerSession: agg.classItems.length === 1 ? primaryClass?.feePerSession || 0 : 0,
                  totalAmount: agg.totalAmount,
                  status: agg.status,
                  zaloSentAt: agg.zaloSentAt,
                  transferContent: agg.transferContent,
                  vietQrUrl: agg.vietQrUrl,
                  bankName: dataStore.bankConfig.bankName,
                  bankAccount: dataStore.bankConfig.bankAccount,
                  accountHolder: dataStore.bankConfig.accountHolder,
                  classList: agg.classItems.map((c) => ({
                    className: c.className,
                    branchName: c.branchName,
                    presentCount: c.presentCount,
                    presentDates: c.presentDates,
                    feePerSession: c.feePerSession,
                    totalAmount: c.totalAmount,
                  })),
                };
              })
            : invoices.map((inv) => {
                const student = dataStore.students.find((s) => s.id === inv.studentId);
                const cardData = student
                  ? buildInvoiceCardData(inv, student, preferConsolidatedCards)
                  : null;

                return {
                  invoiceId: inv.id,
                  studentId: student?.id || "",
                  studentCode: student?.code || "HS",
                  studentName: student?.fullName || "Học viên",
                  parentName: student?.parentName || "",
                  parentPhone: student?.parentPhone || "",
                  cleanParentPhone: (student?.parentPhone || "").replace(/[^0-9]/g, ""),
                  className: cardData?.className || selectedClass?.name || "",
                  branchName: branchInfo?.name || "",
                  month: selectedMonth,
                  year: selectedYear,
                  presentCount: cardData?.presentCount ?? inv.presentCount,
                  presentDates: cardData?.presentDates || getPresentDatesForStudent(student?.id || ""),
                  feePerSession: cardData?.feePerSession ?? inv.feePerSession,
                  totalAmount: cardData?.totalAmount ?? inv.totalAmount,
                  status: inv.status,
                  zaloSentAt: inv.zaloSentAt,
                  transferContent: cardData?.transferContent || `HP ${student?.code || "HS"} T${selectedMonth}`,
                  vietQrUrl: cardData?.vietQrUrl || "",
                  bankName: dataStore.bankConfig.bankName,
                  bankAccount: dataStore.bankConfig.bankAccount,
                  accountHolder: dataStore.bankConfig.accountHolder,
                  classList: cardData?.classList,
                };
              })
        }
      />

      {/* Modal Xuất Hàng Loạt Ảnh Thẻ Học Phí PNG / ZIP */}
      <BatchCardExportModal
        isOpen={batchExportModalOpen}
        onClose={() => setBatchExportModalOpen(false)}
        className={isAllClasses ? `Toàn_Bộ_${classes.length}_Lớp` : (selectedClass?.name || "Lớp học")}
        month={selectedMonth}
        year={selectedYear}
        students={
          isAllClasses
            ? aggregatedInvoices.map((agg) => buildAggregatedInvoiceCardData(agg))
            : (invoices
                .map((inv) => {
                  const st = dataStore.students.find((s) => s.id === inv.studentId);
                  return st ? buildInvoiceCardData(inv, st, preferConsolidatedCards) : null;
                })
                .filter(Boolean) as InvoiceCardData[])
        }
      />
    </div>
  );
}

export default function CoachInvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Đang tải dữ liệu học phí...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}

