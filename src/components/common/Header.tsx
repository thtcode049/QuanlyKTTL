"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ExternalLink, ShieldCheck, UserCheck, Calendar, ArrowRightLeft, Menu, Edit3, User } from "lucide-react";
import { dataStore, resolveCanonicalCoachId } from "@/lib/data-store";
import NotificationBell from "@/components/common/NotificationBell";

interface HeaderProps {
  userRole: "ADMIN" | "COACH";
  userName?: string;
  userTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ userRole, userName, userTitle }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadUserData = () => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const canonicalId = resolveCanonicalCoachId(u.id || u.email);
        const dbUser = dataStore.users.find(
          (x) => x.id === u.id || x.id === canonicalId || (u.email && x.email.toLowerCase() === u.email.toLowerCase())
        );
        const merged = dbUser ? { ...u, ...dbUser } : u;
        if (canonicalId === "user-admin" || canonicalId === "user-coach-1" || canonicalId === "user-coach-2") {
          merged.hasAdminAccess = true;
        }
        setCurrentUser(merged);
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadUserData();
    const handleUpdate = () => loadUserData();
    window.addEventListener("kttll_user_updated", handleUpdate);
    return () => window.removeEventListener("kttll_user_updated", handleUpdate);
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
      router.push("/admin/coaches");
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
    if (currentUser?.systemRole === "CHUNHIEM") {
      return "Chủ nhiệm CLB • Toàn quyền";
    }
    if (currentUser?.systemRole === "PHOCHUNHIEM") {
      return "Phó chủ nhiệm CLB • Toàn CLB";
    }
    if (currentUser?.systemRole === "CHUCOSO") {
      const mIds = currentUser?.managedBranchIds?.length
        ? currentUser.managedBranchIds
        : (currentUser?.branchId ? [currentUser.branchId] : []);
      const branchNames = mIds
        .map((bid: string) => dataStore.branches.find((x) => x.id === bid)?.name.split("–")[0].trim())
        .filter(Boolean);
      return branchNames.length > 0 ? `Chủ ${branchNames.join(", ")}` : "Chủ cơ sở";
    }
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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-100 bg-white/95 px-3 backdrop-blur-md sm:px-4 md:px-6">
      {/* Left info & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={handleToggleMobileMenu}
          aria-label="Mở menu"
          className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all md:hidden cursor-pointer"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
          <Calendar className="h-4 w-4 text-brand-primary" />
          <span className="capitalize">{todayStr}</span>
        </div>
        <div className="hidden h-3.5 w-px bg-slate-200 sm:block" />
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
          className="hidden items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-brand-primary lg:flex"
        >
          <span>Website CLB</span>
          <ExternalLink className="h-3 w-3" />
        </a>

        {/* Chuông Thông Báo */}
        <NotificationBell currentUserId={currentUser?.id} userRole={userRole} />

        {/* User Badge - Click to go to full Profile Page */}
        <button
          type="button"
          onClick={() => router.push(userRole === "ADMIN" ? "/admin/profile" : "/coach/profile")}
          className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1 hover:bg-slate-100 transition-all text-left cursor-pointer group"
          title="Bấm để mở trang Hồ Sơ Cá Nhân & Quản Trị"
        >
          <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded font-bold text-white transition-transform ${
            userRole === "ADMIN" ? "bg-slate-800" : "bg-brand-primary"
          }`}>
            {userRole === "ADMIN" ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="text-left leading-tight max-w-[90px] sm:max-w-[160px]">
            <div className="flex items-center gap-1">
              <p className="text-xs font-bold text-slate-800 truncate group-hover:text-brand-primary transition-colors">
                {getDisplayName()}
              </p>
              <Edit3 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden sm:block" />
            </div>
            <p className="text-[10px] text-slate-500 truncate hidden sm:block">
              {getDisplayTitle()}
            </p>
          </div>
        </button>

        {/* Nút chuyển đổi vai trò: CHỈ hiển thị nếu có quyền Admin */}
        {canAccessAdmin && (
          <button
            onClick={handleSwitchRole}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition-all ${
              userRole === "ADMIN"
                ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
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
          className="flex h-8 w-8 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
