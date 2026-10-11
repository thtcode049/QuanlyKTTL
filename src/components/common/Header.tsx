"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ExternalLink, ShieldCheck, UserCheck, Calendar } from "lucide-react";

interface HeaderProps {
  userRole: "ADMIN" | "COACH";
  userName?: string;
  userTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ userRole, userName, userTitle }) => {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("kttll_user");
    router.push("/login");
  };

  const todayStr = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const cleanName = (name?: string) => {
    if (!name) return userRole === "ADMIN" ? "Ban Quản Trị" : "GM Bùi Vinh";
    return name.replace(/ĐKT/g, "GM");
  };

  const cleanTitle = (title?: string) => {
    if (!title) return userRole === "ADMIN" ? "Quản lý toàn bộ cơ sở" : "Đại Kiện Tướng Quốc Tế";
    return title.replace(/\s*\/?\s*Trưởng ban Chuyên môn/gi, "").replace(/ĐKT/g, "GM").trim();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md md:px-6">
      {/* Left info & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
          <Calendar className="h-4 w-4 text-brand-primary" />
          <span className="capitalize">{todayStr}</span>
        </div>
        <div className="hidden h-4 w-px bg-slate-200 sm:block" />
        <span className="text-xs font-semibold text-slate-700">CLB Cờ Vua Kiện Tướng Tương Lai</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Web CLB link */}
        <a
          href="https://kientuongtuonglai.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-primary hover:text-brand-primary lg:flex"
        >
          <span>Website CLB</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {/* User Badge */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1.5 pr-3 border border-slate-200/70">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white shadow-sm ${
            userRole === "ADMIN" ? "bg-slate-900" : "bg-brand-primary"
          }`}>
            {userRole === "ADMIN" ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs font-bold text-slate-800">
              {cleanName(userName)}
            </p>
            <p className="text-[10px] text-slate-500">
              {cleanTitle(userTitle)}
            </p>
          </div>
        </div>

        {/* Role Switcher Demo */}
        <button
          onClick={() => router.push(userRole === "ADMIN" ? "/coach/classes" : "/admin/dashboard")}
          className="hidden rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 md:block"
          title="Chuyển đổi giao diện để test"
        >
          Đổi sang {userRole === "ADMIN" ? "HLV" : "Admin"}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
