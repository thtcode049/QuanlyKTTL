"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface SidebarProps {
  userRole: "ADMIN" | "COACH";
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Khôi phục trạng thái thu gọn từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kttll_sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch (e) {
      // bỏ qua nếu SSR
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("kttll_sidebar_collapsed", String(next));
    } catch (e) {}
  };

  const adminNav = [
    { name: "Tổng quan Doanh thu", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Cơ sở & Lớp học", href: "/admin/branches", icon: Building2 },
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

  const NavContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isSmall = collapsed && !isMobile;

    return (
      <div className="flex h-full flex-col justify-between bg-white text-slate-700 transition-all duration-300">
        <div>
          {/* Brand Header with Logo, Full Title & 1 Compact Toggle Button */}
          <div
            className={`flex items-center border-b border-slate-100 ${
              isSmall ? "flex-col justify-center gap-2 p-2.5" : "justify-between px-3.5 py-3.5"
            }`}
          >
            <div className={`flex items-center gap-2.5 overflow-hidden ${isSmall ? "justify-center" : ""}`}>
              {/* Logo CLB hoàn hảo tròn trịa không bị khuyết */}
              <div className="relative h-10 w-10 flex-shrink-0 rounded-full bg-white p-0.5 shadow-sm ring-1 ring-brand-primary/30 flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Logo CLB Kiện Tướng Tương Lai"
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Tiêu đề ĐẦY ĐỦ KHÔNG BỊ CẮT CHỮ */}
              {!isSmall && (
                <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase text-slate-900 leading-tight">
                    Kiện Tướng Tương Lai
                  </span>
                  <span className="text-[9.5px] font-bold text-brand-primary tracking-wide">
                    Chess Management
                  </span>
                </div>
              )}
            </div>

            {/* Nút Thu Gọn Menu 1 NÚT ICON NHỎ GỌN DUY NHẤT (Không tốn không gian) */}
            {!isMobile && (
              <button
                onClick={toggleCollapsed}
                title={isSmall ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                {isSmall ? (
                  <PanelLeftOpen className="h-4 w-4 text-brand-primary" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Role Indicator Banner */}
          {!isSmall ? (
            <div className="mx-3 mt-3.5 rounded-xl bg-slate-50 p-2.5 border border-slate-100 flex items-center gap-2">
              {userRole === "ADMIN" ? (
                <Shield className="h-4 w-4 text-brand-secondary" />
              ) : (
                <UserCheck className="h-4 w-4 text-brand-primary" />
              )}
              <span className="text-xs font-bold text-slate-800">
                {userRole === "ADMIN" ? "Ban Quản Lý CLB" : "Huấn Luyện Viên"}
              </span>
            </div>
          ) : (
            <div className="mx-2 mt-3 flex justify-center">
              <span
                title={userRole === "ADMIN" ? "Ban Quản Lý" : "Huấn Luyện Viên"}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-brand-primary"
              >
                {userRole === "ADMIN" ? <Shield className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className={`mt-4 space-y-1 ${isSmall ? "px-2" : "px-3"}`}>
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSmall ? item.name : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center rounded-xl transition-all duration-150 ${
                    isSmall
                      ? "justify-center p-3"
                      : "justify-between px-3.5 py-2.5 text-xs font-bold"
                  } ${
                    isActive
                      ? "bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                        isActive ? "text-white" : "text-slate-500 group-hover:text-brand-primary"
                      }`}
                    />
                    {!isSmall && <span>{item.name}</span>}
                  </div>
                  {!isSmall && isActive && (
                    <ChevronRight className="h-3.5 w-3.5 text-white/80" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Info CLB (Đã bỏ nút dài chiếm không gian) */}
        <div className="border-t border-slate-100 p-3">
          {!isSmall ? (
            <div className="rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-100 text-slate-600">
              <p className="font-bold text-slate-900">CLB Cờ Vua KTTLL</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Chủ nhiệm: GM Bùi Vinh</p>
            </div>
          ) : (
            <div
              className="flex justify-center text-xs font-bold text-brand-primary py-1"
              title="CLB Cờ Vua Kiện Tướng Tương Lai"
            >
              ♞
            </div>
          )}
        </div>
      </div>
    );
  };

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
        className={`fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavContent isMobile={true} />
      </div>

      {/* Desktop Persistent Sidebar (Light Theme & Compact 1-button Toggle) */}
      <aside
        className={`hidden h-screen flex-shrink-0 md:block sticky top-0 border-r border-slate-200/90 shadow-soft transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <NavContent isMobile={false} />
      </aside>
    </>
  );
};

export default Sidebar;
