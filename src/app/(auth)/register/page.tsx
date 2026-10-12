"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { dataStore } from "@/lib/data-store";

export default function RegisterCoachPage() {
  const router = useRouter();

  // Form Fields
  const [selectedRole, setSelectedRole] = useState<"COACH" | "ADMIN">("COACH");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("HLV Quốc gia");
  const [adminTitle, setAdminTitle] = useState("Ban Chủ Nhiệm CLB");
  const [adminSecretCode, setAdminSecretCode] = useState("KTTLL2026");
  const [elo, setElo] = useState("2000");
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate
    if (!name.trim()) {
      setError("Vui lòng nhập họ và tên của " + (selectedRole === "ADMIN" ? "Quản trị viên" : "Huấn luyện viên"));
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
    if (selectedRole === "ADMIN" && !adminSecretCode.trim()) {
      setError("Vui lòng nhập Mã xác thực Quản trị viên (Mặc định: KTTLL2026)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          role: selectedRole,
          adminSecretCode: selectedRole === "ADMIN" ? adminSecretCode.trim() : undefined,
          title: selectedRole === "ADMIN" ? adminTitle : title,
          elo: selectedRole === "COACH" ? elo : undefined,
          experience: selectedRole === "COACH" ? experience : "Ban Quản Trị CLB",
          branchId,
          bankName: selectedRole === "COACH" ? bankName : undefined,
          bankAccount: selectedRole === "COACH" ? bankAccount : undefined,
          accountHolder: selectedRole === "COACH" ? (accountHolder.toUpperCase() || name.toUpperCase()) : undefined,
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
        title: createdUser.title,
        branchId: createdUser.branchId,
        baseRate: createdUser.role === "ADMIN" ? 0 : 200000,
        hasAdminAccess: createdUser.role === "ADMIN" || !!createdUser.hasAdminAccess,
      });
      dataStore.saveToLocalStorage();

      // Đăng nhập tự động
      const sessionUser = {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        title: createdUser.title,
        branchId: createdUser.branchId,
        hasAdminAccess: createdUser.role === "ADMIN" || !!createdUser.hasAdminAccess,
      };
      localStorage.setItem("kttll_user", JSON.stringify(sessionUser));

      setSuccess(true);
      setTimeout(() => {
        if (createdUser.role === "ADMIN") {
          router.push("/admin/dashboard");
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
              Chess Management System • HLV Portal
            </p>
          </div>
        </div>

        {/* Middle message */}
        <div className="relative z-10 my-auto py-10">
          <span className="rounded-full bg-brand-primary/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-primary border border-brand-primary/30">
            Gia Nhập Ban Huấn Luyện
          </span>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            Đào Tạo Thế Hệ Kỳ Thủ Tương Lai
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Hệ thống quản lý chuyên biệt cho Huấn luyện viên cờ vua: Điểm danh 1 chạm, theo dõi tiến độ Elo học sinh, nhận thù lao minh bạch 50% học phí thực dạy + 30% hoa hồng tài liệu.
          </p>

          <div className="mt-8 space-y-3.5">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Minh Bạch Thu Nhập</p>
                <p className="text-slate-400">Tự động tính thù lao theo ca dạy và số học viên có mặt thực tế</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3.5 backdrop-blur-sm border border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Hồ Sơ Kỳ Thủ Trực Quan</p>
                <p className="text-slate-400">Đánh giá 4 kỹ năng cờ vua và lưu ảnh hồ sơ từng học viên</p>
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

          {/* Role Switcher Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedRole("COACH")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                selectedRole === "COACH"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCheck className="h-4 w-4 text-brand-primary" />
              <span>Huấn Luyện Viên</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole("ADMIN")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                selectedRole === "ADMIN"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span>Ban Quản Trị CLB (Admin)</span>
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {selectedRole === "ADMIN" ? "Đăng Ký Ban Quản Trị CLB" : "Đăng Ký Huấn Luyện Viên"}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              {selectedRole === "ADMIN"
                ? "Dành cho Ban Chủ Nhiệm, Ban Giám Đốc và Quản lý cơ sở điều hành CLB Kiện Tướng Tương Lai."
                : "Điền đầy đủ thông tin chuyên môn của bạn để tham gia giảng dạy tại CLB Kiện Tướng Tương Lai."}
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-bounce" />
              <span>
                Đăng ký thành công! Đang chuyển hướng bạn vào không gian làm việc{" "}
                {selectedRole === "ADMIN" ? "Quản trị CLB" : "Huấn luyện viên"}...
              </span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Section 1: Thông tin cá nhân & tài khoản */}
            <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <User className="h-4 w-4 text-brand-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Thông tin cá nhân & Tài khoản đăng nhập
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700">
                    Họ và tên {selectedRole === "ADMIN" ? "Quản trị viên" : "HLV"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={selectedRole === "ADMIN" ? "VD: Bùi Vinh" : "VD: Nguyễn Văn Anh"}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={selectedRole === "ADMIN" ? "admin.buivinh@kttll.vn" : "hlv.nguyenvananh@kttll.vn"}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
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
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
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
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700">Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912.xxx.xxx"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Dành cho Ban Quản Trị hoặc Huấn Luyện Viên */}
            {selectedRole === "ADMIN" ? (
              <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Chức danh Quản trị & Mã xác thực CLB
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700">Vị trí / Chức vụ trong CLB</label>
                    <select
                      value={adminTitle}
                      onChange={(e) => setAdminTitle(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none bg-white font-medium"
                    >
                      <option value="Ban Chủ Nhiệm CLB">Ban Chủ Nhiệm CLB</option>
                      <option value="Chủ nhiệm CLB">Chủ nhiệm CLB</option>
                      <option value="Phó Chủ nhiệm CLB">Phó Chủ nhiệm CLB</option>
                      <option value="Trưởng ban Chuyên môn">Trưởng ban Chuyên môn</option>
                      <option value="Quản lý Cơ sở Đào tạo">Quản lý Cơ sở Đào tạo</option>
                      <option value="Kế toán & Tài chính CLB">Kế toán & Tài chính CLB</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700">Cơ sở phụ trách chính</label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none bg-white font-medium"
                    >
                      <option value="branch-all">Toàn bộ 8 cơ sở CLB</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700">
                      Mã xác thực Quản trị viên (Admin Secret Code) *
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
                        value={adminSecretCode}
                        onChange={(e) => setAdminSecretCode(e.target.value)}
                        placeholder="Nhập mã xác thực nội bộ CLB"
                        className="w-full rounded-xl border border-amber-300 bg-amber-50/30 p-2.5 font-mono text-xs font-bold text-amber-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Mã xác thực nội bộ để bảo mật quyền Admin CLB (Mặc định: <strong className="text-amber-700 font-mono">KTTLL2026</strong>).
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700">Ghi chú & Trách nhiệm quản lý</label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Phụ trách điều hành cơ sở, quản lý lịch học, tuyển sinh..."
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Section 2: Chuyên môn cờ vua & Cơ sở công tác cho HLV */}
                <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Award className="h-4 w-4 text-brand-secondary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      2. Chuyên môn cờ vua & Cơ sở công tác
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700">Danh hiệu / Học vị cờ vua</label>
                      <select
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none bg-white font-medium"
                      >
                        <option value="HLV Quốc gia">HLV Quốc gia</option>
                        <option value="Đại Kiện Tướng Quốc Tế (GM)">Đại Kiện Tướng Quốc Tế (GM)</option>
                        <option value="Kiện Tướng Quốc Tế (IM)">Kiện Tướng Quốc Tế (IM)</option>
                        <option value="Kiện Tướng FIDE (FM)">Kiện Tướng FIDE (FM)</option>
                        <option value="HLV Cờ Vua Cấp 1">HLV Cờ Vua Cấp 1</option>
                        <option value="Kiện Tướng Quốc Gia">Kiện Tướng Quốc Gia</option>
                        <option value="VĐV Đội Tuyển Tỉnh/Thành">VĐV Đội Tuyển Tỉnh/Thành</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">Hệ số Elo cờ vua</label>
                      <input
                        type="number"
                        value={elo}
                        onChange={(e) => setElo(e.target.value)}
                        placeholder="VD: 2150"
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">Kinh nghiệm giảng dạy</label>
                      <input
                        type="text"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="VD: 3 năm, 5 năm..."
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">Cơ sở giảng dạy chính</label>
                      <select
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none bg-white font-medium"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700">Tiểu sử & Triết lý giảng dạy</label>
                      <textarea
                        rows={2}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Giới thiệu ngắn về phương pháp huấn luyện cờ vua, thành tích thi đấu..."
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Thông tin nhận thù lao (Chỉ cho HLV) */}
                <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      3. Tài khoản nhận thù lao (50% học phí + 30% sách)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700">Tên ngân hàng</label>
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none bg-white font-medium"
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
                        placeholder="0987654321"
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700">Chủ tài khoản (In hoa)</label>
                      <input
                        type="text"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                        placeholder="NGUYEN VAN ANH"
                        className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-primary py-3.5 text-xs font-bold text-white shadow-lg shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>
                      {selectedRole === "ADMIN"
                        ? "Hoàn Tất Đăng Ký Ban Quản Trị CLB"
                        : "Hoàn Tất Đăng Ký & Bắt Đầu Giảng Dạy"}
                    </span>
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
