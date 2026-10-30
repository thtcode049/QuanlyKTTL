"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  User,
  Phone,
  Award,
  Building2,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  GraduationCap,
  ChevronLeft,
  Shield,
  Crown,
  ArrowRightLeft,
} from "lucide-react";
import { dataStore } from "@/lib/data-store";

export type RegisterSystemRole = "COACH" | "CHUNHIEM" | "PHOCHUNHIEM" | "CHUCOSO";

export default function RegisterPage() {
  const router = useRouter();

  // Role Selection
  const [systemRole, setSystemRole] = useState<RegisterSystemRole>("COACH");

  // Basic Account Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Professional & Branch Fields
  const [title, setTitle] = useState("HLV Quốc gia");
  const [experience, setExperience] = useState("3 năm");
  const [branchId, setBranchId] = useState("branch-1");
  const [bankName, setBankName] = useState("MBBank");
  const [bankAccount, setBankAccount] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const branches = dataStore.branches;

  // Auto-set default branch if available
  useEffect(() => {
    if (branches.length > 0 && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches]);

  const isAdminRole = systemRole === "CHUNHIEM" || systemRole === "PHOCHUNHIEM" || systemRole === "CHUCOSO";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate
    if (!name.trim()) {
      setError("Vui lòng nhập họ và tên của bạn");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (!phone.trim()) {
      setError("Vui lòng nhập số điện thoại liên hệ");
      return;
    }
    if (systemRole === "CHUCOSO" && !branchId) {
      setError("Vui lòng chọn cơ sở mà bạn quản lý");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          systemRole,
          role: systemRole === "CHUNHIEM" || systemRole === "PHOCHUNHIEM" ? "ADMIN" : "COACH",
          title:
            systemRole === "CHUNHIEM"
              ? "Chủ nhiệm CLB"
              : systemRole === "PHOCHUNHIEM"
              ? "Phó chủ nhiệm CLB"
              : systemRole === "CHUCOSO"
              ? `Chủ nhiệm cơ sở`
              : title,
          experience: isAdminRole ? "Ban Quản Trị CLB" : experience,
          branchId,
          bankName,
          bankAccount,
          accountHolder: accountHolder.toUpperCase() || name.toUpperCase(),
          bio,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        setError(resData.error || "Đăng ký không thành công. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      const createdUser = resData.user;

      // Đồng bộ vào dataStore của phiên hiện tại
      dataStore.users.push({
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        phone,
        password,
        role: createdUser.role,
        systemRole: createdUser.systemRole || systemRole,
        title: createdUser.title,
        branchId: createdUser.branchId,
        baseRate: systemRole === "CHUNHIEM" ? 0 : 200000,
        hasAdminAccess: isAdminRole,
      });
      dataStore.saveToLocalStorage();

      // Đăng nhập tự động
      const sessionUser = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        systemRole: createdUser.systemRole || systemRole,
        title: createdUser.title,
        branchId: createdUser.branchId,
        hasAdminAccess: isAdminRole,
      };
      localStorage.setItem("kttll_user", JSON.stringify(sessionUser));

      setSuccess(true);
      setTimeout(() => {
        if (isAdminRole) {
          router.push("/admin/coaches");
        } else {
          router.push("/coach/classes");
        }
      }, 1000);
    } catch (err: any) {
      console.error("Lỗi kết nối API:", err);
      setError("Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#F8FAF9]">
      {/* Left Chess Showcase Panel */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-[#161616] p-10 text-white lg:flex lg:w-5/12 xl:w-4/12">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#00B18A_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-primary/20 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-brand-secondary/20 blur-3xl" />

        {/* Top brand */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="relative h-12 w-12 rounded-full bg-white p-0.5 shadow-sm ring-2 ring-brand-primary flex items-center justify-center overflow-hidden">
            <img
              src="/logo.png"
              alt="Logo CLB Kiện Tướng Tương Lai"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase text-white">
              Kiện Tướng Tương Lai
            </h1>
            <p className="text-xs font-semibold text-brand-primary">
              Chess Management System • Cổng Đăng Ký CLB
            </p>
          </div>
        </div>

        {/* Middle message */}
        <div className="relative z-10 my-auto py-10">
          <span className="rounded-full bg-brand-primary/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-primary border border-brand-primary/30">
            Hệ Thống Đào Tạo & Điều Hành CLB
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            Gia Nhập CLB Kiện Tướng Tương Lai
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Cổng đăng ký thành viên chính thức dành cho Huấn luyện viên và Ban Quản Trị CLB: Điểm danh 1 chạm, quản lý học viên, đối soát học phí VietQR và phân quyền linh hoạt theo từng cơ sở.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 rounded-md bg-white/5 p-3.5 backdrop-blur-sm border border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Chuyển Đổi Vai Trò Linh Hoạt</p>
                <p className="text-slate-400">Ban Quản trị có thể chuyển qua lại giữa chế độ Admin và HLV để dạy lớp riêng</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md bg-white/5 p-3.5 backdrop-blur-sm border border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-amber-500/20 text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Phân Quyền Minh Bạch</p>
                <p className="text-slate-400">Chủ nhiệm, Phó chủ nhiệm và Chủ cơ sở quản lý đúng phạm vi trách nhiệm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom footer link */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <span>© 2026 CLB Cờ Vua Kiện Tướng Tương Lai</span>
          <Link href="/login" className="text-brand-primary hover:underline">
            Đã có tài khoản? Đăng nhập
          </Link>
        </div>
      </div>

      {/* Right Register Form */}
      <div className="flex flex-1 flex-col justify-center p-6 sm:p-10 lg:p-14 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl">
          {/* Top navigation back to Login */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Quay lại trang Đăng nhập</span>
            </Link>

            <span className="text-xs text-slate-500">
              Đã có tài khoản?{" "}
              <Link href="/login" className="font-bold text-brand-primary hover:underline">
                Đăng nhập
              </Link>
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Đăng Ký Tài Khoản Mới
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Chọn vai trò của bạn trong CLB và điền thông tin để bắt đầu sử dụng hệ thống.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-bounce" />
              <span>
                Đăng ký thành công! Đang chuyển hướng bạn vào hệ thống...
              </span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Vai trò tham gia hệ thống: HLV, Chủ nhiệm, Phó chủ nhiệm, Chủ nhiệm cơ sở */}
            <div className="rounded-md bg-white p-5 shadow-xs border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Xác nhận vai trò tài khoản *
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {isAdminRole ? "Có quyền Quản trị (Admin)" : "Quyền Huấn luyện viên"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Huấn luyện viên */}
                <button
                  type="button"
                  onClick={() => setSystemRole("COACH")}
                  className={`flex flex-col text-left p-3 rounded border transition-all ${
                    systemRole === "COACH"
                      ? "border-brand-primary bg-emerald-50/70 shadow-xs ring-1 ring-brand-primary"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-brand-primary" />
                    <span className="text-xs font-black text-slate-900">Huấn Luyện Viên (HLV)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                    Dạy học, điểm danh và quản lý các lớp học của riêng mình.
                  </p>
                </button>

                {/* 2. Chủ nhiệm CLB */}
                <button
                  type="button"
                  onClick={() => setSystemRole("CHUNHIEM")}
                  className={`flex flex-col text-left p-3 rounded border transition-all ${
                    systemRole === "CHUNHIEM"
                      ? "border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-500"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-600" />
                      <span className="text-xs font-black text-slate-900">Chủ nhiệm CLB</span>
                    </div>
                    <span className="rounded bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5">
                      Admin
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                    Toàn quyền phân quyền, giao nhiệm vụ và quản lý lương HLV toàn CLB.
                  </p>
                </button>

                {/* 3. Phó chủ nhiệm CLB */}
                <button
                  type="button"
                  onClick={() => setSystemRole("PHOCHUNHIEM")}
                  className={`flex flex-col text-left p-3 rounded border transition-all ${
                    systemRole === "PHOCHUNHIEM"
                      ? "border-indigo-500 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-500"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-black text-slate-900">Phó chủ nhiệm CLB</span>
                    </div>
                    <span className="rounded bg-indigo-100 text-indigo-800 text-[9px] font-black px-1.5 py-0.5">
                      Admin
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                    Điều hành CLB, giao việc, phân quyền và giám sát báo cáo tổng quan.
                  </p>
                </button>

                {/* 4. Chủ nhiệm cơ sở */}
                <button
                  type="button"
                  onClick={() => setSystemRole("CHUCOSO")}
                  className={`flex flex-col text-left p-3 rounded border transition-all ${
                    systemRole === "CHUCOSO"
                      ? "border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-black text-slate-900">Chủ nhiệm cơ sở</span>
                    </div>
                    <span className="rounded bg-blue-100 text-blue-800 text-[9px] font-black px-1.5 py-0.5">
                      Admin
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                    Quản lý hoạt động tại cơ sở được gán và dạy các lớp học riêng của mình.
                  </p>
                </button>
              </div>

              {/* Lời nhắc chuyển đổi vai trò cho tài khoản có quyền Admin */}
              {isAdminRole && (
                <div className="rounded bg-slate-50 p-3 border border-slate-200 flex items-start gap-2.5 text-[11px] text-slate-600">
                  <ArrowRightLeft className="h-4 w-4 text-brand-primary flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Lưu ý:</strong> Tài khoản có vai trò Quản trị (Chủ nhiệm, Phó chủ nhiệm, Chủ nhiệm cơ sở) có thể chuyển qua lại giữa màn hình <strong>Quản trị</strong> và màn hình <strong>Huấn luyện viên</strong> trên thanh menu để trực tiếp quản lý lớp học riêng của mình.
                  </span>
                </div>
              )}

              {/* CHỌN CƠ SỞ KHI LÀ CHỦ NHIỆM CƠ SỞ */}
              {systemRole === "CHUCOSO" && (
                <div className="rounded bg-blue-50/80 p-3.5 border border-blue-200 space-y-2 animate-fade-in">
                  <label className="block text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>Chọn cơ sở bạn làm Chủ nhiệm *</span>
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full rounded border border-blue-300 bg-white p-2 text-xs font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-blue-700">
                    Bạn sẽ chịu trách nhiệm quản lý cơ sở đào tạo này.
                  </p>
                </div>
              )}
            </div>

            {/* Section 1: Thông tin cá nhân & tài khoản */}
            <div className="rounded-md bg-white p-5 shadow-xs border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <User className="h-4 w-4 text-brand-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Thông tin cá nhân & Tài khoản đăng nhập
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Hoàng Tấn Đức"
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: ducth162000@gmail.com"
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Mật khẩu *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Nhập lại mật khẩu *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Xác nhận mật khẩu"
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912.xxx.xxx"
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>

                {systemRole !== "CHUCOSO" && (
                  <div>
                    <label className="block font-bold text-slate-700">Cơ sở sinh hoạt chính</label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none bg-white font-medium"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Chuyên môn & Tài khoản nhận lương */}
            <div className="rounded-md bg-white p-5 shadow-xs border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Thông tin thù lao giảng dạy & STK ngân hàng
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700">Tên ngân hàng</label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none bg-white font-medium"
                  >
                    <option value="MBBank">MBBank (Quân Đội)</option>
                    <option value="Vietcombank">Vietcombank</option>
                    <option value="Techcombank">Techcombank</option>
                    <option value="BIDV">BIDV</option>
                    <option value="ACB">ACB</option>
                    <option value="TPBank">TPBank</option>
                    <option value="VPBank">VPBank</option>
                    <option value="Agribank">Agribank</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Số tài khoản</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="STK nhận thù lao"
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Chủ tài khoản (In hoa)</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                    placeholder="VD: HOANG TAN DUC"
                    className="mt-1 w-full rounded border border-slate-300 p-2 text-xs focus:border-brand-primary focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="flex w-full items-center justify-center gap-2 rounded bg-brand-primary py-3 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover active:scale-[0.99] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Hoàn Tất Đăng Ký Tài Khoản</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
