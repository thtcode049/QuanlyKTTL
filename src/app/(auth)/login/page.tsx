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
} from "lucide-react";
import { dataStore } from "@/lib/data-store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (!email) {
      setError("Vui lòng nhập email hoặc chọn tài khoản mẫu phía dưới");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      // 1. Kiểm tra tài khoản trong dataStore (Bao gồm cả HLV vừa đăng ký)
      const foundUser = dataStore.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (foundUser) {
        // Kiểm tra mật khẩu nếu tài khoản có mật khẩu riêng
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

      // 2. Fallback nhận diện theo từ khóa email
      if (email.toLowerCase().includes("admin")) {
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
      } else if (email.toLowerCase().includes("hlv")) {
        const isCoach2 = email.includes("hlv2");
        const coachId = isCoach2 ? "user-coach-2" : "user-coach-1";
        const dbCoach = dataStore.users.find((u) => u.id === coachId);
        const user = {
          id: coachId,
          email: isCoach2 ? "hlv2@kttll.vn" : "hlv1@kttll.vn",
          name: isCoach2 ? "HLV Trần Huyền Trang" : "GM Bùi Vinh",
          role: "COACH",
          title: isCoach2 ? "HLV Quốc gia" : "Đại Kiện Tướng Quốc Tế",
          hasAdminAccess: !!dbCoach?.hasAdminAccess,
        };
        localStorage.setItem("kttll_user", JSON.stringify(user));
        router.push("/coach/classes");
      } else {
        setError("Không tìm thấy tài khoản với email này. Vui lòng kiểm tra lại hoặc đăng ký tài khoản HLV mới.");
        setLoading(false);
      }
    }, 400);
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
      const dbCoach = dataStore.users.find((u) => u.id === "user-coach-2");
      const user = {
        id: "user-coach-2",
        email: "hlv2@kttll.vn",
        name: "HLV Trần Huyền Trang",
        role: "COACH",
        title: "HLV Quốc gia",
        hasAdminAccess: !!dbCoach?.hasAdminAccess,
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("ADMIN")}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#161616] p-2.5 text-left text-white transition-all hover:bg-slate-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-brand-secondary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Ban Quản Trị (Admin)</p>
                  <p className="text-[10px] text-slate-300">admin@kttll.vn</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("COACH1")}
                className="group flex items-center gap-2.5 rounded-xl border border-brand-primary bg-emerald-500/10 p-2.5 text-left text-slate-900 transition-all hover:bg-emerald-500/20"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-white">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-primary">GM Bùi Vinh (HLV)</p>
                  <p className="text-[10px] text-slate-500">hlv1@kttll.vn</p>
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

          {/* Registration Link for New Coaches */}
          <div className="mt-6 rounded-2xl bg-white p-4 text-center shadow-soft border border-slate-200/80">
            <p className="text-xs text-slate-600">
              Bạn là Huấn luyện viên mới gia nhập CLB?
            </p>
            <Link
              href="/register"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-sm active:scale-95"
            >
              <UserPlus className="h-4 w-4 text-brand-primary" />
              <span>Đăng Ký Tài Khoản HLV Ngay</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
