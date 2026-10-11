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
  Sparkles,
} from "lucide-react";
import { dataStore } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import { exportPayrollToExcel, PayrollExportRow } from "@/lib/excel";

export default function AdminPayrollPage() {
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);

  const payrollList = dataStore.getCoachPayroll(month, year);

  const totalSessions = payrollList.reduce((sum, p) => sum + p.totalSessions, 0);
  const totalPayrollAmount = payrollList.reduce((sum, p) => sum + p.totalSalary, 0);

  const handleExportExcel = () => {
    const rows: PayrollExportRow[] = payrollList.map((p, idx) => ({
      stt: idx + 1,
      coachName: p.coachName,
      phone: p.coachPhone,
      branchName: p.branchName,
      totalSessions: p.totalSessions,
      baseRate: p.baseRate,
      totalSalary: p.totalSalary,
    }));

    exportPayrollToExcel(rows, month, year);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
            <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
            <span>Quy tắc: Thù lao HLV = Số ca thực dạy × Đơn giá ca</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            Bảng Lương Huấn Luyện Viên
          </h1>
          <p className="text-xs text-slate-500">
            Tự động tổng hợp ca dạy thực tế và xuất file Excel đối soát chi trả hàng tháng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl bg-brand-secondary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-secondary/20 hover:bg-brand-secondary-hover"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel Đối Soát (.xlsx)</span>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Tổng Quỹ Thù Lao HLV Tháng {month}</p>
          <p className="mt-1.5 text-2xl font-black text-brand-primary">
            {formatCurrencyVND(totalPayrollAmount)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Dựa trên {totalSessions} ca dạy thực tế đã hoàn thành
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Tổng Số Ca Dạy Toàn Hệ Thống</p>
          <p className="mt-1.5 text-2xl font-black text-slate-900">
            {totalSessions} <span className="text-sm font-semibold text-slate-500">ca đứng lớp</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Tại 4 cơ sở Bạch Mai, Thái Hà, Hoàng Quốc Việt, Trương Định
          </p>
        </div>

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
            Bảng Kê Chi Tiết Thù Lao HLV Tháng {month}/{year}
          </h3>
          <p className="text-xs text-slate-500">
            Công thức: Thù lao = (Số ca thực dạy) × (Đơn giá/ca). Xuất Excel để chuyển khoản.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Họ và Tên HLV</th>
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">Cơ Sở Phụ Trách</th>
                <th className="px-4 py-3 text-center">Số Lớp</th>
                <th className="px-4 py-3 text-center">Số Ca Thực Dạy</th>
                <th className="px-4 py-3 text-right">Đơn Giá / Ca</th>
                <th className="px-4 py-3 text-right">Tổng Thù Lao</th>
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
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">
                    {p.classesCount} lớp
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-black text-brand-primary border border-emerald-200">
                      {p.totalSessions} ca
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatCurrencyVND(p.baseRate)}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                    {formatCurrencyVND(p.totalSalary)}
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
