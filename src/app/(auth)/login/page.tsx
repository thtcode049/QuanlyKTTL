"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  CheckCircle2,
  CalendarCheck2,
  QrCode,
  ArrowRight,
  UserPlus,
  Award,
} from "lucide-react";
import { dataStore, resolveCanonicalCoachId } from "@/lib/data-store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Vui lòng nhập email hoặc chọn tài khoản mẫu phía dưới");
      return;
    }

    setLoading(true);

    try {
      // 1. Gửi yêu cầu xác thực tới Database API Supabase
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const sessionUser = { ...data.user };
        const canonicalId = resolveCanonicalCoachId(sessionUser.id || sessionUser.email);

        // Gán canonical id và admin access cho tài khoản nòng cốt để đồng bộ dữ liệu lớp và học sinh trên mọi thiết bị
        if (canonicalId === "user-coach-1" || canonicalId === "user-coach-2" || canonicalId === "user-admin") {
          sessionUser.id = canonicalId;
          sessionUser.hasAdminAccess = true;
          if (canonicalId === "user-coach-2") {
            sessionUser.name = "HLV Trần Huyền Trang";
            sessionUser.title = "HLV Quốc gia";
          } else if (canonicalId === "user-coach-1") {
            sessionUser.name = "GM Bùi Vinh";
            sessionUser.title = "Đại Kiện Tướng Quốc Tế";
          }
        }

        localStorage.setItem("kttll_user", JSON.stringify(sessionUser));

        // Đồng bộ tài khoản vào dataStore cục bộ để sử dụng ngay trong phiên
        const ex = dataStore.users.find(
          (u) =>
            u.id === sessionUser.id ||
            u.id === canonicalId ||
            u.email.toLowerCase() === sessionUser.email.toLowerCase()
        );
        if (!ex) {
          dataStore.users.push({
            id: sessionUser.id,
            name: sessionUser.name,
            email: sessionUser.email,
            phone: sessionUser.phone || "",
            role: sessionUser.role,
            title: sessionUser.title,
            branchId: sessionUser.branchId,
            baseRate: 200000,
            hasAdminAccess: sessionUser.hasAdminAccess,
          });
          dataStore.saveToLocalStorage();
        } else {
          Object.assign(ex, sessionUser);
          dataStore.saveToLocalStorage();
        }

        if (sessionUser.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/coach/classes");
        }
        return;
      }

      // 2. Nếu API trả về lỗi
      if (!res.ok) {
        setError(data.error || "Không tìm thấy tài khoản. Vui lòng kiểm tra lại email và mật khẩu.");
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Lỗi kết nối API xác thực, đang thử fallback bộ nhớ máy...", err);

      // Fallback offline (trong trường hợp mất kết nối mạng tạm thời)
      const foundUser = dataStore.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (foundUser) {
        if (foundUser.password && password && foundUser.password !== password) {
          setError("Mật khẩu không chính xác. Vui lòng kiểm tra lại.");
          setLoading(false);
          return;
        }

        const sessionUser = {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          title: foundUser.title || (foundUser.role === "ADMIN" ? "Chủ nhiệm CLB" : "HLV Quốc gia"),
          branchId: foundUser.branchId,
          hasAdminAccess: !!foundUser.hasAdminAccess,
        };
        localStorage.setItem("kttll_user", JSON.stringify(sessionUser));

        if (foundUser.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/coach/classes");
        }
        return;
      }

      setError("Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng.");
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: "ADMIN" | "COACH1" | "COACH2") => {
    if (role === "ADMIN") {
      setEmail("admin@kttll.vn");
      setPassword("admin123");
      const user = {
        id: "user-admin",
        email: "admin@kttll.vn",
        name: "Ban Chủ Nhiệm CLB",
        role: "ADMIN",
        title: "Chủ nhiệm toàn bộ cơ sở",
        hasAdminAccess: true,
      };
      localStorage.setItem("kttll_user", JSON.stringify(user));
      router.push("/admin/dashboard");
    } else if (role === "COACH1") {
      setEmail("hlv1@kttll.vn");
      setPassword("coach123");
      const dbCoach = dataStore.users.find((u) => u.id === "user-coach-1");
      const user = {
        id: "user-coach-1",
        email: "hlv1@kttll.vn",
        name: "GM Bùi Vinh",
        role: "COACH",
        title: "Đại Kiện Tướng Quốc Tế",
        hasAdminAccess: !!dbCoach?.hasAdminAccess,
      };
      localStorage.setItem("kttll_user", JSON.stringify(user));
      router.push("/coach/classes");
    } else {
      setEmail("hlv2@kttll.vn");
      setPassword("coach123");
      const user = {
        id: "user-coach-2",
        email: "hlv2@kttll.vn",
        name: "HLV Trần Huyền Trang",
        role: "COACH",
        title: "HLV Quốc gia",
        hasAdminAccess: true,
      };
      localStorage.setItem("kttll_user", JSON.stringify(user));
      router.push("/coach/classes");
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Chess Showcase Panel */}
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-[#161616] p-10 text-white lg:flex lg:w-1/2 xl:w-5/12">
        {/* Subtle chess board watermark */}
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
              Chess Management System • Est. by GM Bùi Vinh
            </p>
          </div>
        </div>

        {/* Middle message */}
        <div className="relative z-10 my-auto py-12">
          <h2 className="text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            Hệ thống Quản lý Đào tạo Cờ vua Đa cơ sở
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Học viên đi học buổi nào tính phí buổi đó, nghỉ không tính phí. Tự động hóa điểm danh 1 chạm trên di động, đối soát học phí với VietQR động và gửi thông báo qua Zalo OA.
          </p>

          {/* Core Highlights */}
          <div className="mt-8 space-y-3.5">
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary/20 text-brand-primary">
                <CalendarCheck2 className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Điểm danh 1 chạm Mobile</p>
                <p className="text-slate-400">HLV điểm danh nhanh ngay trên điện thoại trong lớp học</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 backdrop-blur-sm border border-white/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-secondary/20 text-brand-secondary">
                <QrCode className="h-5 w-5" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Mã VietQR Động & Zalo OA</p>
                <p className="text-slate-400">Tự động sinh mã chuyển khoản chuẩn Napas và tin nhắn phụ huynh</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <span>© 2026 CLB Cờ Vua Kiện Tướng Tương Lai</span>
          <a
            href="https://kientuongtuonglai.com"
            target="_blank"
            rel="noreferrer"
            className="text-brand-primary hover:underline"
          >
            kientuongtuonglai.com
          </a>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex flex-1 flex-col justify-center bg-[#F8FAF9] p-6 sm:p-12 lg:p-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo display */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="relative h-11 w-11 rounded-full bg-white p-0.5 shadow-sm ring-2 ring-brand-primary flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="Logo CLB"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-base font-extrabold uppercase text-slate-900">
                Kiện Tướng Tương Lai
              </h2>
              <p className="text-xs text-brand-primary font-medium">Chess Management System</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Đăng nhập Hệ Thống
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Vui lòng đăng nhập để tiếp tục quản lý lớp học và cơ sở đào tạo.
            </p>
          </div>

          {/* Quick Demo Access Buttons */}
          <div className="mb-6 rounded-2xl bg-white p-4 shadow-soft border border-slate-200/80">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              ⚡ Truy cập nhanh tài khoản thử nghiệm:
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleQuickLogin("ADMIN")}
                className="group flex items-center gap-2 rounded-xl border border-slate-800 bg-[#161616] p-2.5 text-left text-white transition-all hover:bg-slate-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-brand-secondary flex-shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">Ban Quản Trị</p>
                  <p className="text-[10px] text-slate-300 truncate">admin@kttll.vn</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("COACH1")}
                className="group flex items-center gap-2 rounded-xl border border-brand-primary bg-emerald-500/10 p-2.5 text-left text-slate-900 transition-all hover:bg-emerald-500/20"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-white flex-shrink-0">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-brand-primary truncate">GM Bùi Vinh</p>
                  <p className="text-[10px] text-slate-500 truncate">hlv1@kttll.vn</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("COACH2")}
                className="group flex items-center gap-2 rounded-xl border border-teal-600 bg-teal-500/10 p-2.5 text-left text-slate-900 transition-all hover:bg-teal-500/20"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white flex-shrink-0">
                  <Award className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-teal-800 truncate">HLV Huyền Trang</p>
                  <p className="text-[10px] text-slate-500 truncate">hlv2@kttll.vn</p>
                </div>
              </button>
            </div>
          </div>

          {/* Regular Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700">Email đăng nhập</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kttll.vn hoặc hlv1@kttll.vn"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                <span className="text-[11px] text-slate-500">Mặc định: admin123 / coach123</span>
              </div>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-xs font-bold text-white shadow-md shadow-brand-primary/25 transition-all hover:bg-brand-primary-hover active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Box for New Members (Admin & Coach) */}
          <div className="mt-6 rounded-2xl bg-white p-4.5 shadow-soft border border-slate-200/80">
            <div className="text-center mb-3">
              <p className="text-xs font-bold text-slate-800">
                Chưa có tài khoản tham gia hệ thống?
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Đăng ký tài khoản mới dành cho Huấn luyện viên hoặc Ban Quản Trị CLB
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                href="/register?role=coach"
                className="group flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50/60 p-2.5 text-xs font-bold text-emerald-800 transition-all hover:bg-brand-primary hover:text-white shadow-sm active:scale-95 text-center"
              >
                <UserCheck className="h-4 w-4 text-brand-primary group-hover:text-white transition-colors" />
                <span>Đăng Ký Huấn Luyện Viên</span>
              </Link>

              <Link
                href="/register?role=admin"
                className="group flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 shadow-sm active:scale-95 text-center"
              >
                <ShieldCheck className="h-4 w-4 text-brand-secondary" />
                <span>Đăng Ký Ban Quản Trị</span>
              </Link>
            </div>
          </div>

          {/* System note */}
          <div className="mt-6 rounded-xl bg-slate-100/80 p-3 text-center text-[11px] text-slate-500 border border-slate-200">
            Hệ thống hỗ trợ cơ chế lưu trữ kép Supabase PostgreSQL & Local Dev Fallback. Sẵn sàng cấu hình biến môi trường và deploy lên Vercel.
          </div>
        </div>
      </div>
    </div>
  );
}
