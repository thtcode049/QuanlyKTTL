"use client";

import React, { useState } from "react";
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
import { dataStore } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import { exportPayrollToExcel, PayrollExportRow } from "@/lib/excel";
import ZaloCoachModal from "@/components/zalo-coach-modal";
import confetti from "canvas-confetti";

export default function AdminPayrollPage() {
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);
  const [zaloModalOpen, setZaloModalOpen] = useState(false);

  // Modal Sửa Tỷ Lệ % Lương & Sách của HLV
  const [editingRateCoach, setEditingRateCoach] = useState<any>(null);
  const [tuitionRateInput, setTuitionRateInput] = useState<number>(50);
  const [bookRateInput, setBookRateInput] = useState<number>(30);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Admin chỉ quản lý và tính thù lao cho các lớp được chia sẻ quyền
  const payrollList = dataStore.getCoachPayroll(month, year, true);

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

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setZaloModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
          >
            <Send className="h-4 w-4" />
            <span>Gửi Học Phí Đến HLV (Zalo)</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl bg-brand-secondary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-secondary/20 hover:bg-brand-secondary-hover transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel Thu Nhập HLV (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Month / Year Filter Bar */}
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft border border-slate-200/80">
        <span className="text-xs font-bold text-slate-700">Chọn Kỳ Quyết Toán:</span>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
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
          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
        >
          <option value={2026}>Năm 2026</option>
          <option value={2025}>Năm 2025</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tổng Quỹ Thu Nhập */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-soft text-white">
          <p className="text-xs font-semibold text-slate-300">Tổng Quỹ Thu Nhập HLV Tháng {month}</p>
          <p className="mt-1.5 text-3xl font-black text-brand-secondary">
            {formatCurrencyVND(totalPayrollAmount)}
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            Dựa trên {totalSessions} ca dạy và {totalBooksCount} cuốn sách
          </p>
        </div>

        {/* Card 2: 50% Học Phí */}
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">50% Quỹ Học Phí HLV</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-brand-primary border border-emerald-200">
              50%
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-black text-brand-primary">
            {formatCurrencyVND(totalTuitionCommission)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Từ tổng {formatCurrencyVND(totalTuition)} học phí toàn CLB
          </p>
        </div>

        {/* Card 3: 30% Tiền Sách */}
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">30% Tiền Sách HLV</p>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              30%
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-black text-amber-600">
            {formatCurrencyVND(totalBookCommission)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Từ {totalBooksCount} cuốn ({formatCurrencyVND(totalBookRevenue)})
          </p>
        </div>

        {/* Card 4: Số HLV */}
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Số Lượng HLV Nhận Lương</p>
          <p className="mt-1.5 text-2xl font-black text-slate-900">
            {payrollList.length} <span className="text-sm font-semibold text-slate-500">huấn luyện viên</span>
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">
            100% đối soát tự động từ dữ liệu điểm danh
          </p>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80">
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
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Họ và Tên HLV</th>
                <th className="px-4 py-3">Cơ Sở</th>
                <th className="px-4 py-3 text-center">Số Ca</th>
                <th className="px-4 py-3 text-right">Tổng Học Phí</th>
                <th className="px-4 py-3 text-right text-brand-primary">% Học Phí</th>
                <th className="px-4 py-3 text-center">Sách Phát</th>
                <th className="px-4 py-3 text-right">Tiền Sách</th>
                <th className="px-4 py-3 text-right text-amber-700">% Sách</th>
                <th className="px-4 py-3 text-right font-black">Tổng Thu Nhập HLV</th>
                <th className="px-4 py-3 text-center">Cài Đặt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollList.map((p, idx) => (
                <tr key={p.coachId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{p.coachName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{p.coachPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.branchName.split("–")[0].trim()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                      {p.totalSessions} ca
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatCurrencyVND(p.totalTuition)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-brand-primary">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">
                        {p.tuitionRatePercent}%
                      </span>
                      <span>{formatCurrencyVND(p.tuitionCommission)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">
                    {p.totalBooksCount} cuốn
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatCurrencyVND(p.totalBookRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                        {p.bookRatePercent}%
                      </span>
                      <span>{formatCurrencyVND(p.bookCommission)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                    {formatCurrencyVND(p.totalIncome)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openRateModal(p)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-brand-primary hover:text-white transition-all shadow-sm cursor-pointer mx-auto"
                      title="Sửa mức lương % học phí và tiền sách"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Sửa % Lương</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Điều Chỉnh Mức Lương HLV</h3>
                  <p className="text-xs font-semibold text-brand-primary">{editingRateCoach.coachName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingRateCoach(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 leading-relaxed border border-slate-200/60">
                Admin có thể cấu hình tỷ lệ hoa hồng riêng biệt cho từng HLV. Thu nhập thực tế sẽ tự động tính toán lại ngay sau khi lưu.
              </div>

              {/* Tỷ lệ học phí */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Tỷ lệ % Học phí nhận được *
                  </label>
                  <span className="font-black text-brand-primary text-sm">
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
                <div className="mt-1.5 flex items-center gap-2">
                  {[40, 50, 55, 60, 70].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setTuitionRateInput(rate)}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-colors ${
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
                  <label className="font-bold text-slate-800">
                    Tỷ lệ % Tiền sách nhận được *
                  </label>
                  <span className="font-black text-amber-700 text-sm">
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
                <div className="mt-1.5 flex items-center gap-2">
                  {[20, 25, 30, 35, 40, 50].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setBookRateInput(rate)}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-colors ${
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
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1">
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
                <div className="flex items-center justify-between text-sm font-black border-t border-emerald-200/80 pt-1 text-slate-900">
                  <span>Tổng thu nhập mới:</span>
                  <span className="text-emerald-700">
                    {formatCurrencyVND(
                      Math.round(editingRateCoach.totalTuition * (tuitionRateInput / 100)) +
                      Math.round(editingRateCoach.totalBookRevenue * (bookRateInput / 100))
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRateCoach(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
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
