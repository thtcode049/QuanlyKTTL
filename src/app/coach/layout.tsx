"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/common/Sidebar";
import Header from "@/components/common/Header";
import BottomNav from "@/components/common/BottomNav";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [coachName, setCoachName] = useState("");
  const [coachTitle, setCoachTitle] = useState("");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (!stored) {
      setIsAuthorized(false);
      router.replace("/login");
      return;
    }

    try {
      const u = JSON.parse(stored);
      if (!u || !u.id) {
        localStorage.removeItem("kttll_user");
        document.cookie = "kttll_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        setIsAuthorized(false);
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
      const name = (u.name || (u.role === "ADMIN" ? "Ban Quản Trị CLB" : "Huấn luyện viên")).replace(/ĐKT/g, "GM");
      const title = (u.title || (u.role === "ADMIN" ? "Quản trị toàn bộ cơ sở" : "HLV Quốc gia"))
        .replace(/\s*\/?\s*Trưởng ban Chuyên môn/gi, "")
        .replace(/ĐKT/g, "GM")
        .trim();
      setCoachName(name);
      setCoachTitle(title || (u.role === "ADMIN" ? "Quản trị toàn bộ cơ sở" : "HLV Quốc gia"));
    } catch (e) {
      localStorage.removeItem("kttll_user");
      document.cookie = "kttll_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      setIsAuthorized(false);
      router.replace("/login");
    }
  }, [router, pathname]);

  // Ngăn chặn hiển thị nội dung và giao diện nếu chưa được xác thực
  if (isAuthorized !== true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAF9]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Đang kiểm tra quyền truy cập...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAF9]">
      <Sidebar userRole="COACH" />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header userRole="COACH" userName={coachName} userTitle={coachTitle} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8">{children}</main>
        <BottomNav userRole="COACH" />
      </div>
    </div>
  );
}
