"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Calendar,
  BookOpen,
  Users,
  Check,
  X,
  Save,
  Clock,
  Sparkles,
  Award,
  ChevronDown,
  AlertCircle,
  History,
} from "lucide-react";
import { dataStore, AttendanceSessionData, ClassroomData, StudentData } from "@/lib/data-store";
import { getStudentAvatarUrl } from "@/lib/chess-avatars";
import confetti from "canvas-confetti";

function AttendanceContent() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") || dataStore.classes[0]?.id || "";

  const [classes] = useState<ClassroomData[]>(dataStore.classes);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [topic, setTopic] = useState<string>(
    "Chiến thuật Cờ vua: Đòn Chĩa Đôi & Phối hợp Chiếu Hết"
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Danh sách học viên của lớp
  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const classStudents = dataStore.students.filter((s) =>
    s.classIds.includes(selectedClass?.id || "")
  );

  // State điểm danh hiện tại: studentId -> { status, note, hasBook, bookTitle, bookPrice }
  const [records, setRecords] = useState<
    Record<
      string,
      {
        status: "PRESENT" | "ABSENT";
        note: string;
        hasBook: boolean;
        bookTitle: string;
        bookPrice: number;
      }
    >
  >({});

  // Khởi tạo trạng thái mặc định: TẤT CẢ CÓ MẶT (PRESENT)
  useEffect(() => {
    // Kiểm tra xem đã có buổi học nào vào ngày này chưa
    const existingSession = dataStore.sessions.find(
      (s) => s.classId === selectedClass?.id && s.date === sessionDate
    );

    const initial: Record<
      string,
      {
        status: "PRESENT" | "ABSENT";
        note: string;
        hasBook: boolean;
        bookTitle: string;
        bookPrice: number;
      }
    > = {};

    if (existingSession) {
      setTopic(existingSession.topic || "");
      classStudents.forEach((std) => {
        const r = existingSession.records.find((rec) => rec.studentId === std.id);
        initial[std.id] = {
          status: r ? r.status : "PRESENT",
          note: r?.coachNote || "",
          hasBook: !!(r?.bookTitle && r?.bookPrice),
          bookTitle: r?.bookTitle || "Sách Cờ Vua Vỡ Lòng & Bài Tập",
          bookPrice: r?.bookPrice || 80000,
        };
      });
    } else {
      classStudents.forEach((std) => {
        initial[std.id] = {
          status: "PRESENT", // Mặc định [Có mặt] theo đặc tả
          note: "",
          hasBook: false,
          bookTitle: "Sách Cờ Vua Vỡ Lòng & Bài Tập",
          bookPrice: 80000,
        };
      });
    }

    setRecords(initial);
  }, [selectedClassId, sessionDate]);

  // Toggle 1 chạm: PRESENT <-> ABSENT
  const toggleStatus = (studentId: string) => {
    setRecords((prev) => {
      const current = prev[studentId] || {
        status: "PRESENT",
        note: "",
        hasBook: false,
        bookTitle: "Sách Cờ Vua Vỡ Lòng & Bài Tập",
        bookPrice: 80000,
      };
      const nextStatus = current.status === "PRESENT" ? "ABSENT" : "PRESENT";
      return {
        ...prev,
        [studentId]: {
          ...current,
          status: nextStatus,
        },
      };
    });
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  const handleBookToggle = (studentId: string) => {
    setRecords((prev) => {
      const current = prev[studentId] || {
        status: "PRESENT",
        note: "",
        hasBook: false,
        bookTitle: "Sách Cờ Vua Vỡ Lòng & Bài Tập",
        bookPrice: 80000,
      };
      return {
        ...prev,
        [studentId]: {
          ...current,
          hasBook: !current.hasBook,
        },
      };
    });
  };

  const handleBookTitleChange = (studentId: string, bookTitle: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        bookTitle,
      },
    }));
  };

  const handleBookPriceChange = (studentId: string, bookPrice: number) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        bookPrice,
      },
    }));
  };

  const setAllPresent = () => {
    const updated: Record<
      string,
      {
        status: "PRESENT" | "ABSENT";
        note: string;
        hasBook: boolean;
        bookTitle: string;
        bookPrice: number;
      }
    > = {};
    classStudents.forEach((std) => {
      const current = records[std.id];
      updated[std.id] = {
        status: "PRESENT",
        note: current?.note || "",
        hasBook: current?.hasBook || false,
        bookTitle: current?.bookTitle || "Sách Cờ Vua Vỡ Lòng & Bài Tập",
        bookPrice: current?.bookPrice || 80000,
      };
    });
    setRecords(updated);
  };

  // Lưu buổi học
  const handleSaveAttendance = () => {
    const sessionRecords = classStudents.map((std) => ({
      id: `rec-${Date.now()}-${std.id}`,
      sessionId: `sess-${selectedClass.id}-${sessionDate}`,
      studentId: std.id,
      status: records[std.id]?.status || "PRESENT",
      coachNote: records[std.id]?.note || "",
      bookTitle: records[std.id]?.hasBook ? (records[std.id]?.bookTitle || "Sách Cờ Vua") : undefined,
      bookPrice: records[std.id]?.hasBook ? (Number(records[std.id]?.bookPrice) || 0) : undefined,
    }));

    const existingIndex = dataStore.sessions.findIndex(
      (s) => s.classId === selectedClass.id && s.date === sessionDate
    );

    const newSession: AttendanceSessionData = {
      id: `sess-${selectedClass.id}-${sessionDate}`,
      classId: selectedClass.id,
      date: sessionDate,
      topic: topic || "Buổi học cờ vua",
      records: sessionRecords,
    };

    if (existingIndex >= 0) {
      dataStore.sessions[existingIndex] = newSession;
    } else {
      dataStore.sessions.push(newSession);
    }

    // Tự động tính toán lại toàn bộ học phí theo quy tắc THỰC HỌC - THỰC TRẢ
    const dateObj = new Date(sessionDate);
    dataStore.recalculateAllInvoices(dateObj.getMonth() + 1, dateObj.getFullYear());

    setSaveSuccess(true);
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.7 },
      colors: ["#00B18A", "#E67E22"],
    });

    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Thống kê nhanh buổi học
  const presentCount = classStudents.filter(
    (std) => records[std.id]?.status === "PRESENT"
  ).length;
  const absentCount = classStudents.length - presentCount;

  // Thống kê phát sách trong buổi học
  const totalBooksInSession = classStudents.filter((std) => records[std.id]?.hasBook).length;
  const totalBookPriceInSession = classStudents.reduce(
    (sum, std) => sum + (records[std.id]?.hasBook ? (Number(records[std.id]?.bookPrice) || 0) : 0),
    0
  );
  const coachBookCommissionInSession = Math.round(totalBookPriceInSession * 0.3);

  // Lịch sử các buổi học của lớp này
  const pastSessions = dataStore.sessions
    .filter((s) => s.classId === selectedClass?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Điểm Danh Buổi Học
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Học viên Có mặt tính phí, Vắng mặt không tính phí. Tích 1 chạm để chuyển trạng thái.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={setAllPresent}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Tất cả [Có mặt]
          </button>
          <button
            onClick={handleSaveAttendance}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>Lưu Điểm Danh</span>
          </button>
        </div>
      </div>

      {/* Success notification */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 animate-fade-in shadow-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary text-white">
            <Check className="h-4 w-4" />
          </div>
          <span>
            Đã lưu kết quả điểm danh thành công! Hệ thống đã tự động cập nhật học phí tháng của {classStudents.length} học viên.
          </span>
        </div>
      )}

      {/* Session Configuration Card */}
      <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Chọn Lớp */}
          <div>
            <label className="text-xs font-bold text-slate-700">Lớp học cần điểm danh</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.level})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Ngày */}
          <div>
            <label className="text-xs font-bold text-slate-700">Ngày diễn ra buổi học</label>
            <div className="relative mt-1.5">
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Chủ đề bài học cờ vua */}
          <div>
            <label className="text-xs font-bold text-slate-700">Chủ đề bài học cờ vua</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="VD: Khai cuộc Italia, Đòn Ghim, Tàn cuộc Xe..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Quick summary bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-600">
              Sĩ số: <strong className="text-slate-900">{classStudents.length} học viên</strong>
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-brand-primary">
              <span className="h-2 w-2 rounded-full bg-brand-primary" />
              Có mặt: {presentCount}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-brand-secondary">
              <span className="h-2 w-2 rounded-full bg-brand-secondary" />
              Vắng: {absentCount}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-800">
              <BookOpen className="h-3.5 w-3.5 text-amber-600" />
              Phát sách: {totalBooksInSession} cuốn ({totalBookPriceInSession.toLocaleString("vi-VN")} đ)
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-extrabold text-emerald-800">
              Thu nhập sách HLV (+30%): +{coachBookCommissionInSession.toLocaleString("vi-VN")} đ
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Học phí/buổi: <strong>{selectedClass?.feePerSession.toLocaleString("vi-VN")} đ</strong>
          </span>
        </div>
      </div>

      {/* 1-Click Interactive Attendance List */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80">
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-900">
            Danh Sách Điểm Danh Buổi Học ({classStudents.length} Học Viên)
          </h3>
          <p className="text-xs text-slate-500">
            Chạm vào nút trạng thái của từng học sinh để chuyển đổi nhanh giữa [Có mặt] và [Vắng].
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {classStudents.map((std, index) => {
            const isPresent = records[std.id]?.status === "PRESENT";
            const currentNote = records[std.id]?.note || "";

            return (
              <div
                key={std.id}
                className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                  isPresent ? "bg-white hover:bg-slate-50/70" : "bg-orange-50/30 hover:bg-orange-50/50"
                }`}
              >
                {/* Student Info */}
                <div className="flex items-center gap-3">
                  <img
                    src={getStudentAvatarUrl(std.avatar, std.fullName, index)}
                    alt={std.fullName}
                    className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 flex-shrink-0 shadow-sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {std.fullName}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-slate-400">
                        ({std.code})
                      </span>
                      <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200">
                        ★ {std.eloRating}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      PH: {std.parentName} • SĐT: {std.parentPhone}
                    </p>
                  </div>
                </div>

                {/* Book & Note & Status Toggle */}
                <div className="flex flex-1 flex-col gap-2.5 sm:items-end">
                  {/* Cột Phát Sách */}
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`flex cursor-pointer select-none items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                        records[std.id]?.hasBook
                          ? "border-amber-400 bg-amber-50 text-amber-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!records[std.id]?.hasBook}
                        onChange={() => handleBookToggle(std.id)}
                        className="h-3.5 w-3.5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                      <span>Phát sách</span>
                    </label>

                    {records[std.id]?.hasBook && (
                      <div className="flex flex-wrap items-center gap-1.5 animate-fade-in">
                        <input
                          type="text"
                          value={records[std.id]?.bookTitle || ""}
                          onChange={(e) => handleBookTitleChange(std.id, e.target.value)}
                          placeholder="Tên sách (VD: Sách Cờ vua Vỡ lòng)..."
                          className="w-48 rounded-xl border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-brand-primary focus:bg-white focus:outline-none"
                        />
                        <div className="relative">
                          <input
                            type="number"
                            step="10000"
                            value={records[std.id]?.bookPrice || 0}
                            onChange={(e) => handleBookPriceChange(std.id, Number(e.target.value))}
                            placeholder="Giá sách"
                            className="w-28 rounded-xl border border-amber-300 bg-amber-50/40 py-1.5 pl-2.5 pr-6 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                          />
                          <span className="pointer-events-none absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">
                            đ
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600">
                          (+30%: {Math.round((records[std.id]?.bookPrice || 0) * 0.3).toLocaleString("vi-VN")} đ)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex w-full items-center gap-2">
                    {/* Quick Note input */}
                    <input
                      type="text"
                      value={currentNote}
                      onChange={(e) => handleNoteChange(std.id, e.target.value)}
                      placeholder="Nhận xét buổi học (tùy chọn)..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-primary focus:bg-white focus:outline-none"
                    />

                    {/* 1-Click Big Button */}
                    <button
                      type="button"
                      onClick={() => toggleStatus(std.id)}
                      className={`flex min-w-[105px] items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-150 active:scale-95 ${
                        isPresent
                          ? "bg-brand-primary text-white shadow-sm shadow-brand-primary/20 hover:bg-brand-primary-hover"
                          : "bg-brand-secondary text-white shadow-sm shadow-brand-secondary/20 hover:bg-brand-secondary-hover"
                      }`}
                    >
                      {isPresent ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Có mặt</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          <span>Vắng mặt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4">
          <span className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-brand-primary">{presentCount} Có mặt</strong> • <strong className="text-brand-secondary">{absentCount} Vắng mặt</strong>
          </span>
          <button
            onClick={handleSaveAttendance}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
          >
            <Save className="h-4 w-4" />
            <span>Lưu Kết Quả Điểm Danh</span>
          </button>
        </div>
      </div>

      {/* Past Sessions History in Month */}
      <div className="rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <History className="h-4 w-4 text-brand-primary" />
          <h3 className="text-sm font-bold text-slate-900">
            Lịch Sử Các Buổi Đã Điểm Danh ({selectedClass?.name})
          </h3>
        </div>

        <div className="mt-3 divide-y divide-slate-100">
          {pastSessions.map((sess) => {
            const pCount = sess.records.filter((r) => r.status === "PRESENT").length;
            const aCount = sess.records.length - pCount;
            const isCurrentDate = sess.date === sessionDate;

            return (
              <div
                key={sess.id}
                onClick={() => setSessionDate(sess.date)}
                className={`flex cursor-pointer items-center justify-between py-3 transition-colors hover:bg-slate-50 ${
                  isCurrentDate ? "bg-emerald-50/40 font-semibold px-2 rounded-lg" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {new Date(sess.date).toLocaleDateString("vi-VN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-slate-600">— {sess.topic}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-brand-primary font-bold">
                    {pCount} Có mặt
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-brand-secondary font-bold">
                    {aCount} Vắng
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CoachAttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Đang tải dữ liệu điểm danh...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
