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

/**
 * Phân tích chuỗi schedule để lấy mảng thứ trong tuần (0: CN, 1: T2, 2: T3...)
 * và khoảng thời gian { start: "18:00", end: "19:30" }
 */
function parseScheduleInfo(schedule: string) {
  const days: number[] = [];
  const lower = (schedule || "").toLowerCase();
  if (lower.includes("thứ 2") || lower.includes("t2")) days.push(1);
  if (lower.includes("thứ 3") || lower.includes("t3")) days.push(2);
  if (lower.includes("thứ 4") || lower.includes("t4")) days.push(3);
  if (lower.includes("thứ 5") || lower.includes("t5")) days.push(4);
  if (lower.includes("thứ 6") || lower.includes("t6")) days.push(5);
  if (lower.includes("thứ 7") || lower.includes("t7")) days.push(6);
  if (lower.includes("chủ nhật") || lower.includes("cn")) days.push(0);

  const timeMatch = (schedule || "").match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  const timeRange = timeMatch ? { start: timeMatch[1], end: timeMatch[2] } : null;

  return { days, timeRange };
}

/**
 * Tự động tìm ngày buổi học chuẩn theo lịch của lớp:
 * - Nếu hôm nay là ngày học của lớp -> Trả về hôm nay.
 * - Nếu hôm nay không phải ngày học -> Tìm ngày học có thứ trùng gần nhất (trong 7 ngày qua hoặc sắp tới).
 */
function getSmartSessionDate(schedule: string, targetDate = new Date()): string {
  const { days } = parseScheduleInfo(schedule);
  if (days.length === 0) {
    return targetDate.toISOString().split("T")[0];
  }

  const currentDay = targetDate.getDay();
  const pad = (n: number) => String(n).padStart(2, "0");

  if (days.includes(currentDay)) {
    return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
  }

  // Tìm ngày có thứ khớp gần nhất trong vòng 7 ngày qua
  for (let diff = 1; diff <= 7; diff++) {
    const past = new Date(targetDate);
    past.setDate(past.getDate() - diff);
    if (days.includes(past.getDay())) {
      return `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`;
    }
  }

  return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
}

/**
 * Kiểm tra trạng thái giờ học hôm nay
 */
function getTodayScheduleStatus(schedule: string) {
  const { days, timeRange } = parseScheduleInfo(schedule);
  const now = new Date();
  const todayDay = now.getDay();

  if (!days.includes(todayDay)) {
    return { status: "NOT_TODAY" as const, message: "Hôm nay không có lịch học của lớp này" };
  }

  if (!timeRange) {
    return { status: "HAPPENING" as const, message: "Hôm nay có lịch học của lớp" };
  }

  const [startHour, startMin] = timeRange.start.split(":").map(Number);
  const [endHour, endMin] = timeRange.end.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return {
      status: "HAPPENING" as const,
      message: `Đang trong giờ học (${timeRange.start} - ${timeRange.end})`,
    };
  } else if (currentMinutes < startMinutes) {
    return {
      status: "UPCOMING" as const,
      message: `Ca học hôm nay sắp diễn ra (${timeRange.start} - ${timeRange.end})`,
    };
  } else {
    return {
      status: "PAST" as const,
      message: `Ca học hôm nay (${timeRange.start} - ${timeRange.end}) đã kết thúc`,
    };
  }
}

/**
 * Sinh danh sách tất cả các ngày học trong tháng rơi đúng vào lịch của lớp
 */
function getMonthlyClassDates(schedule: string, targetDate = new Date()) {
  const { days } = parseScheduleInfo(schedule);
  if (days.length === 0) return [];

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

  const dayNames = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const list: { dateStr: string; label: string; isToday: boolean }[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const cur = new Date(year, month, d);
    if (days.includes(cur.getDay())) {
      const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      list.push({
        dateStr,
        label: `${dayNames[cur.getDay()]} (${pad(d)}/${pad(month + 1)})`,
        isToday: dateStr === todayStr,
      });
    }
  }

  return list;
}

