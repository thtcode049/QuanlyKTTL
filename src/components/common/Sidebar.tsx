"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Users,
  Wallet,
  Settings,
  GraduationCap,
  CheckSquare,
  FileSpreadsheet,
  Award,
  Coins,
  Menu,
  X,
  ChevronRight,
  Shield,
  UserCheck,
} from "lucide-react";

interface SidebarProps {
  userRole: "ADMIN" | "COACH";
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminNav = [
    { name: "Tổng quan Doanh thu", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Cơ sở Đào tạo", href: "/admin/branches", icon: Building2 },
    { name: "Tất cả Lớp học", href: "/admin/classes", icon: BookOpen },
    { name: "Đội ngũ HLV", href: "/admin/coaches", icon: Users },
    { name: "Thu nhập & Lương HLV", href: "/admin/payroll", icon: Wallet },
    { name: "Cài đặt VietQR & Zalo", href: "/admin/settings", icon: Settings },
  ];

  const coachNav = [
    { name: "Lớp học của tôi", href: "/coach/classes", icon: GraduationCap },
    { name: "Điểm danh buổi học", href: "/coach/attendance", icon: CheckSquare },
    { name: "Tổng kết & Học phí", href: "/coach/invoices", icon: FileSpreadsheet },
    { name: "Đánh giá kỳ thủ", href: "/coach/evaluations", icon: Award },
    { name: "Thu nhập HLV", href: "/coach/payroll", icon: Coins },
  ];

  const navItems = userRole === "ADMIN" ? adminNav : coachNav;

  const NavContent = () => (
    <div className="flex h-full flex-col justify-between bg-[#161616] text-slate-200">
      <div>
        {/* Brand Header with Logo */}
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-brand-primary">
            {/* Fallback image or direct logo URL */}
            <img
              src="https://kientuongtuonglai.com/wp-content/uploads/2024/08/logo-rounded-1-1024x1024.png"
              alt="Logo CLB Kiện Tướng Tương Lai"
              className="h-full w-full object-cover"
              onError={(e) => {
                // In case network blocks image, show styled chess piece fallback
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="flex h-full w-full items-center justify-center bg-brand-primary text-lg font-bold text-white">
              ♞
            </div>
          </div>
          <div className="overflow-hidden">
            <h1 className="truncate text-sm font-extrabold tracking-tight text-white uppercase">
              Kiện Tướng Tương Lai
            </h1>
            <p className="truncate text-[11px] font-medium text-brand-primary">
              Chess Management System
            </p>
          </div>
        </div>

        {/* Role Indicator Banner */}
        <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-white/5 to-white/10 p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {userRole === "ADMIN" ? (
                <Shield className="h-4 w-4 text-brand-secondary" />
              ) : (
                <UserCheck className="h-4 w-4 text-brand-primary" />
              )}
              <span className="text-xs font-semibold text-white">
                {userRole === "ADMIN" ? "Quản Lý" : "Huấn Luyện Viên"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-4 space-y-1.5 px-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-5 w-5 transition-transform duration-150 group-hover:scale-110 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-brand-primary"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-white/80" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-black/40 p-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">CLB Cờ Vua KTTLL</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Chủ nhiệm: GM Bùi Vinh</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger Button */}
      <div className="fixed bottom-5 right-5 z-50 md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white shadow-xl focus:outline-none"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavContent />
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden h-screen w-64 flex-shrink-0 md:block sticky top-0 shadow-xl">
        <NavContent />
      </aside>
    </>
  );
};

export default Sidebar;
