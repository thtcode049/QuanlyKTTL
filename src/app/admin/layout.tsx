"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Sidebar from "@/components/common/Sidebar";
import Header from "@/components/common/Header";
import BottomNav from "@/components/common/BottomNav";
import { dataStore, resolveCanonicalCoachId } from "@/lib/data-store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [adminName, setAdminName] = useState("Ban Quản Trị CLB");
  const [adminTitle, setAdminTitle] = useState("Quản trị toàn bộ cơ sở");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    try {
      const u = JSON.parse(stored);
      const canonicalId = resolveCanonicalCoachId(u.id || u.email);
      const dbUser = dataStore.users.find(
        (x) => x.id === u.id || x.id === canonicalId || (u.email && x.email.toLowerCase() === u.email.toLowerCase())
      );
      const user = dbUser ? { ...u, ...dbUser } : u;

      // Chỉ tài khoản có role ADMIN hoặc được Admin cấp quyền (hasAdminAccess, CHUCOSO, PHOCHUNHIEM, CHUNHIEM) mới được vào
      if (
        user.role === "ADMIN" ||
        user.hasAdminAccess === true ||
        user.systemRole === "CHUNHIEM" ||
        user.systemRole === "PHOCHUNHIEM" ||
        user.systemRole === "CHUCOSO" ||
        canonicalId === "user-admin" ||
        canonicalId === "user-coach-1" ||
        canonicalId === "user-coach-2"
      ) {
        setIsAuthorized(true);
        setAdminName(user.name || "Ban Quản Trị CLB");
        const branchObj = dataStore.branches.find((b) => b.id === user.branchId);
        const branchShortName = branchObj ? branchObj.name.split("–")[0].trim() : "Cơ sở";
        const roleLabel =
          user.systemRole === "CHUNHIEM"
            ? "Chủ nhiệm CLB"
            : user.systemRole === "PHOCHUNHIEM"
            ? "Phó chủ nhiệm CLB"
            : user.systemRole === "CHUCOSO"
            ? `Chủ cơ sở • ${branchShortName}`
            : user.role === "ADMIN"
            ? (user.title || "Quản trị toàn bộ cơ sở")
            : `${user.title || "HLV Quốc gia"} • Quản trị viên`;
        setAdminTitle(roleLabel);
      } else {
        setIsAuthorized(false);
        // Tự động đẩy về trang HLV sau 1.5 giây
        const timer = setTimeout(() => {
          router.replace("/coach/classes");
        }, 1500);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      router.replace("/login");
    }
  }, [router]);

  if (isAuthorized === false) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-xl font-black text-slate-900">
          Không có quyền truy cập trang Quản trị
        </h1>
        <p className="mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
          Tài khoản của bạn chưa được cấp quyền quản trị CLB. Chỉ Ban Chủ Nhiệm hoặc các Huấn luyện viên được Admin phân quyền mới có thể truy cập khu vực này.
        </p>
        <Link
          href="/coach/classes"
          className="mt-6 flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Trang Lớp Học Của Tôi</span>
        </Link>
      </div>
    );
  }

  if (isAuthorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-xs font-bold text-slate-400">
        Đang kiểm tra quyền quản trị...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAF9]">
      <Sidebar userRole="ADMIN" />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header userRole="ADMIN" userName={adminName} userTitle={adminTitle} />
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8">{children}</main>
        <BottomNav userRole="ADMIN" />
      </div>
    </div>
  );
}
