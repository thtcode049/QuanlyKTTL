"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ExternalLink, ShieldCheck, UserCheck, Calendar, ArrowRightLeft, Menu } from "lucide-react";
import { dataStore } from "@/lib/data-store";

interface HeaderProps {
  userRole: "ADMIN" | "COACH";
  userName?: string;
  userTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ userRole, userName, userTitle }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const dbUser = dataStore.users.find((x) => x.id === u.id);
        setCurrentUser(dbUser ? { ...u, ...dbUser } : u);
      } catch (e) {}
    }
  }, [userRole]);

  const handleLogout = () => {
    localStorage.removeItem("kttll_user");
    router.push("/login");
  };

  const handleToggleMobileMenu = () => {
    window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
  };

  // Chỉ tài khoản có role ADMIN hoặc được Admin cấp quyền (hasAdminAccess) mới có thể chuyển đổi
  const canAccessAdmin = currentUser?.role === "ADMIN" || currentUser?.hasAdminAccess === true;

  const handleSwitchRole = () => {
    if (!canAccessAdmin) return;

    if (userRole === "ADMIN") {
      // Chuyển sang giao diện HLV (giữ nguyên tài khoản hiện tại, không đổi sang ai khác)
      router.push("/coach/classes");
    } else {
      // Chuyển sang giao diện Admin (giữ nguyên tài khoản hiện tại)
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
    if (currentUser?.name) {
      return currentUser.name.replace(/ĐKT/g, "GM");
    }
    if (userName) {
      return userName.replace(/ĐKT/g, "GM");
    }
    return userRole === "ADMIN" ? "Ban Quản Trị CLB" : "Huấn luyện viên";
  };

  const getDisplayTitle = () => {
    if (currentUser?.role === "ADMIN") {
      return "Quản trị toàn bộ cơ sở";
    }
    if (currentUser?.hasAdminAccess) {
      return `${currentUser?.title || "HLV Quốc gia"} • Có quyền Admin`;
    }
    if (currentUser?.title) {
      return currentUser.title.replace(/\s*\/?\s*Trưởng ban Chuyên môn/gi, "").replace(/ĐKT/g, "GM").trim();
    }
    if (userTitle) {
      return userTitle.replace(/\s*\/?\s*Trưởng ban Chuyên môn/gi, "").replace(/ĐKT/g, "GM").trim();
    }
    return userRole === "ADMIN" ? "Quản trị CLB" : "HLV Quốc gia";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-md sm:px-4 md:px-6">
      {/* Left info & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={handleToggleMobileMenu}
          aria-label="Mở menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
          <Calendar className="h-4 w-4 text-brand-primary" />
          <span className="capitalize">{todayStr}</span>
        </div>
        <div className="hidden h-4 w-px bg-slate-200 sm:block" />
        <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[130px] sm:max-w-none">
          CLB Kiện Tướng Tương Lai
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
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
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1.5 pr-2.5 sm:pr-3 border border-slate-200/70">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-bold text-white shadow-sm ${
            userRole === "ADMIN" ? "bg-slate-900" : "bg-brand-primary"
          }`}>
            {userRole === "ADMIN" ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </div>
          <div className="text-left leading-tight max-w-[90px] sm:max-w-[160px]">
            <p className="text-xs font-bold text-slate-800 truncate">
              {getDisplayName()}
            </p>
            <p className="text-[10px] text-slate-500 truncate hidden sm:block">
              {getDisplayTitle()}
            </p>
          </div>
        </div>

        {/* Nút chuyển đổi vai trò: CHỈ hiển thị nếu có quyền Admin */}
        {canAccessAdmin && (
          <button
            onClick={handleSwitchRole}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 md:px-3 md:py-2 text-xs font-bold transition-all shadow-sm ${
              userRole === "ADMIN"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
            title={userRole === "ADMIN" ? "Chuyển sang giao diện HLV" : "Chuyển sang trang Quản trị"}
          >
            {userRole === "ADMIN" ? (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Giao Diện HLV</span>
                <span className="sm:hidden">HLV</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đến Trang Quản Trị</span>
                <span className="sm:hidden">Admin</span>
              </>
            )}
          </button>
        )}

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
