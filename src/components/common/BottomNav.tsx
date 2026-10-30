"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  Users,
  CheckSquare,
  FileSpreadsheet,
  Coins,
  LayoutDashboard,
  Building2,
  Award,
  Settings,
} from "lucide-react";

interface BottomNavProps {
  userRole: "ADMIN" | "COACH";
}

export const BottomNav: React.FC<BottomNavProps> = ({ userRole }) => {
  const pathname = usePathname();

  const coachItems = [
    { name: "Lớp học", href: "/coach/classes", icon: GraduationCap },
    { name: "Học viên", href: "/coach/students", icon: Users },
    { name: "Điểm danh", href: "/coach/attendance", icon: CheckSquare },
    { name: "Học phí", href: "/coach/invoices", icon: FileSpreadsheet },
    { name: "Thu nhập", href: "/coach/payroll", icon: Coins },
  ];

  const adminItems = [
    { name: "Doanh thu", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Cơ sở", href: "/admin/branches", icon: Building2 },
    { name: "Học viên", href: "/coach/students", icon: Users },
    { name: "Đội HLV", href: "/admin/coaches", icon: Award },
    { name: "Cài đặt", href: "/admin/settings", icon: Settings },
  ];

  const items = userRole === "ADMIN" ? adminItems : coachItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/90 bg-white/95 px-1 py-1.5 backdrop-blur-md md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/coach/students" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-all active:scale-95 ${
              isActive
                ? "text-brand-primary font-bold"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded transition-all ${
                isActive
                  ? "bg-emerald-50 text-brand-primary shadow-sm ring-1 ring-brand-primary/20"
                  : "text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="mt-0.5 text-[10px] tracking-tight line-clamp-1">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
