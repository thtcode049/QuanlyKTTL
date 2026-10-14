"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { ZaloStudentInvoicePayload } from "@/lib/zalo";
import VietQrModal from "@/components/vietqr-modal";
import ZaloSimulatorModal from "@/components/zalo-simulator";
import ZaloParentSenderModal, { StudentParentInvoiceItem } from "@/components/zalo-parent-sender-modal";

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
    let isAdmin = false;
    let coachEmail = "";
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) coachId = u.id;
        if (u.email) coachEmail = u.email;
        if (u.role === "ADMIN" || u.hasAdminAccess) isAdmin = true;
      } catch (e) {}
    }
    setCurrentCoachId(coachId);

    const updateDisplay = () => {
      const myClasses = isAdmin
        ? dataStore.classes
        : getCoachClasses(coachId, coachEmail);
      setClasses(myClasses);
      const paramClassId = searchParams.get("classId");
      if (paramClassId && myClasses.some((c) => c.id === paramClassId)) {
        setSelectedClassId(paramClassId);
      } else {
        setSelectedClassId((prev) => (myClasses.some((c) => c.id === prev) ? prev : myClasses[0]?.id || ""));
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

  // Modal Zalo Simulator State
  const [zaloModalOpen, setZaloModalOpen] = useState(false);
  const [activeZaloPayload, setActiveZaloPayload] = useState<ZaloStudentInvoicePayload | null>(null);

  // Modal HLV Gửi Thẻ Học Phí Đến Phụ Huynh
  const [zaloParentModalOpen, setZaloParentModalOpen] = useState(false);
  const [selectedStudentForParentModal, setSelectedStudentForParentModal] = useState<string | undefined>(undefined);

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

  const handleSaveCustomFee = (resetToDefault = false) => {
    if (!editingStudentFee) return;
    if (resetToDefault) {
      dataStore.updateStudentFee(editingStudentFee.student.id, null);
    } else {
      const fee = Number(customFeeInput);
      dataStore.updateStudentFee(editingStudentFee.student.id, fee);
    }
    reloadInvoices();
    setEditingStudentFee(null);
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const branchInfo = dataStore.branches.find((b) => b.id === selectedClass?.branchId);

  // Load và tính toán hóa đơn
  const reloadInvoices = () => {
    dataStore.recalculateAllInvoices(selectedMonth, selectedYear);
    if (!selectedClass) {
      setInvoices([]);
      return;
    }
    const filtered = dataStore.invoices.filter(
      (inv) => inv.classId === selectedClass?.id && inv.month === selectedMonth && inv.year === selectedYear
    );
    setInvoices(filtered);
  };

  useEffect(() => {
    reloadInvoices();
  }, [selectedClassId, selectedMonth, selectedYear, classes]);

  // Tìm các buổi học của lớp trong tháng để lấy danh sách ngày có mặt
  const classSessions = dataStore.sessions.filter((sess) => {
    if (sess.classId !== selectedClass?.id) return false;
    const d = new Date(sess.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  const getPresentDatesForStudent = (studentId: string): string[] => {
    const dates: string[] = [];
    classSessions.forEach((sess) => {
      const rec = sess.records.find((r) => r.studentId === studentId);
      if (rec && rec.status === "PRESENT") {
        const d = new Date(sess.date);
        dates.push(`${d.getDate()}/${d.getMonth() + 1}`);
      }
    });
    return dates;
  };

  // Toggle trạng thái Đã thanh toán / Chờ thanh toán
  const togglePaymentStatus = (invoiceId: string) => {
    const inv = dataStore.invoices.find((i) => i.id === invoiceId);
    if (inv) {
      inv.status = inv.status === "PAID" ? "PENDING" : "PAID";
      reloadInvoices();
    }
  };

  // Mở VietQR Modal
  const handleOpenVietQr = (inv: MonthlyInvoiceData, student: StudentData) => {
    const bank = dataStore.bankConfig;
    const transferContent = `HP ${student.code} T${selectedMonth}`;
    const qrUrl = bank.useCustomQr && bank.customQrImage
      ? bank.customQrImage
      : generateVietQrUrl({
          bankId: bank.bankId,
          accountNo: bank.bankAccount,
          accountName: bank.accountHolder,
          template: (bank.qrTemplate as any) || "compact2",
          amount: inv.totalAmount,
          description: transferContent,
        });

    setActiveQrData({
      studentName: student.fullName,
      studentCode: student.code,
      amount: inv.totalAmount,
      month: selectedMonth,
      year: selectedYear,
      qrUrl,
      transferContent,
      bankName: bank.bankName,
      bankAccount: bank.bankAccount,
      accountHolder: bank.accountHolder,
    });
    setVietQrModalOpen(true);
  };

  // Mở Zalo OA Simulator
  const handleOpenZalo = (inv: MonthlyInvoiceData, student: StudentData) => {
    const bank = dataStore.bankConfig;
    const presentDates = getPresentDatesForStudent(student.id);
    const transferContent = `HP ${student.code} T${selectedMonth}`;
    const qrUrl = bank.useCustomQr && bank.customQrImage
      ? bank.customQrImage
      : generateVietQrUrl({
          bankId: bank.bankId,
          accountNo: bank.bankAccount,
          accountName: bank.accountHolder,
          template: (bank.qrTemplate as any) || "compact2",
          amount: inv.totalAmount,
          description: transferContent,
        });

    const payload: ZaloStudentInvoicePayload = {
      studentName: student.fullName,
      studentCode: student.code,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      className: selectedClass?.name || "Lớp cờ vua",
      branchName: branchInfo?.name || "Cơ sở CLB",
      month: selectedMonth,
      year: selectedYear,
      presentCount: inv.presentCount,
      presentDates,
      feePerSession: inv.feePerSession,
      totalAmount: inv.totalAmount,
      vietQrUrl: qrUrl,
      customQrUrl: bank.useCustomQr && bank.customQrImage ? bank.customQrImage : undefined,
      transferContent,
      bankName: bank.bankName,
      bankAccount: bank.bankAccount,
      accountHolder: bank.accountHolder,
    };

    setActiveZaloPayload(payload);
    setZaloModalOpen(true);
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    const rows: InvoiceExportRow[] = invoices.map((inv, idx) => {
      const student = dataStore.students.find((s) => s.id === inv.studentId);
      return {
        stt: idx + 1,
        studentCode: student?.code || "",
        fullName: student?.fullName || "",
        birthYear: student?.birthYear || 0,
        parentName: student?.parentName || "",
        parentPhone: student?.parentPhone || "",
        presentCount: inv.presentCount,
        feePerSession: inv.feePerSession,
        totalAmount: inv.totalAmount,
        statusText: inv.status === "PAID" ? "Đã thanh toán" : "Chờ thanh toán",
      };
    });

    exportInvoicesToExcel(rows, selectedClass?.name || "Lop_Co_Vua", selectedMonth, selectedYear);
  };

  // Tính tổng
  const totalDue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((sum, inv) => sum + inv.totalAmount, 0);
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
            Tổng Kết Học Phí & Zalo OA
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Học phí = (Số buổi Có mặt thực tế) × (Đơn giá/buổi). Tự động sinh mã VietQR và gửi thông báo phụ huynh.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedStudentForParentModal(undefined);
              setZaloParentModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Send className="h-4 w-4" />
            <span>Gửi Thẻ Học Phí Đến Phụ Huynh (Zalo)</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl bg-brand-secondary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-secondary/20 hover:bg-brand-secondary-hover transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Xuất File Excel (.xlsx)</span>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Tổng Học Phí Phải Thu (Thực học)</p>
          <p className="mt-1.5 text-2xl font-black text-slate-900">
            {formatCurrencyVND(totalDue)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Tính trên {invoices.length} học viên • Đơn giá {formatCurrencyVND(selectedClass?.feePerSession || 0)}/b
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
              {invoices.filter((i) => i.status === "PAID").length} / {invoices.length} học viên đã hoàn tất
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
              {invoices.filter((i) => i.status === "PENDING").length} học viên chờ thanh toán
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
              {selectedClass?.name} ({branchInfo?.name})
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
          {filteredInvoices.map((inv) => {
            const student = dataStore.students.find((s) => s.id === inv.studentId);
            const isPaid = inv.status === "PAID";

            return (
              <div key={inv.id} className="p-3.5 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {student?.code}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{student?.fullName}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      PH: {student?.parentName} • {student?.parentPhone}
                    </p>
                  </div>

                  {/* Payment toggle button */}
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
                <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => student && handleOpenVietQr(inv, student)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-bold text-brand-primary border border-emerald-200 active:bg-emerald-100"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Mã VietQR</span>
                  </button>
                  <button
                    onClick={() => student && handleOpenZalo(inv, student)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-700 border border-blue-200 active:bg-blue-100"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Zalo OA</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredInvoices.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Chưa có dữ liệu học phí cho lớp này.
            </div>
          )}
        </div>

        {/* Desktop Table (sm and up) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã HV</th>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3">Phụ Huynh & SĐT</th>
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
                const presentDates = student ? getPresentDatesForStudent(student.id) : [];

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {student?.code}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {student?.fullName}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{student?.parentName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{student?.parentPhone}</p>
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
                          title="Tạo mã VietQR Napas 247"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>

                        {/* Nút Gửi Zalo Phụ Huynh */}
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
                              ? `Đã gửi Zalo lúc ${new Date(inv.zaloSentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}. Bấm để xem hoặc gửi lại.`
                              : "Mở gửi thẻ học phí qua Zalo cho phụ huynh em này"
                          }
                        >
                          {inv.zaloSentAt ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>Đã gửi Zalo</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              <span>Gửi Zalo</span>
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

      {activeZaloPayload && (
        <ZaloSimulatorModal
          isOpen={zaloModalOpen}
          onClose={() => setZaloModalOpen(false)}
          payload={activeZaloPayload}
        />
      )}

      {/* Modal HLV Gửi Thẻ Học Phí Trực Tiếp Đến Phụ Huynh */}
      <ZaloParentSenderModal
        isOpen={zaloParentModalOpen}
        onClose={() => setZaloParentModalOpen(false)}
        classroom={selectedClass || null}
        branch={branchInfo || null}
        month={selectedMonth}
        year={selectedYear}
        initialStudentId={selectedStudentForParentModal}
        onSentSuccess={reloadInvoices}
        students={invoices.map((inv) => {
          const student = dataStore.students.find((s) => s.id === inv.studentId);
          const bank = dataStore.bankConfig;
          const transferContent = `HP ${student?.code || "HS"} T${selectedMonth}`;
          const vietQrUrl = bank.useCustomQr && bank.customQrImage
            ? bank.customQrImage
            : generateVietQrUrl({
                bankId: bank.bankId,
                accountNo: bank.bankAccount,
                accountName: bank.accountHolder,
                template: "compact2",
                amount: inv.totalAmount,
                description: transferContent,
              });

          return {
            invoiceId: inv.id,
            studentId: student?.id || "",
            studentCode: student?.code || "HS",
            studentName: student?.fullName || "Học viên",
            parentName: student?.parentName || "",
            parentPhone: student?.parentPhone || "",
            cleanParentPhone: (student?.parentPhone || "").replace(/[^0-9]/g, ""),
            className: selectedClass?.name || "",
            branchName: branchInfo?.name || "",
            month: selectedMonth,
            year: selectedYear,
            presentCount: inv.presentCount,
            presentDates: getPresentDatesForStudent(student?.id || ""),
            feePerSession: inv.feePerSession,
            totalAmount: inv.totalAmount,
            status: inv.status,
            zaloSentAt: inv.zaloSentAt,
            transferContent,
            vietQrUrl,
            bankName: bank.bankName,
            bankAccount: bank.bankAccount,
            accountHolder: bank.accountHolder,
          };
        })}
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

