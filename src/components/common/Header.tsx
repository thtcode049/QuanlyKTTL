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

  const handleSwitchRole = () => {
    if (userRole === "ADMIN") {
      // Chuyển sang vai trò HLV
      const coachUser = {
        id: "user-coach-1",
        name: "GM Bùi Vinh",
        email: "hlv1@kttll.vn",
        role: "COACH",
        title: "Đại Kiện Tướng Quốc Tế",
      };
      localStorage.setItem("kttll_user", JSON.stringify(coachUser));
      router.push("/coach/classes");
    } else {
      // Chuyển sang vai trò Admin
      const adminUser = {
        id: "user-admin",
        name: "Ban Quản Trị CLB",
        email: "admin@kttll.vn",
        role: "ADMIN",
        title: "Quản trị toàn bộ 7 cơ sở",
      };
      localStorage.setItem("kttll_user", JSON.stringify(adminUser));
      router.push("/admin/branches");
    }
  };

  const todayStr = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const getDisplayName = () => {
    if (userRole === "ADMIN") {
      if (!userName || userName.includes("HLV") || userName.includes("Bùi Vinh")) {
        return "Ban Quản Trị CLB";
      }
      return userName.replace(/ĐKT/g, "GM");
    } else {
      if (!userName || userName.includes("Ban Quản") || userName.includes("Ban Chủ")) {
        return "GM Bùi Vinh";
      }
      return userName.replace(/ĐKT/g, "GM");
    }
  };

  const getDisplayTitle = () => {
    if (userRole === "ADMIN") {
      if (!userTitle || userTitle.includes("Kiện Tướng") || userTitle.includes("HLV")) {
        return "Quản trị toàn bộ 7 cơ sở";
      }
      return userTitle.replace(/\s*\/?\s*Trưởng ban Chuyên môn/gi, "").replace(/ĐKT/g, "GM").trim();
    } else {
      if (!userTitle || userTitle.includes("Quản trị") || userTitle.includes("Cơ sở")) {
        return "Đại Kiện Tướng Quốc Tế";
      }
      return userTitle.replace(/\s*\/?\s*Trưởng ban Chuyên môn/gi, "").replace(/ĐKT/g, "GM").trim();
    }
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

        {/* User Badge - Đảm bảo phân biệt rạch ròi ADMIN và HLV */}
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
              {getDisplayName()}
            </p>
            <p className="text-[10px] text-slate-500">
              {getDisplayTitle()}
            </p>
          </div>
        </div>

        {/* Role Switcher Demo */}
        <button
          onClick={handleSwitchRole}
          className="hidden rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-brand-primary hover:text-white transition-colors md:block"
          title="Chuyển đổi vai trò và đồng bộ thông tin"
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
