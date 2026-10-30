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
import { dataStore, BranchData, ClassroomData, MonthlyInvoiceData, resolveCanonicalCoachId } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function AdminDashboardPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [month, setMonth] = useState<number>(10);
  const [year, setYear] = useState<number>(2026);
  const [invoices, setInvoices] = useState<MonthlyInvoiceData[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load user & check role
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
        if (merged.systemRole === "CHUCOSO" && merged.branchId) {
          setSelectedBranchId(merged.branchId);
        }
      } catch (e) {}
    }
  }, []);

  const isBranchManager = currentUser?.systemRole === "CHUCOSO";
  const userBranch = dataStore.branches.find((b) => b.id === (isBranchManager ? currentUser?.branchId : selectedBranchId));

  // Load and calculate invoices
  const refreshInvoices = () => {
    dataStore.recalculateAllInvoices(month, year);
    setInvoices([...dataStore.invoices]);
  };

  useEffect(() => {
    refreshInvoices();
  }, [month, year]);

  // Danh sách các lớp học được chia sẻ với Admin
  const adminClasses = dataStore.classes.filter((c) => c.shareWithAdmin !== false);
  const adminClassIds = new Set(adminClasses.map((c) => c.id));

  // Lọc theo cơ sở và chỉ lấy lớp được chia sẻ với Admin
  const filteredInvoices = invoices.filter((inv) => {
    if (!adminClassIds.has(inv.classId)) return false;
    if (selectedBranchId === "ALL") return true;
    const cls = adminClasses.find((c) => c.id === inv.classId);
    return cls?.branchId === selectedBranchId;
  });

  // Tính các chỉ số KPI
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidRevenue = filteredInvoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingRevenue = totalRevenue - paidRevenue;
  const paymentRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

  // Lớp thuộc cơ sở được chọn
  const branchClasses = selectedBranchId === "ALL"
    ? adminClasses
    : adminClasses.filter((c) => c.branchId === selectedBranchId);
  const branchClassIds = new Set(branchClasses.map((c) => c.id));

  // Tổng số học viên
  const activeStudentsCount = selectedBranchId === "ALL"
    ? dataStore.students.length
    : dataStore.students.filter((s) => s.classIds.some((cid) => branchClassIds.has(cid))).length;
  const activeClassesCount = branchClasses.length;
  const coachesCount = selectedBranchId === "ALL"
    ? dataStore.users.filter((u) => u.role === "COACH").length
    : dataStore.users.filter(
        (u) => u.role === "COACH" && (u.branchId === selectedBranchId || branchClasses.some((c) => c.coachId === u.id))
      ).length;

  // Tỷ lệ chuyên cần tháng
  let totalSessionRecords = 0;
  let totalPresentRecords = 0;
  dataStore.sessions.forEach((s) => {
    if (selectedBranchId !== "ALL" && !branchClassIds.has(s.classId)) return;
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

  // Doanh thu theo từng cơ sở (nếu là chủ cơ sở thì chỉ hiển thị cơ sở của mình)
  const availableBranches = isBranchManager
    ? dataStore.branches.filter((b) => b.id === currentUser?.branchId)
    : dataStore.branches;

  const branchRevenueList = availableBranches.map((b) => {
    const bClasses = adminClasses.filter((c) => c.branchId === b.id).map((c) => c.id);
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              Tổng Quan Doanh Thu & Vận Hành
            </h1>
            {isBranchManager && (
              <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                {userBranch?.name.split("–")[0].trim() || "Cơ sở của bạn"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isBranchManager
              ? `Thống kê vận hành và doanh thu thuộc riêng cơ sở: ${userBranch?.name}`
              : "Hệ thống đào tạo cờ vua đa cơ sở • Toàn bộ thông tin CLB Kiện Tướng Tương Lai."}
          </p>
        </div>

        {/* Branch & Month Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Branch filter */}
          {isBranchManager ? (
            <div className="flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>{userBranch?.name.split("–")[0].trim() || "Cơ sở của bạn"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="border-0 bg-transparent py-1 pl-1 pr-6 text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Toàn Bộ 8 Cơ Sở</option>
                {dataStore.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month selector */}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none cursor-pointer"
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Doanh thu tổng */}
        <div className="relative overflow-hidden rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">Doanh Thu Toàn Bộ</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded bg-emerald-50 text-brand-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrencyVND(totalRevenue)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-[11px] sm:text-xs text-emerald-600 font-medium truncate">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
            <span>+15.2% tháng trước</span>
          </div>
        </div>

        {/* Tỷ lệ đã thanh toán */}
        <div className="relative overflow-hidden rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">Đã Thu Học Phí</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded bg-blue-50 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-brand-primary tracking-tight">
            {formatCurrencyVND(paidRevenue)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span>Thu: <strong>{paymentRate}%</strong></span>
            <span className="font-medium text-amber-600 truncate">Nợ: {formatCurrencyVND(pendingRevenue)}</span>
          </div>
        </div>

        {/* Tỷ lệ chuyên cần */}
        <div className="relative overflow-hidden rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">Tỷ Lệ Chuyên Cần</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded bg-purple-50 text-purple-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {attendanceRate}%
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-slate-500">
            Đúng lịch giảng dạy
          </p>
        </div>

        {/* Học viên & Lớp học */}
        <div className="relative overflow-hidden rounded bg-white p-4 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">Học Viên Hoạt Động</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded bg-amber-50 text-amber-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {activeStudentsCount} <span className="text-xs sm:text-sm font-medium text-slate-500">HV</span>
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-slate-500 truncate">
            {activeClassesCount} lớp • {coachesCount} HLV
          </p>
        </div>
      </div>

      {/* Visual Chart: Doanh Thu Theo Cơ Sở */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Doanh thu biểu đồ cơ sở */}
        <div className="rounded bg-white p-5 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Doanh Thu Chi Tiết Theo Cơ Sở (Tháng {month}/{year})
              </h3>
              <p className="text-xs text-slate-500">
                Thống kê học phí Thực học của từng cơ sở đào tạo tại Hà Nội
              </p>
            </div>
            <Link
              href="/admin/branches"
              className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
            >
              <span>Quản trị cơ sở</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3.5">
            {branchRevenueList.map((b) => {
              const percent = Math.round((b.revenue / maxBranchRevenue) * 100);
              const paidPercent = b.revenue > 0 ? Math.round((b.paid / b.revenue) * 100) : 0;

              return (
                <div key={b.branchId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{b.name}</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrencyVND(b.revenue)}
                    </span>
                  </div>

                  {/* Progress bars: Total vs Paid */}
                  <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full rounded bg-brand-primary transition-all duration-500"
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
          <div className="rounded bg-white p-5 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Tác Vụ Quản Trị Nhanh</h3>
            <div className="space-y-2">
              <Link
                href="/admin/payroll"
                className="flex items-center justify-between rounded bg-slate-50/70 p-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-50 text-brand-primary">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                  <span>Xuất Bảng Lương HLV Tháng</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/classes"
                className="flex items-center justify-between rounded bg-slate-50/70 p-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <span>Xem Lịch & Can Thiệp Điểm Danh</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center justify-between rounded bg-slate-50/70 p-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-amber-50 text-amber-600">
                    <QrCode className="h-3.5 w-3.5" />
                  </div>
                  <span>Cấu hình VietQR & Zalo</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Học Viên Tiêu Biểu CLB */}
          <div className="rounded bg-white p-5 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              <Award className="h-4 w-4 text-amber-500" />
              <span>Học Viên Tiêu Biểu CLB</span>
            </div>
            <div className="space-y-2">
              {[...dataStore.students]
                .slice(0, 4)
                .map((std, idx) => (
                  <div key={std.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-50 text-[10px] font-bold text-brand-primary">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{std.fullName}</span>
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {dataStore.classes.find((c) => std.classIds.includes(c.id))?.name || "Chưa xếp lớp"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Invoices Management Table */}
      <div className="rounded bg-white border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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
            <span className="rounded bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-brand-primary border border-emerald-100">
              Đã thu: {filteredInvoices.filter((i) => i.status === "PAID").length}
            </span>
            <span className="rounded bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-100">
              Chờ thu: {filteredInvoices.filter((i) => i.status === "PENDING").length}
            </span>
          </div>
        </div>

        {/* Mobile View: Thẻ hoá đơn di động */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {filteredInvoices.slice(0, 10).map((inv) => {
            const student = dataStore.students.find((s) => s.id === inv.studentId);
            const cls = dataStore.classes.find((c) => c.id === inv.classId);

            return (
              <div key={inv.id} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-medium text-slate-400 block">{inv.invoiceCode}</span>
                    <h4 className="font-semibold text-slate-900 text-sm">{student?.fullName}</h4>
                    <p className="text-xs text-slate-500">{cls?.name}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                    inv.status === "PAID"
                      ? "bg-emerald-50 text-brand-primary border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}>
                    {inv.status === "PAID" ? "Đã thanh toán" : "Chờ đóng"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                  <span className="text-slate-600 font-medium">Buổi có mặt: <strong>{inv.presentCount} buổi</strong></span>
                  <span className="font-bold text-slate-900 text-sm">{formatCurrencyVND(inv.totalAmount)}</span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => togglePaymentStatus(inv.id)}
                    className="w-full rounded bg-slate-100 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 active:scale-98 text-center"
                  >
                    Đổi trạng thái sang: {inv.status === "PAID" ? "Chờ đóng" : "Đã thu tiền"}
                  </button>
                </div>
              </div>
            );
          })}
          {filteredInvoices.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">Không có dữ liệu đối soát</p>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Mã HĐ</th>
                <th className="px-4 py-2.5">Học Viên</th>
                <th className="px-4 py-2.5">Lớp Học</th>
                <th className="px-4 py-2.5 text-center">Buổi Có Mặt</th>
                <th className="px-4 py-2.5 text-right">Tổng Tiền</th>
                <th className="px-4 py-2.5 text-center">Trạng Thái</th>
                <th className="px-4 py-2.5 text-center">Đổi Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.slice(0, 10).map((inv) => {
                const student = dataStore.students.find((s) => s.id === inv.studentId);
                const cls = dataStore.classes.find((c) => c.id === inv.classId);

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-slate-600">
                      {inv.invoiceCode}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {student?.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cls?.name}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-brand-primary">
                      {inv.presentCount} buổi
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrencyVND(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                        inv.status === "PAID"
                          ? "bg-emerald-50 text-brand-primary border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}>
                        {inv.status === "PAID" ? "Đã thanh toán" : "Chờ đóng"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePaymentStatus(inv.id)}
                        className="rounded bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 active:scale-95"
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
