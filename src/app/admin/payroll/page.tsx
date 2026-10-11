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
} from "lucide-react";
import { dataStore } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import { exportPayrollToExcel, PayrollExportRow } from "@/lib/excel";

export default function AdminPayrollPage() {
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);

  const payrollList = dataStore.getCoachPayroll(month, year);

  const totalSessions = payrollList.reduce((sum, p) => sum + p.totalSessions, 0);
  const totalTuition = payrollList.reduce((sum, p) => sum + p.totalTuition, 0);
  const totalTuitionCommission = payrollList.reduce((sum, p) => sum + p.tuitionCommission, 0);
  const totalBooksCount = payrollList.reduce((sum, p) => sum + p.totalBooksCount, 0);
  const totalBookRevenue = payrollList.reduce((sum, p) => sum + p.totalBookRevenue, 0);
  const totalBookCommission = payrollList.reduce((sum, p) => sum + p.bookCommission, 0);
  const totalPayrollAmount = payrollList.reduce((sum, p) => sum + p.totalIncome, 0);

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
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl bg-brand-secondary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-secondary/20 hover:bg-brand-secondary-hover"
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
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-900">
            Bảng Kê Chi Tiết Thu Nhập HLV Tháng {month}/{year}
          </h3>
          <p className="text-xs text-slate-500">
            Công thức: Thu nhập HLV = 50% Tổng học phí các lớp phụ trách + 30% Tiền sách đã phát.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Họ và Tên HLV</th>
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">Cơ Sở</th>
                <th className="px-4 py-3 text-center">Số Ca</th>
                <th className="px-4 py-3 text-right">Tổng Học Phí</th>
                <th className="px-4 py-3 text-right text-brand-primary">50% Học Phí</th>
                <th className="px-4 py-3 text-center">Sách Phát</th>
                <th className="px-4 py-3 text-right">Tiền Sách</th>
                <th className="px-4 py-3 text-right text-amber-700">30% Sách</th>
                <th className="px-4 py-3 text-right font-black">Tổng Thu Nhập HLV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollList.map((p, idx) => (
                <tr key={p.coachId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {p.coachName}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {p.coachPhone}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.branchName}
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
                    {formatCurrencyVND(p.tuitionCommission)}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">
                    {p.totalBooksCount} cuốn
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatCurrencyVND(p.totalBookRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">
                    {formatCurrencyVND(p.bookCommission)}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                    {formatCurrencyVND(p.totalIncome)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
