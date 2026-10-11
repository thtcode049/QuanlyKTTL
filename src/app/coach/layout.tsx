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
        if (u.name) setCoachName(u.name);
        if (u.title) setCoachTitle(u.title);
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
