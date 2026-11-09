"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Coins,
  Calendar,
  DollarSign,
  TrendingUp,
  BookOpen,
  Award,
  Sparkles,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { dataStore, resolveCanonicalCoachId, getCoachClasses, getClassBranchName, isPrivateClass } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function CoachPayrollPage() {
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);
  const [currentCoachId, setCurrentCoachId] = useState<string>("");
  const [currentCoachEmail, setCurrentCoachEmail] = useState<string>("");
  const [, setDataVersion] = useState(0);

  React.useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) setCurrentCoachId(u.id);
        if (u.email) setCurrentCoachEmail(u.email);
      } catch (e) {}
    }
    dataStore.syncWithDatabase().then(() => setDataVersion((v) => v + 1));
  }, []);

  // Lấy dữ liệu của HLV đang đăng nhập
  const currentCoach =
    dataStore.users.find(
      (u) =>
        (currentCoachId && u.id === currentCoachId) ||
        (currentCoachEmail && u.email && u.email.toLowerCase() === currentCoachEmail.toLowerCase())
    ) || (currentCoachId ? dataStore.users.find((u) => u.role === "COACH") : undefined);

  const coachClasses = getCoachClasses(currentCoachId, currentCoachEmail || currentCoach?.email);
  const coachClassIds = coachClasses.map((c) => c.id);

  // Tính toán thu nhập HLV theo công thức chuẩn: Tổng học phí * 50% + Tiền sách * 30%
  const payrollList = dataStore.getCoachPayroll(month, year);
  const coachPayroll = payrollList.find(
    (p) =>
      p.coachId === currentCoach?.id ||
      p.coachId === currentCoachId ||
      resolveCanonicalCoachId(p.coachId) === resolveCanonicalCoachId(currentCoachId)
  );

  const totalTuition = coachPayroll?.totalTuition || 0;
  const tuitionCommission = coachPayroll?.tuitionCommission || 0; // 50%
  const totalBooksCount = coachPayroll?.totalBooksCount || 0;
  const totalBookRevenue = coachPayroll?.totalBookRevenue || 0;
  const bookCommission = coachPayroll?.bookCommission || 0; // 30%
  const totalIncome = coachPayroll?.totalIncome || 0;
  const totalSessions = coachPayroll?.totalSessions || 0;

  // Chi tiết từng lớp HLV phụ trách
  const coachTuitionPct = coachPayroll?.tuitionRatePercent ?? 50;
  const coachBookPct = coachPayroll?.bookRatePercent ?? 30;

  const classBreakdowns = coachClasses.map((cls) => {
    const isPriv = isPrivateClass(cls);
    const branchName = getClassBranchName(cls);
    const clsInvoices = dataStore.invoices.filter(
      (inv) => inv.classId === cls.id && inv.month === month && inv.year === year
    );
    const clsTuition = clsInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    // Nếu là lớp riêng: HLV nhận đủ 100% học phí, không bị chia %. Nếu lớp cơ sở CLB: theo tỷ lệ của HLV (mặc định 50%)
    const tuitionPct = isPriv ? 100 : coachTuitionPct;
    const clsCommission = isPriv ? clsTuition : Math.round(clsTuition * (tuitionPct / 100));

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
    const clsBookCommission = Math.round(clsBookRevenue * (coachBookPct / 100));

    return {
      class: cls,
      isPrivate: isPriv,
      branchName,
      tuitionPct,
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
            Công thức: Lớp cơ sở CLB ({coachTuitionPct}% Học phí + {coachBookPct}% Sách) • Lớp riêng HLV (Nhận đủ 100% Học phí, không chia %)
          </p>
        </div>

        {/* Filter Month/Year */}
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none cursor-pointer"
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
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none cursor-pointer"
          >
            <option value={2026}>Năm 2026</option>
            <option value={2025}>Năm 2025</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Số ca dạy */}
        <div className="rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[11px] sm:text-xs font-medium text-slate-500">Số Ca Dạy Đã Hoàn Thành</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {totalSessions} <span className="text-sm sm:text-base font-medium text-slate-500">ca</span>
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-400">
            Phụ trách {coachClasses.length} lớp học
          </p>
        </div>

        {/* Card 2: Học Phí HLV */}
        <div className="rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">Thù Lao Học Phí</p>
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-primary border border-emerald-100">
              CLB: {coachTuitionPct}% | Riêng: 100%
            </span>
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-brand-primary tracking-tight">
            {formatCurrencyVND(tuitionCommission)}
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 truncate">
            Tổng học phí: {formatCurrencyVND(totalTuition)}
          </p>
        </div>

        {/* Card 3: Tiền Sách HLV */}
        <div className="rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500">
              {coachPayroll?.bookRatePercent || 30}% Tiền Sách
            </p>
            <Link
              href="/coach/books"
              className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
            >
              Chi tiết →
            </Link>
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-600 tracking-tight">
            {formatCurrencyVND(bookCommission)}
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 truncate" title={`Lớp: ${coachPayroll?.totalClassBooksCount || 0} cuốn • Ngoài: ${coachPayroll?.totalOutsideBooksCount || 0} cuốn`}>
            {totalBooksCount} cuốn (Lớp: {coachPayroll?.totalClassBooksCount || 0} • Ngoài: {coachPayroll?.totalOutsideBooksCount || 0})
          </p>
        </div>

        {/* Card 4: Tổng Thu Nhập HLV */}
        <div className="col-span-2 lg:col-span-1 rounded bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="text-[11px] sm:text-xs font-medium text-slate-300">Tổng Thu Nhập Tháng {month}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-brand-secondary tracking-tight">
            {formatCurrencyVND(totalIncome)}
          </p>
          <p className="mt-1 text-[10px] sm:text-[11px] text-slate-300">
            = {formatCurrencyVND(tuitionCommission)} + {formatCurrencyVND(bookCommission)}
          </p>
        </div>
      </div>

      {/* Breakdown by Class */}
      <div className="rounded bg-white border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-900">
            Chi Tiết Thu Nhập Theo Từng Lớp Phụ Trách
          </h3>
          <p className="text-xs text-slate-500">
            Lớp riêng nhận đủ 100% học phí không chia %. Lớp cơ sở CLB nhận {coachTuitionPct}% học phí và {coachBookPct}% tiền sách.
          </p>
        </div>

        {/* Mobile View: Thẻ danh sách từng lớp */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {classBreakdowns.map((b) => (
            <div key={b.class.id} className="p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm">{b.class.name}</h4>
                    {b.isPrivate && (
                      <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                        🔒 Lớp riêng (100% HP)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{b.branchName} • {b.class.schedule}</p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 whitespace-nowrap">
                  {b.studentCount} HV
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                    {b.tuitionPct}% Học phí {b.isPrivate ? "(Nhận đủ 100%)" : ""}
                  </span>
                  <span className="font-bold text-brand-primary">{formatCurrencyVND(b.tuitionCommission)}</span>
                  <span className="text-[10px] text-slate-400 block">/ {formatCurrencyVND(b.tuition)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">{coachBookPct}% Tiền sách ({b.booksCount})</span>
                  <span className="font-bold text-amber-700">{formatCurrencyVND(b.bookCommission)}</span>
                  <span className="text-[10px] text-slate-400 block">/ {formatCurrencyVND(b.bookRevenue)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <span className="font-medium text-slate-500">Tổng thu nhập lớp:</span>
                <span className="text-base font-bold text-slate-900">{formatCurrencyVND(b.totalIncome)}</span>
              </div>
            </div>
          ))}
          {classBreakdowns.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">Chưa có lớp nào</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Lớp Học</th>
                <th className="px-4 py-2.5">Cơ Sở</th>
                <th className="px-4 py-2.5 text-center">Sĩ Số</th>
                <th className="px-4 py-2.5 text-right">Tổng Học Phí</th>
                <th className="px-4 py-2.5 text-right text-brand-primary">Thù Lao Học Phí</th>
                <th className="px-4 py-2.5 text-center">Sách Đã Phát</th>
                <th className="px-4 py-2.5 text-right">Tổng Tiền Sách</th>
                <th className="px-4 py-2.5 text-right text-amber-700">{coachBookPct}% Sách</th>
                <th className="px-4 py-2.5 text-right font-bold">Thu Nhập Lớp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classBreakdowns.map((b) => (
                <tr key={b.class.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{b.class.name}</span>
                      {b.isPrivate && (
                        <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                          🔒 Lớp riêng (100%)
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] font-normal text-slate-500">{b.class.schedule}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.branchName}</td>
                  <td className="px-4 py-3 text-center font-semibold">{b.studentCount} HV</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrencyVND(b.tuition)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-primary">
                    {formatCurrencyVND(b.tuitionCommission)}
                    <span className="block text-[10px] font-normal text-slate-400">
                      ({b.tuitionPct}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-slate-800">{b.booksCount} cuốn</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">{formatCurrencyVND(b.bookRevenue)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-700">{formatCurrencyVND(b.bookCommission)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                    {formatCurrencyVND(b.totalIncome)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teaching Sessions Table */}
      <div className="rounded bg-white border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-900">
            Nhật Ký Các Ca Dạy & Phát Sách Tháng {month}/{year}
          </h3>
          <p className="text-xs text-slate-500">
            Mỗi ca hoàn thành điểm danh và phát sách được ghi nhận vào bảng thu nhập đối soát cuối tháng.
          </p>
        </div>

        {/* Mobile View: Thẻ danh sách ca dạy */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {coachSessions.map((sess, idx) => {
            const cls = dataStore.classes.find((c) => c.id === sess.classId);
            const branchName = getClassBranchName(cls);
            const pCount = sess.records.filter((r) => r.status === "PRESENT").length;

            const booksInSess = sess.records.filter((r) => r.bookPrice && r.bookPrice > 0);
            const sessBookPrice = booksInSess.reduce((sum, r) => sum + (r.bookPrice || 0), 0);
            const sessBookCommission = Math.round(sessBookPrice * 0.3);

            return (
              <div key={sess.id} className="p-3.5 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">#{idx + 1} {cls?.name}</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-brand-primary border border-emerald-200">
                        {pCount} HV có mặt
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {new Date(sess.date).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })} • {branchName}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded p-2.5 space-y-1.5">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Chủ đề: </span>
                    <span className="font-medium text-slate-800 italic">{sess.topic}</span>
                  </div>

                  {booksInSess.length > 0 && (
                    <div className="pt-1 border-t border-slate-200/60">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-amber-800">📖 {booksInSess.map((b) => b.bookTitle).join(", ")}</span>
                        <span className="font-bold text-amber-700">+{formatCurrencyVND(sessBookCommission)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {coachSessions.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">Chưa có ca dạy nào trong tháng này.</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">STT</th>
                <th className="px-4 py-2.5">Ngày Dạy</th>
                <th className="px-4 py-2.5">Lớp Học</th>
                <th className="px-4 py-2.5">Cơ Sở</th>
                <th className="px-4 py-2.5">Chủ Đề Đã Dạy</th>
                <th className="px-4 py-2.5 text-center">Có Mặt</th>
                <th className="px-4 py-2.5">Sách Phát Trong Buổi</th>
                <th className="px-4 py-2.5 text-right">Tiền Sách</th>
                <th className="px-4 py-2.5 text-right text-amber-700">30% Sách</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coachSessions.map((sess, idx) => {
                const cls = dataStore.classes.find((c) => c.id === sess.classId);
                const branchName = getClassBranchName(cls);
                const pCount = sess.records.filter((r) => r.status === "PRESENT").length;

                const booksInSess = sess.records.filter((r) => r.bookPrice && r.bookPrice > 0);
                const sessBookPrice = booksInSess.reduce((sum, r) => sum + (r.bookPrice || 0), 0);
                const sessBookCommission = Math.round(sessBookPrice * 0.3);

                return (
                  <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {new Date(sess.date).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{cls?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{branchName}</td>
                    <td className="px-4 py-3 text-slate-700 italic">{sess.topic}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-brand-primary border border-emerald-200">
                        {pCount} học sinh
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {booksInSess.length > 0 ? (
                        <div className="space-y-0.5">
                          {booksInSess.map((b) => (
                            <span
                              key={b.id}
                              className="inline-block rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200 mr-1"
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
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">
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

      {/* Mục Sách HLV Mua / Lấy Phát Ngoài */}
      <div className="rounded bg-white border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-600" />
              <span>Sách HLV Lấy Phát Ngoài Lớp (HLV Mua)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Các đầu sách HLV lấy để phát cho những nơi khác ngoài lớp của KTTL trong tháng {month}/{year}.
            </p>
          </div>
          <Link
            href="/coach/books"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-emerald-50 transition-colors w-fit"
          >
            <span>Quản lý & Nhập sách</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Số cuốn lấy ngoài</span>
            <p className="mt-1 text-lg font-black text-slate-900">
              {coachPayroll?.totalOutsideBooksCount || 0} cuốn
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Doanh số sách ngoài</span>
            <p className="mt-1 text-lg font-black text-slate-900">
              {formatCurrencyVND(coachPayroll?.totalOutsideBookRevenue || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50/70 p-3 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 block uppercase">
              Hoa hồng HLV (+{coachPayroll?.bookRatePercent || 30}%)
            </span>
            <p className="mt-1 text-lg font-black text-emerald-700">
              +{formatCurrencyVND(Math.round((coachPayroll?.totalOutsideBookRevenue || 0) * ((coachPayroll?.bookRatePercent || 30) / 100)))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
