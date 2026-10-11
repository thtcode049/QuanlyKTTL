"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import Header from "@/components/common/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adminName, setAdminName] = useState("Ban Quản Trị CLB");
  const [adminTitle, setAdminTitle] = useState("Quản trị toàn bộ 7 cơ sở");

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role === "ADMIN") {
          setAdminName(u.name || "Ban Quản Trị CLB");
          setAdminTitle(u.title || "Quản trị toàn bộ 7 cơ sở");
        } else {
          // Nếu đang lưu tài khoản HLV nhưng đang vào trang Admin
          setAdminName("Ban Quản Trị CLB");
          setAdminTitle("Quản trị toàn bộ 7 cơ sở");
        }
      } catch (e) {
        // use default
      }
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8FAF9]">
      <Sidebar userRole="ADMIN" />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header userRole="ADMIN" userName={adminName} userTitle={adminTitle} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
