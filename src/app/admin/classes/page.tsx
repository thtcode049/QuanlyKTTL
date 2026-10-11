"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Search,
} from "lucide-react";
import { dataStore, ClassroomData } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassroomData[]>(dataStore.classes);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Tất Cả Lớp Học Cờ Vua
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Ban Chủ Nhiệm có toàn quyền xem, điều chỉnh và can thiệp lịch sử điểm danh của mọi HLV.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm tên lớp hoặc trình độ..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-brand-primary focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filteredClasses.map((cls) => {
          const branch = dataStore.branches.find((b) => b.id === cls.branchId);
          const coach = dataStore.users.find((u) => u.id === cls.coachId);
          const students = dataStore.students.filter((s) => s.classIds.includes(cls.id));
          const sessions = dataStore.sessions.filter((s) => s.classId === cls.id);

          return (
            <div
              key={cls.id}
              className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200/80 transition-all hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold ${
                    cls.level === "Đội tuyển"
                      ? "bg-purple-100 text-purple-800"
                      : cls.level === "Nâng cao"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {cls.level}
                  </span>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{cls.name}</h3>
                </div>

                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  <span>{students.length} học viên</span>
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-800">{branch?.name}</span>
                  <span className="text-slate-400">({branch?.address})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{cls.schedule}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-brand-primary">
                  <DollarSign className="h-4 w-4 text-brand-primary" />
                  <span>Học phí: {formatCurrencyVND(cls.feePerSession)} / buổi</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>HLV Phụ Trách: <strong className="text-slate-900">{coach?.name}</strong></span>
                </div>
              </div>

              {/* Sessions indicator */}
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100 flex items-center justify-between">
                <span>Số buổi đã diễn ra tháng 10: <strong>{sessions.length} buổi</strong></span>
              </div>

              {/* Action buttons for admin */}
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/coach/attendance?classId=${cls.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Xem / Sửa Điểm Danh</span>
                </Link>
                <Link
                  href={`/coach/invoices?classId=${cls.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-primary py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Xem Học Phí</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
