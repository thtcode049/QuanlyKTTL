"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Download,
  DollarSign,
  Calendar,
  CheckCircle2,
  Users,
  Building2,
  BookOpen,
  Send,
  Settings,
  Edit2,
  X,
  Check,
  Sparkles,
} from "lucide-react";
import { dataStore, resolveCanonicalCoachId } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import { exportPayrollToExcel, PayrollExportRow } from "@/lib/excel";
import ZaloCoachModal from "@/components/zalo-coach-modal";
import confetti from "canvas-confetti";

export default function AdminPayrollPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);
  const [zaloModalOpen, setZaloModalOpen] = useState(false);

  // Modal Sửa Tỷ Lệ % Lương & Sách của HLV
  const [editingRateCoach, setEditingRateCoach] = useState<any>(null);
  const [tuitionRateInput, setTuitionRateInput] = useState<number>(50);
  const [bookRateInput, setBookRateInput] = useState<number>(30);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const canonicalId = resolveCanonicalCoachId(u.id || u.email);
        const dbUser = dataStore.users.find(
          (x) => x.id === u.id || x.id === canonicalId || (u.email && x.email.toLowerCase() === u.email.toLowerCase())
        );
        const merged = dbUser ? { ...u, ...dbUser } : u;
        setCurrentUser(merged);
      } catch (e) {}
    }
  }, []);

  const isBranchManager = currentUser?.systemRole === "CHUCOSO";
  const userManagedBranchIds: string[] = isBranchManager
    ? (currentUser?.managedBranchIds && currentUser.managedBranchIds.length > 0
        ? currentUser.managedBranchIds
        : (currentUser?.branchId ? [currentUser.branchId] : []))
    : [];

  const availableBranches = isBranchManager
    ? dataStore.branches.filter((b) => userManagedBranchIds.includes(b.id))
    : dataStore.branches;

  const activeBranchIds: string[] | undefined = isBranchManager
    ? (selectedBranchId === "all" ? userManagedBranchIds : [selectedBranchId])
    : (selectedBranchId === "all" ? undefined : [selectedBranchId]);

  // Admin chỉ quản lý và tính thù lao cho các lớp được chia sẻ quyền
  // Chủ cơ sở chỉ quản lý các lớp HLV khác dạy tại cơ sở của mình
  const payrollList = dataStore.getCoachPayroll(month, year, true, activeBranchIds);

  const totalSessions = payrollList.reduce((sum, p) => sum + p.totalSessions, 0);
  const totalTuition = payrollList.reduce((sum, p) => sum + p.totalTuition, 0);
  const totalTuitionCommission = payrollList.reduce((sum, p) => sum + p.tuitionCommission, 0);
  const totalBooksCount = payrollList.reduce((sum, p) => sum + p.totalBooksCount, 0);
  const totalBookRevenue = payrollList.reduce((sum, p) => sum + p.totalBookRevenue, 0);
  const totalBookCommission = payrollList.reduce((sum, p) => sum + p.bookCommission, 0);
  const totalPayrollAmount = payrollList.reduce((sum, p) => sum + p.totalIncome, 0);

  const openRateModal = (coachPayrollItem: any) => {
    setEditingRateCoach(coachPayrollItem);
    setTuitionRateInput(coachPayrollItem.tuitionRatePercent ?? 50);
    setBookRateInput(coachPayrollItem.bookRatePercent ?? 30);
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRateCoach) return;

    dataStore.updateCoachSalaryRates(
      editingRateCoach.coachId,
      Number(tuitionRateInput),
      Number(bookRateInput)
    );

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {}

    setEditingRateCoach(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleExportExcel = () => {
    const rows: PayrollExportRow[] = payrollList.map((p, idx) => ({
      stt: idx + 1,
      coachName: p.coachName,
      phone: p.coachPhone,
      branchName: p.branchName,
      totalSessions: p.totalSessions,
      totalTuition: p.totalTuition,
      tuitionCommission: p.tuitionCommission,
      totalBooksCount: p.totalBooksCount,
      totalBookRevenue: p.totalBookRevenue,
      bookCommission: p.bookCommission,
      totalIncome: p.totalIncome,
    }));

    exportPayrollToExcel(rows, month, year);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Thu Nhập & Bảng Lương HLV
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Công thức: Thu nhập HLV = 50% Tổng học phí + 30% Tiền sách phát. Tự động tính toán và xuất Excel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZaloModalOpen(true)}
            className="flex items-center gap-2 rounded bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            <Send className="h-4 w-4" />
            <span>Gửi Học Phí Đến HLV (Zalo)</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded bg-brand-secondary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-secondary-hover transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel Thu Nhập HLV (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Chủ cơ sở notification banner */}
      {isBranchManager && (
        <div className="rounded border border-blue-100 bg-blue-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-blue-600 text-white font-bold text-sm">
              🏢
            </div>
            <div>
              <p className="text-xs font-bold text-blue-950">
                Chế độ Chủ nhiệm Cơ sở: Quản lý lớp & lương các HLV dạy tại cơ sở của bạn
              </p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Cơ sở phụ trách: <strong>{availableBranches.map((b) => b.name.split("–")[0].trim()).join(", ") || "Chưa gán"}</strong>.
                Bảng lương chỉ hiển thị và tính toán các buổi dạy, học phí của các lớp được mở tại cơ sở do bạn quản lý.
              </p>
            </div>
          </div>
          <span className="rounded bg-blue-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-blue-900 border border-blue-300 self-start sm:self-auto flex-shrink-0">
            {payrollList.length} HLV giảng dạy
          </span>
        </div>
      )}

      {/* Month / Year & Branch Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded bg-white p-3 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-brand-primary" />
          <span className="text-xs font-semibold text-slate-700">Kỳ Quyết Toán:</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none cursor-pointer"
          >
            <option value={2026}>Năm 2026</option>
            <option value={2025}>Năm 2025</option>
          </select>
        </div>

        <div className="hidden h-5 w-px bg-slate-200 sm:block" />

        {/* Lọc Cơ Sở */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[200px]">
          <Building2 className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Cơ Sở:</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full sm:w-auto rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none cursor-pointer"
          >
            {isBranchManager ? (
              <option value="all">
                🌟 Tất cả cơ sở tôi quản lý ({availableBranches.length} cơ sở)
              </option>
            ) : (
              <option value="all">🌟 Toàn bộ hệ thống CLB ({dataStore.branches.length} cơ sở)</option>
            )}
            {availableBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tổng Quỹ Thu Nhập */}
        <div className="rounded bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-medium text-slate-300">Tổng Quỹ Thu Nhập HLV Tháng {month}</p>
          <p className="mt-1.5 text-2xl font-bold text-brand-secondary tracking-tight">
            {formatCurrencyVND(totalPayrollAmount)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Dựa trên {totalSessions} ca dạy và {totalBooksCount} cuốn sách
          </p>
        </div>

        {/* Card 2: 50% Học Phí */}
        <div className="rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">50% Quỹ Học Phí HLV</p>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-primary border border-emerald-100">
              50%
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-brand-primary tracking-tight">
            {formatCurrencyVND(totalTuitionCommission)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Từ tổng {formatCurrencyVND(totalTuition)} học phí toàn CLB
          </p>
        </div>

        {/* Card 3: 30% Tiền Sách */}
        <div className="rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">30% Tiền Sách HLV</p>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-100">
              30%
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold text-amber-600 tracking-tight">
            {formatCurrencyVND(totalBookCommission)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Từ {totalBooksCount} cuốn ({formatCurrencyVND(totalBookRevenue)})
          </p>
        </div>

        {/* Card 4: Số HLV */}
        <div className="rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-medium text-slate-500">Số Lượng HLV Nhận Lương</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">
            {payrollList.length} <span className="text-sm font-medium text-slate-500">HLV</span>
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            100% đối soát tự động từ dữ liệu điểm danh
          </p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded bg-white border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="border-b border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Bảng Kê Chi Tiết Thu Nhập HLV Tháng {month}/{year}
            </h3>
            <p className="text-xs text-slate-500">
              Công thức: Thu nhập HLV = % Học phí riêng từng HLV + % Tiền sách phát riêng. Admin có thể thay đổi mức lương linh hoạt.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">STT</th>
                <th className="px-4 py-2.5">Họ và Tên HLV</th>
                <th className="px-4 py-2.5">Cơ Sở</th>
                <th className="px-4 py-2.5 text-center">Số Ca</th>
                <th className="px-4 py-2.5 text-right">Tổng Học Phí</th>
                <th className="px-4 py-2.5 text-right text-brand-primary">% Học Phí</th>
                <th className="px-4 py-2.5 text-center">Sách Phát</th>
                <th className="px-4 py-2.5 text-right">Tiền Sách</th>
                <th className="px-4 py-2.5 text-right text-amber-700">% Sách</th>
                <th className="px-4 py-2.5 text-right font-bold">Tổng Thu Nhập HLV</th>
                <th className="px-4 py-2.5 text-center">Cài Đặt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollList.map((p, idx) => (
                <tr key={p.coachId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{p.coachName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{p.coachPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.branchName.split("–")[0].trim()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                      {p.totalSessions} ca
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatCurrencyVND(p.totalTuition)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-primary">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-100">
                        {p.tuitionRatePercent}%
                      </span>
                      <span>{formatCurrencyVND(p.tuitionCommission)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-slate-700">
                    {p.totalBooksCount} cuốn
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatCurrencyVND(p.totalBookRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-100">
                        {p.bookRatePercent}%
                      </span>
                      <span>{formatCurrencyVND(p.bookCommission)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                    {formatCurrencyVND(p.totalIncome)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openRateModal(p)}
                      className="flex items-center justify-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-brand-primary hover:text-white transition-colors cursor-pointer mx-auto"
                      title="Sửa mức lương % học phí và tiền sách"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Sửa %</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cài Đặt Mức Lương % Học Phí & Tiền Sách */}
      {editingRateCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg bg-white p-5 border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-primary/10 text-brand-primary">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Điều Chỉnh Mức Lương HLV</h3>
                  <p className="text-xs font-medium text-brand-primary">{editingRateCoach.coachName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRateCoach(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="mt-3.5 space-y-3.5 text-xs">
              <div className="rounded bg-slate-50 p-2.5 text-[11px] text-slate-600 leading-relaxed border border-slate-100">
                Admin có thể cấu hình tỷ lệ hoa hồng riêng biệt cho từng HLV. Thu nhập thực tế sẽ tự động tính toán lại ngay sau khi lưu.
              </div>

              {/* Tỷ lệ học phí */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">
                    Tỷ lệ % Học phí nhận được *
                  </label>
                  <span className="font-bold text-brand-primary text-sm">
                    {tuitionRateInput}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={tuitionRateInput}
                  onChange={(e) => setTuitionRateInput(Number(e.target.value))}
                  className="mt-2 w-full accent-brand-primary cursor-pointer"
                />
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>0%</span>
                  <span>Mặc định: 50%</span>
                  <span>100%</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {[40, 50, 55, 60, 70].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setTuitionRateInput(rate)}
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                        tuitionRateInput === rate
                          ? "bg-brand-primary text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Tỷ lệ tiền sách */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">
                    Tỷ lệ % Tiền sách nhận được *
                  </label>
                  <span className="font-bold text-amber-700 text-sm">
                    {bookRateInput}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bookRateInput}
                  onChange={(e) => setBookRateInput(Number(e.target.value))}
                  className="mt-2 w-full accent-amber-600 cursor-pointer"
                />
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span>0%</span>
                  <span>Mặc định: 30%</span>
                  <span>100%</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {[20, 25, 30, 35, 40, 50].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setBookRateInput(rate)}
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                        bookRateInput === rate
                          ? "bg-amber-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Tính thử thu nhập với mức mới */}
              <div className="rounded border border-emerald-100 bg-emerald-50/50 p-3 space-y-1">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Dự tính thu nhập Tháng {month} với mức mới:
                </p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600">Học phí ({tuitionRateInput}% x {formatCurrencyVND(editingRateCoach.totalTuition)}):</span>
                  <span className="font-bold text-emerald-800">
                    {formatCurrencyVND(Math.round(editingRateCoach.totalTuition * (tuitionRateInput / 100)))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Tiền sách ({bookRateInput}% x {formatCurrencyVND(editingRateCoach.totalBookRevenue)}):</span>
                  <span className="font-bold text-amber-800">
                    {formatCurrencyVND(Math.round(editingRateCoach.totalBookRevenue * (bookRateInput / 100)))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold border-t border-emerald-100 pt-1 text-slate-900">
                  <span>Tổng thu nhập mới:</span>
                  <span className="text-emerald-700">
                    {formatCurrencyVND(
                      Math.round(editingRateCoach.totalTuition * (tuitionRateInput / 100)) +
                      Math.round(editingRateCoach.totalBookRevenue * (bookRateInput / 100))
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRateCoach(null)}
                  className="rounded border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded bg-brand-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>Lưu & Áp Dụng Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gửi Học Phí Đến HLV (Zalo) */}
      <ZaloCoachModal
        isOpen={zaloModalOpen}
        onClose={() => setZaloModalOpen(false)}
        month={month}
        year={year}
      />
    </div>
  );
}
