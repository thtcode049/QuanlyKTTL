"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import Header from "@/components/common/Header";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [coachName, setCoachName] = useState("");
  const [coachTitle, setCoachTitle] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const name = (u.name || (u.role === "ADMIN" ? "Ban Quản Trị CLB" : "Huấn luyện viên")).replace(/ĐKT/g, "GM");
        const title = (u.title || (u.role === "ADMIN" ? "Quản trị toàn bộ cơ sở" : "HLV Quốc gia"))
          .replace(/\s*\/?\s*Trưởng ban Chuyên môn/gi, "")
          .replace(/ĐKT/g, "GM")
          .trim();
        setCoachName(name);
        setCoachTitle(title || (u.role === "ADMIN" ? "Quản trị toàn bộ cơ sở" : "HLV Quốc gia"));
      } catch (e) {
        // use default
      }
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8FAF9]">
      <Sidebar userRole="COACH" />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header userRole="COACH" userName={coachName} userTitle={coachTitle} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
