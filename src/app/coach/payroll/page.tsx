"use client";

import React, { useState } from "react";
import {
  Coins,
  Calendar,
  DollarSign,
  TrendingUp,
  BookOpen,
  Award,
  Sparkles,
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

  // Tính toán thu nhập HLV theo công thức chuẩn: Tổng học phí * 50% + Tiền sách * 30%
  const payrollList = dataStore.getCoachPayroll(month, year);
  const coachPayroll = payrollList.find((p) => p.coachId === currentCoach?.id);

  const totalTuition = coachPayroll?.totalTuition || 0;
  const tuitionCommission = coachPayroll?.tuitionCommission || 0; // 50%
  const totalBooksCount = coachPayroll?.totalBooksCount || 0;
  const totalBookRevenue = coachPayroll?.totalBookRevenue || 0;
  const bookCommission = coachPayroll?.bookCommission || 0; // 30%
  const totalIncome = coachPayroll?.totalIncome || 0;
  const totalSessions = coachPayroll?.totalSessions || 0;

  // Chi tiết từng lớp HLV phụ trách
  const classBreakdowns = coachClasses.map((cls) => {
    const branch = dataStore.branches.find((b) => b.id === cls.branchId);
    const clsInvoices = dataStore.invoices.filter(
      (inv) => inv.classId === cls.id && inv.month === month && inv.year === year
    );
    const clsTuition = clsInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const clsCommission = Math.round(clsTuition * 0.5);

    // Sách phát trong lớp
    const clsSessions = dataStore.sessions.filter((s) => {
      if (s.classId !== cls.id) return false;
      const d = new Date(s.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    let clsBooks = 0;
    let clsBookRevenue = 0;
    clsSessions.forEach((sess) => {
      sess.records.forEach((rec) => {
        if (rec.bookPrice && rec.bookPrice > 0) {
          clsBooks += 1;
          clsBookRevenue += rec.bookPrice;
        }
      });
    });
    const clsBookCommission = Math.round(clsBookRevenue * 0.3);

    return {
      class: cls,
      branch,
      studentCount: clsInvoices.length,
      sessionCount: clsSessions.length,
      tuition: clsTuition,
      tuitionCommission: clsCommission,
      booksCount: clsBooks,
      bookRevenue: clsBookRevenue,
      bookCommission: clsBookCommission,
      totalIncome: clsCommission + clsBookCommission,
    };
  });

  // Nhật ký các ca dạy trong tháng
  const coachSessions = dataStore.sessions
    .filter((sess) => {
      if (!coachClassIds.includes(sess.classId)) return false;
      const d = new Date(sess.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Thu Nhập HLV
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Công thức: Thu nhập HLV = Tổng học phí × 50% + Tiền sách × 30%
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Số ca dạy */}
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <p className="text-xs font-semibold text-slate-500">Số Ca Dạy Đã Hoàn Thành</p>
          <p className="mt-1.5 text-3xl font-black text-slate-900">
            {totalSessions} <span className="text-base font-medium text-slate-500">ca</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Phụ trách {coachClasses.length} lớp học đang hoạt động
          </p>
        </div>

        {/* Card 2: 50% Học Phí */}
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">50% Học Phí Các Lớp</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-brand-primary border border-emerald-200">
              50%
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-black text-brand-primary">
            {formatCurrencyVND(tuitionCommission)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Từ tổng {formatCurrencyVND(totalTuition)} học phí
          </p>
        </div>

        {/* Card 3: 30% Tiền Sách */}
        <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">30% Tiền Sách Phát</p>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              30%
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-black text-amber-600">
            {formatCurrencyVND(bookCommission)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Từ {totalBooksCount} cuốn ({formatCurrencyVND(totalBookRevenue)})
          </p>
        </div>

        {/* Card 4: Tổng Thu Nhập HLV */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-soft text-white">
          <p className="text-xs font-semibold text-slate-300">Tổng Thu Nhập HLV Tháng {month}</p>
          <p className="mt-1.5 text-3xl font-black text-brand-secondary">
            {formatCurrencyVND(totalIncome)}
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            = {formatCurrencyVND(tuitionCommission)} + {formatCurrencyVND(bookCommission)}
          </p>
        </div>
      </div>

      {/* Breakdown by Class */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80">
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-900">
            Chi Tiết Thu Nhập Theo Từng Lớp Phụ Trách
          </h3>
          <p className="text-xs text-slate-500">
            Đối soát học phí thực học (50%) và doanh thu phát sách (30%) của từng lớp.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Lớp Học</th>
                <th className="px-4 py-3">Cơ Sở</th>
                <th className="px-4 py-3 text-center">Sĩ Số</th>
                <th className="px-4 py-3 text-right">Tổng Học Phí</th>
                <th className="px-4 py-3 text-right text-brand-primary">50% Học Phí</th>
                <th className="px-4 py-3 text-center">Sách Đã Phát</th>
                <th className="px-4 py-3 text-right">Tổng Tiền Sách</th>
                <th className="px-4 py-3 text-right text-amber-700">30% Tiền Sách</th>
                <th className="px-4 py-3 text-right font-black">Thu Nhập Lớp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classBreakdowns.map((b) => (
                <tr key={b.class.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {b.class.name}
                    <span className="block text-[10px] font-normal text-slate-500">{b.class.schedule}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.branch?.name}</td>
                  <td className="px-4 py-3 text-center font-bold">{b.studentCount} HV</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrencyVND(b.tuition)}</td>
                  <td className="px-4 py-3 text-right font-bold text-brand-primary">{formatCurrencyVND(b.tuitionCommission)}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-800">{b.booksCount} cuốn</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrencyVND(b.bookRevenue)}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">{formatCurrencyVND(b.bookCommission)}</td>
                  <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                    {formatCurrencyVND(b.totalIncome)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teaching Sessions Table */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80">
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-900">
            Nhật Ký Các Ca Dạy & Phát Sách Tháng {month}/{year}
          </h3>
          <p className="text-xs text-slate-500">
            Mỗi ca hoàn thành điểm danh và phát sách được ghi nhận vào bảng thu nhập đối soát cuối tháng.
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
                <th className="px-4 py-3">Chủ Đề Đã Dạy</th>
                <th className="px-4 py-3 text-center">Có Mặt</th>
                <th className="px-4 py-3">Sách Phát Trong Buổi</th>
                <th className="px-4 py-3 text-right">Tiền Sách</th>
                <th className="px-4 py-3 text-right text-amber-700">30% Sách</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coachSessions.map((sess, idx) => {
                const cls = dataStore.classes.find((c) => c.id === sess.classId);
                const branch = dataStore.branches.find((b) => b.id === cls?.branchId);
                const pCount = sess.records.filter((r) => r.status === "PRESENT").length;

                const booksInSess = sess.records.filter((r) => r.bookPrice && r.bookPrice > 0);
                const sessBookPrice = booksInSess.reduce((sum, r) => sum + (r.bookPrice || 0), 0);
                const sessBookCommission = Math.round(sessBookPrice * 0.3);

                return (
                  <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {new Date(sess.date).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{cls?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{branch?.name}</td>
                    <td className="px-4 py-3 text-slate-700 italic">{sess.topic}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-brand-primary border border-emerald-200">
                        {pCount} học sinh
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {booksInSess.length > 0 ? (
                        <div className="space-y-0.5">
                          {booksInSess.map((b) => (
                            <span
                              key={b.id}
                              className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200 mr-1"
                            >
                              📖 {b.bookTitle} ({formatCurrencyVND(b.bookPrice || 0)})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Không phát sách</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {sessBookPrice > 0 ? formatCurrencyVND(sessBookPrice) : "0 đ"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700">
                      {sessBookCommission > 0 ? `+${formatCurrencyVND(sessBookCommission)}` : "—"}
                    </td>
                  </tr>
                );
              })}
              {coachSessions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
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
