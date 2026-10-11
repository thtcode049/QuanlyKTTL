"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import Header from "@/components/common/Header";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [coachName, setCoachName] = useState("GM Bùi Vinh");
  const [coachTitle, setCoachTitle] = useState("Đại Kiện Tướng Quốc Tế");

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role === "COACH") {
          const fixedName = (u.name || "GM Bùi Vinh").replace(/ĐKT/g, "GM");
          const fixedTitle = (u.title || "Đại Kiện Tướng Quốc Tế")
            .replace(/\s*\/?\s*Trưởng ban Chuyên môn/gi, "")
            .replace(/ĐKT/g, "GM")
            .trim() || "Đại Kiện Tướng Quốc Tế";
          setCoachName(fixedName);
          setCoachTitle(fixedTitle);
        } else {
          // Nếu đang lưu tài khoản Admin nhưng đang vào trang HLV
          setCoachName("GM Bùi Vinh");
          setCoachTitle("Đại Kiện Tướng Quốc Tế");
        }
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
