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
  Sparkles,
  AlertCircle,
  Eye,
  Check,
  Search,
} from "lucide-react";
import { dataStore, MonthlyInvoiceData, ClassroomData, StudentData } from "@/lib/data-store";
import { formatCurrencyVND, generateVietQrUrl } from "@/lib/vietqr";
import { exportInvoicesToExcel, InvoiceExportRow } from "@/lib/excel";
import { ZaloStudentInvoicePayload } from "@/lib/zalo";
import VietQrModal from "@/components/vietqr-modal";
import ZaloSimulatorModal from "@/components/zalo-simulator";

function InvoicesContent() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") || dataStore.classes[0]?.id || "";

  const [classes] = useState<ClassroomData[]>(dataStore.classes);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [invoices, setInvoices] = useState<MonthlyInvoiceData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
  } | null>(null);

  // Modal Zalo Simulator State
  const [zaloModalOpen, setZaloModalOpen] = useState(false);
  const [activeZaloPayload, setActiveZaloPayload] = useState<ZaloStudentInvoicePayload | null>(null);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const branchInfo = dataStore.branches.find((b) => b.id === selectedClass?.branchId);

  // Load và tính toán hóa đơn
  const reloadInvoices = () => {
    dataStore.recalculateAllInvoices(selectedMonth, selectedYear);
    const filtered = dataStore.invoices.filter(
      (inv) => inv.classId === selectedClass?.id && inv.month === selectedMonth && inv.year === selectedYear
    );
    setInvoices(filtered);
  };

  useEffect(() => {
    reloadInvoices();
  }, [selectedClassId, selectedMonth, selectedYear]);

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
    const transferContent = `HP ${student.code} T${selectedMonth}`;
    const qrUrl = generateVietQrUrl({
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
    });
    setVietQrModalOpen(true);
  };

  // Mở Zalo OA Simulator
  const handleOpenZalo = (inv: MonthlyInvoiceData, student: StudentData) => {
    const presentDates = getPresentDatesForStudent(student.id);
    const transferContent = `HP ${student.code} T${selectedMonth}`;
    const qrUrl = generateVietQrUrl({
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
      transferContent,
      bankName: dataStore.bankConfig.bankName,
      bankAccount: dataStore.bankConfig.bankAccount,
      accountHolder: dataStore.bankConfig.accountHolder,
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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-brand-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Quy tắc: Thực học - Thực trả (Nghỉ không tính phí)</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            Tổng Kết Học Phí & Zalo OA
          </h1>
          <p className="text-xs text-slate-500">
            Học phí = (Số buổi Có mặt thực tế) × (Đơn giá/buổi). Tự động sinh mã VietQR và gửi thông báo phụ huynh.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl bg-brand-secondary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-secondary/20 hover:bg-brand-secondary-hover"
          >
            <Download className="h-4 w-4" />
            <span>Xuất File Excel (.xlsx)</span>
          </button>
        </div>
      </div>

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

        <div className="overflow-x-auto">
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
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {formatCurrencyVND(inv.feePerSession)}
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

                        {/* Nút Gửi Zalo */}
                        <button
                          onClick={() => student && handleOpenZalo(inv, student)}
                          className="flex items-center gap-1 rounded-lg bg-[#0068FF]/10 px-2.5 py-1 text-[11px] font-bold text-[#0068FF] hover:bg-[#0068FF]/20"
                          title="Gửi học phí qua Zalo OA"
                        >
                          <Send className="h-3 w-3" />
                          <span>Zalo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
        />
      )}

      {activeZaloPayload && (
        <ZaloSimulatorModal
          isOpen={zaloModalOpen}
          onClose={() => setZaloModalOpen(false)}
          payload={activeZaloPayload}
        />
      )}
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