function AttendanceContent() {
  const searchParams = useSearchParams();

  const [currentCoachId, setCurrentCoachId] = useState<string>("user-coach-1");
  const [classes, setClasses] = useState<ClassroomData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [topic, setTopic] = useState<string>(
    "Chiến thuật Cờ vua: Đòn Chĩa Đôi & Phối hợp Chiếu Hết"
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Tải lớp học và tự động nhảy đến lớp có lịch hôm nay / buổi học đúng thứ
  useEffect(() => {
    let coachId = "user-coach-1";
    let isAdmin = false;
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) coachId = u.id;
        if (u.role === "ADMIN") isAdmin = true;
      } catch (e) {}
    }
    setCurrentCoachId(coachId);

    const myClasses = isAdmin
      ? dataStore.classes
      : dataStore.classes.filter((c) => c.coachId === coachId);
    setClasses(myClasses);

    const paramClassId = searchParams.get("classId");
    let targetClass: ClassroomData | undefined;

    if (paramClassId && myClasses.some((c) => c.id === paramClassId)) {
      targetClass = myClasses.find((c) => c.id === paramClassId);
    } else {
      // Ưu tiên tự động chọn lớp có lịch học HÔM NAY
      const todayDay = new Date().getDay();
      const todayClass = myClasses.find((c) => parseScheduleInfo(c.schedule).days.includes(todayDay));
      targetClass = todayClass || myClasses[0];
    }

    if (targetClass) {
      setSelectedClassId(targetClass.id);
      // Tự động nhảy đến ngày học đúng thứ của lớp
      const smartDate = getSmartSessionDate(targetClass.schedule);
      setSessionDate(smartDate);
    }
  }, [searchParams]);

  // Danh sách học viên của lớp
  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const classStudents = selectedClass
    ? dataStore.students.filter((s) => s.classIds.includes(selectedClass.id))
    : [];

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

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    const target = classes.find((c) => c.id === classId);
    if (target) {
      const smartDate = getSmartSessionDate(target.schedule);
      setSessionDate(smartDate);
    }
  };

  const scheduleStatus = getTodayScheduleStatus(selectedClass?.schedule || "");
  const monthlyDates = getMonthlyClassDates(selectedClass?.schedule || "");
  const todayStr = new Date().toISOString().split("T")[0];

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

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={setAllPresent}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 text-center"
          >
            Tất cả [Có mặt]
          </button>
          <button
            onClick={handleSaveAttendance}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95 text-center"
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

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-soft">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-brand-primary shadow-sm">
            <CheckSquare className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">
            Bạn chưa có lớp học nào để điểm danh
          </h2>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Hệ thống không hiển thị dữ liệu mẫu đối với tài khoản thật của bạn. Vui lòng tạo lớp học đầu tiên và thêm học viên để bắt đầu điểm danh.
          </p>
          <a
            href="/coach/classes"
            className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3 text-xs font-bold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-primary-hover active:scale-95 transition-all"
          >
            <BookOpen className="h-4 w-4" />
            <span>Tạo Lớp Học Mới</span>
          </a>
        </div>
      ) : (
        <>
          {/* Smart Schedule Status Indicator Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Lịch học cố định của lớp:
                  </span>
                  <span className="rounded-lg bg-emerald-500/20 px-2.5 py-0.5 text-xs font-extrabold text-emerald-400 border border-emerald-500/30">
                    {selectedClass?.schedule}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    Hệ thống tự động nhảy đến buổi học đúng thứ & giờ học theo lịch của lớp.
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {scheduleStatus.status === "HAPPENING" ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow-sm animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  {scheduleStatus.message}
                </span>
              ) : scheduleStatus.status === "UPCOMING" ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/20 border border-blue-400/30 px-3 py-1.5 text-xs font-bold text-blue-300">
                  <Clock className="h-3.5 w-3.5" />
                  {scheduleStatus.message}
                </span>
              ) : scheduleStatus.status === "PAST" ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  {scheduleStatus.message}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  {scheduleStatus.message}
                </span>
              )}

              {/* Nút 1 chạm quay về buổi hôm nay nếu hôm nay có lịch */}
              {scheduleStatus.status !== "NOT_TODAY" && sessionDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setSessionDate(todayStr)}
                  className="rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-primary-hover shadow-sm transition-all"
                >
                  Về Ca Hôm Nay
                </button>
              )}
            </div>
          </div>

          {/* Quick Schedule Session Picker (Các buổi học chuẩn theo lịch trong tháng) */}
          {monthlyDates.length > 0 && (
            <div className="rounded-2xl bg-white p-3.5 shadow-soft border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brand-primary" />
                  <span>Các buổi học theo lịch trong tháng của lớp ({monthlyDates.length} buổi):</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Chạm vào ngày để nhảy ngay đến buổi học đó
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                {monthlyDates.map((item) => {
                  const isSelected = item.dateStr === sessionDate;
                  const hasData = dataStore.sessions.some(
                    (s) => s.classId === selectedClass?.id && s.date === item.dateStr
                  );

                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setSessionDate(item.dateStr)}
                      className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-sm ${
                        isSelected
                          ? "bg-brand-primary text-white shadow-brand-primary/25 scale-[1.02]"
                          : hasData
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {hasData && (
                        <Check className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-emerald-600"}`} />
                      )}
                      <span>{item.label}</span>
                      {item.isToday && (
                        <span
                          className={`rounded px-1 py-0.2 text-[9px] font-black uppercase ${
                            isSelected ? "bg-white text-brand-primary" : "bg-emerald-600 text-white"
                          }`}
                        >
                          Hôm nay
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
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
                  onChange={(e) => handleSelectClass(e.target.value)}
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
                      <div className="flex flex-wrap items-center gap-1.5 animate-fade-in w-full sm:w-auto">
                        <input
                          type="text"
                          value={records[std.id]?.bookTitle || ""}
                          onChange={(e) => handleBookTitleChange(std.id, e.target.value)}
                          placeholder="Tên sách (VD: Sách Cờ vua Vỡ lòng)..."
                          className="flex-1 min-w-[150px] sm:w-48 rounded-xl border border-amber-300 bg-amber-50/40 px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-brand-primary focus:bg-white focus:outline-none"
                        />
                        <div className="relative flex-1 min-w-[100px] sm:w-28">
                          <input
                            type="number"
                            step="10000"
                            value={records[std.id]?.bookPrice || 0}
                            onChange={(e) => handleBookPriceChange(std.id, Number(e.target.value))}
                            placeholder="Giá sách"
                            className="w-full rounded-xl border border-amber-300 bg-amber-50/40 py-1.5 pl-2.5 pr-6 text-xs font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                          />
                          <span className="pointer-events-none absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">
                            đ
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 whitespace-nowrap">
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
    </>
  )}
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
