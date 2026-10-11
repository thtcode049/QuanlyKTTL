"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
  Check,
  ChevronRight,
  Award,
  CreditCard,
  QrCode,
  Send,
} from "lucide-react";
import { dataStore, BranchData, ClassroomData, MonthlyInvoiceData } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function AdminDashboardPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [month, setMonth] = useState<number>(10);
  const [year, setYear] = useState<number>(2026);
  const [invoices, setInvoices] = useState<MonthlyInvoiceData[]>([]);

  // Load and calculate invoices
  const refreshInvoices = () => {
    dataStore.recalculateAllInvoices(month, year);
    setInvoices([...dataStore.invoices]);
  };

  useEffect(() => {
    refreshInvoices();
  }, [month, year]);

  // Lọc theo cơ sở
  const filteredInvoices = invoices.filter((inv) => {
    if (selectedBranchId === "ALL") return true;
    const cls = dataStore.classes.find((c) => c.id === inv.classId);
    return cls?.branchId === selectedBranchId;
  });

  // Tính các chỉ số KPI
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidRevenue = filteredInvoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingRevenue = totalRevenue - paidRevenue;
  const paymentRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

  // Tổng số học viên
  const activeStudentsCount = dataStore.students.length;
  const activeClassesCount = dataStore.classes.length;
  const coachesCount = dataStore.users.filter((u) => u.role === "COACH").length;

  // Tỷ lệ chuyên cần tháng
  let totalSessionRecords = 0;
  let totalPresentRecords = 0;
  dataStore.sessions.forEach((s) => {
    s.records.forEach((r) => {
      totalSessionRecords++;
      if (r.status === "PRESENT") totalPresentRecords++;
    });
  });
  const attendanceRate =
    totalSessionRecords > 0
      ? Math.round((totalPresentRecords / totalSessionRecords) * 100)
      : 92;

  // 1-Click toggle trạng thái thanh toán
  const togglePaymentStatus = (invId: string) => {
    const inv = dataStore.invoices.find((i) => i.id === invId);
    if (inv) {
      inv.status = inv.status === "PAID" ? "PENDING" : "PAID";
      refreshInvoices();
    }
  };

  // Doanh thu theo từng cơ sở để vẽ biểu đồ thanh
  const branchRevenueList = dataStore.branches.map((b) => {
    const bClasses = dataStore.classes.filter((c) => c.branchId === b.id).map((c) => c.id);
    const bInvoices = invoices.filter((inv) => bClasses.includes(inv.classId));
    const revenue = bInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paid = bInvoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    return {
      branchId: b.id,
      name: b.name,
      revenue,
      paid,
      pending: revenue - paid,
      studentsCount: dataStore.students.filter((s) =>
        s.classIds.some((cid) => bClasses.includes(cid))
      ).length,
    };
  });

  const maxBranchRevenue = Math.max(...branchRevenueList.map((b) => b.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Tổng Quan Doanh Thu & Vận Hành
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Hệ thống đào tạo cờ vua đa cơ sở • Chuẩn hóa công thức Thực học - Thực trả.
          </p>
        </div>

        {/* Branch & Month Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Filter className="ml-2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="rounded-lg border-0 bg-transparent py-1.5 pl-1 pr-7 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="ALL">Toàn Bộ 4 Cơ Sở</option>
              {dataStore.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month selector */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800 shadow-sm focus:border-brand-primary focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                Tháng {m}/{year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Doanh thu tổng */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Doanh Thu Toàn Bộ (Thực học)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-brand-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatCurrencyVND(totalRevenue)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+15.2% so với tháng trước</span>
          </div>
        </div>

        {/* Tỷ lệ đã thanh toán */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Đã Thu Học Phí</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-brand-primary">
            {formatCurrencyVND(paidRevenue)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Tiến độ thu: <strong>{paymentRate}%</strong></span>
            <span className="font-semibold text-amber-600">Nợ: {formatCurrencyVND(pendingRevenue)}</span>
          </div>
        </div>

        {/* Tỷ lệ chuyên cần */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tỷ Lệ Chuyên Cần</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {attendanceRate}%
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Học viên tham gia tích cực các buổi học
          </p>
        </div>

        {/* Học viên & Lớp học */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Học Viên Hoạt Động</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {activeStudentsCount} <span className="text-sm font-semibold text-slate-500">kỳ thủ</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Phân bố trong <strong>{activeClassesCount} lớp</strong> • <strong>{coachesCount} HLV</strong>
          </p>
        </div>
      </div>

      {/* Visual Chart: Doanh Thu Theo Cơ Sở */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Doanh thu biểu đồ cơ sở */}
        <div className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200/80 lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Doanh Thu Chi Tiết Theo Cơ Sở (Tháng {month}/{year})
              </h3>
              <p className="text-xs text-slate-500">
                Thống kê học phí Thực học của từng cơ sở đào tạo tại Hà Nội
              </p>
            </div>
            <Link
              href="/admin/branches"
              className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:underline"
            >
              <span>Quản trị cơ sở</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {branchRevenueList.map((b) => {
              const percent = Math.round((b.revenue / maxBranchRevenue) * 100);
              const paidPercent = b.revenue > 0 ? Math.round((b.paid / b.revenue) * 100) : 0;

              return (
                <div key={b.branchId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{b.name}</span>
                    <span className="font-black text-slate-900">
                      {formatCurrencyVND(b.revenue)}
                    </span>
                  </div>

                  {/* Progress bars: Total vs Paid */}
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-primary to-emerald-500 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{b.studentsCount} học viên</span>
                    <span className="font-medium text-emerald-700">
                      Đã thu: {formatCurrencyVND(b.paid)} ({paidPercent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Link Card / Action Hub */}
        <div className="space-y-4 lg:col-span-4">
          {/* Quick Actions */}
          <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Tác Vụ Quản Trị Nhanh</h3>
            <div className="space-y-2">
              <Link
                href="/admin/payroll"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-800 transition-all hover:bg-slate-100 border border-slate-200/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-brand-primary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <span>Xuất Bảng Lương HLV Tháng</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/classes"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-800 transition-all hover:bg-slate-100 border border-slate-200/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span>Xem Lịch & Can Thiệp Điểm Danh</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-800 transition-all hover:bg-slate-100 border border-slate-200/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-brand-secondary">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <span>Cấu hình VietQR & Zalo OA</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Top Kỳ Thủ Nhí CLB */}
          <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-3">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Top Kỳ Thủ Nhí CLB (Theo Elo)</span>
            </div>
            <div className="space-y-2">
              {[...dataStore.students]
                .sort((a, b) => b.eloRating - a.eloRating)
                .slice(0, 4)
                .map((std, idx) => (
                  <div key={std.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-black text-amber-800">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800">{std.fullName}</span>
                    </div>
                    <span className="font-black text-amber-700">★ {std.eloRating}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Invoices Management Table */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Đối Soát Tình Trạng Thu Học Phí Toàn CLB ({filteredInvoices.length} Học Viên)
            </h3>
            <p className="text-xs text-slate-500">
              Chuyển đổi trạng thái Đã thu / Chờ thu 1-click để kế toán cập nhật tức thì.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-brand-primary border border-emerald-200">
              Đã thu: {filteredInvoices.filter((i) => i.status === "PAID").length}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              Chờ thu: {filteredInvoices.filter((i) => i.status === "PENDING").length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã HĐ</th>
                <th className="px-4 py-3">Học Viên</th>
                <th className="px-4 py-3">Lớp Học</th>
                <th className="px-4 py-3 text-center">Buổi Có Mặt</th>
                <th className="px-4 py-3 text-right">Tổng Tiền</th>
                <th className="px-4 py-3 text-center">Trạng Thái</th>
                <th className="px-4 py-3 text-center">Đổi Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.slice(0, 10).map((inv) => {
                const student = dataStore.students.find((s) => s.id === inv.studentId);
                const cls = dataStore.classes.find((c) => c.id === inv.classId);

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-600">
                      {inv.invoiceCode}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {student?.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cls?.name}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-brand-primary">
                      {inv.presentCount} buổi
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {formatCurrencyVND(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        inv.status === "PAID"
                          ? "bg-emerald-100 text-brand-primary"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {inv.status === "PAID" ? "Đã thanh toán" : "Chờ đóng"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePaymentStatus(inv.id)}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 active:scale-95"
                      >
                        Đổi sang {inv.status === "PAID" ? "Chờ đóng" : "Đã thu"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
