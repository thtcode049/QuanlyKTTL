"use client";

import React, { useState } from "react";
import {
  Coins,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Clock,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { dataStore } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function CoachPayrollPage() {
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);

  // Lấy dữ liệu của HLV GM Bùi Vinh (user-coach-1)
  const currentCoach = dataStore.users.find((u) => u.id === "user-coach-1");
  const coachClasses = dataStore.classes.filter((c) => c.coachId === currentCoach?.id);
  const coachClassIds = coachClasses.map((c) => c.id);

  // Các ca dạy thực tế trong tháng
  const coachSessions = dataStore.sessions
    .filter((sess) => {
      if (!coachClassIds.includes(sess.classId)) return false;
      const d = new Date(sess.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalSessions = coachSessions.length;
  const baseRate = currentCoach?.baseRate || 250000;
  const totalSalary = totalSessions * baseRate;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Thù Lao Huấn Luyện Viên
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Theo dõi chi tiết số ca đứng lớp và tạm tính thu nhập cá nhân trong tháng.
          </p>
        </div>

        {/* Filter Month/Year */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 shadow-sm focus:border-brand-primary focus:outline-none"
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
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 shadow-sm focus:border-brand-primary focus:outline-none"
          >
            <option value={2026}>Năm 2026</option>
            <option value={2025}>Năm 2025</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Số Ca Dạy Thực Tế Đã Dạy</p>
          <p className="mt-1.5 text-3xl font-black text-slate-900">
            {totalSessions} <span className="text-base font-medium text-slate-500">ca</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Phụ trách {coachClasses.length} lớp học đang hoạt động
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Đơn Giá Thù Lao / 1 Ca</p>
          <p className="mt-1.5 text-3xl font-black text-brand-secondary">
            {formatCurrencyVND(baseRate)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Đơn giá cấu hình theo hợp đồng giảng dạy
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Tổng Thù Lao Tạm Tính Tháng {month}</p>
          <p className="mt-1.5 text-3xl font-black text-brand-primary">
            {formatCurrencyVND(totalSalary)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">
            = {totalSessions} ca × {formatCurrencyVND(baseRate)}
          </p>
        </div>
      </div>

      {/* Teaching Sessions Table */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80">
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-900">
            Nhật Ký Các Ca Dạy Hoàn Thành Tháng {month}/{year}
          </h3>
          <p className="text-xs text-slate-500">
            Mỗi ca hoàn thành điểm danh được ghi nhận vào bảng thù lao đối soát cuối tháng.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Ngày Dạy</th>
                <th className="px-4 py-3">Lớp Học</th>
                <th className="px-4 py-3">Cơ Sở</th>
                <th className="px-4 py-3">Chủ Đề Cờ Vua Đã Dạy</th>
                <th className="px-4 py-3 text-center">Số HV Có Mặt</th>
                <th className="px-4 py-3 text-right">Thù Lao Ca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coachSessions.map((sess, idx) => {
                const cls = dataStore.classes.find((c) => c.id === sess.classId);
                const branch = dataStore.branches.find((b) => b.id === cls?.branchId);
                const pCount = sess.records.filter((r) => r.status === "PRESENT").length;

                return (
                  <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {new Date(sess.date).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {cls?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {branch?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700 italic">
                      {sess.topic}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-brand-primary border border-emerald-200">
                        {pCount} học sinh
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {formatCurrencyVND(baseRate)}
                    </td>
                  </tr>
                );
              })}
              {coachSessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Chưa có ca dạy nào trong tháng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
