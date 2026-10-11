"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import Header from "@/components/common/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [adminName, setAdminName] = useState("Ban Chủ Nhiệm CLB");
  const [adminTitle, setAdminTitle] = useState("Quản trị toàn bộ 4 cơ sở");

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.name) setAdminName(u.name);
        if (u.title) setAdminTitle(u.title);
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
