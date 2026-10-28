"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
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
  RotateCcw,
  Plus,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  UserCheck,
  DollarSign,
  Phone,
  User,
  GraduationCap,
} from "lucide-react";
import {
  dataStore,
  AttendanceSessionData,
  ClassroomData,
  StudentData,
  getCoachClasses,
} from "@/lib/data-store";
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

  const [currentCoachId, setCurrentCoachId] = useState<string>("");
  const [currentCoachEmail, setCurrentCoachEmail] = useState<string>("");
  const [classes, setClasses] = useState<ClassroomData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [topic, setTopic] = useState<string>(
    "Chiến thuật Cờ vua: Đòn Chĩa Đôi & Phối hợp Chiếu Hết"
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState<number>(0);

  // Danh sách ID học viên học bù trong buổi học này
  const [makeupStudentIds, setMakeupStudentIds] = useState<string[]>([]);

  // Modal State: Thêm học viên / Học bù
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTab, setAddTab] = useState<"MAKEUP" | "OFFICIAL">("MAKEUP");
  const [addMode, setAddMode] = useState<"SELECT" | "CREATE">("SELECT");
  const [studentSearchKeyword, setStudentSearchKeyword] = useState("");
  const [newStudentForm, setNewStudentForm] = useState({
    fullName: "",
    birthYear: 2018,
    parentName: "",
    parentPhone: "",
    customFee: "",
    notes: "",
  });

  // Modal State: Sửa học viên trực tiếp
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    birthYear: 2018,
    parentName: "",
    parentPhone: "",
    customFee: "",
    notes: "",
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Tải lớp học của riêng HLV hiện tại (cách ly hoàn toàn, không lẫn lớp của HLV khác)
  useEffect(() => {
    let coachId = "";
    let coachEmail = "";
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) coachId = u.id;
        if (u.email) coachEmail = u.email;
      } catch (e) {}
    }
    setCurrentCoachId(coachId);
    setCurrentCoachEmail(coachEmail);

    const updateDisplay = () => {
      // Ở giao diện điểm danh của HLV, chỉ hiển thị lớp của chính HLV phụ trách
      const myClasses = getCoachClasses(coachId, coachEmail);
      setClasses(myClasses);

      const paramClassId = searchParams.get("classId");
      let targetClass: ClassroomData | undefined;

      if (paramClassId && myClasses.some((c) => c.id === paramClassId)) {
        targetClass = myClasses.find((c) => c.id === paramClassId);
      } else {
        const todayDay = new Date().getDay();
        const todayClass = myClasses.find((c) => parseScheduleInfo(c.schedule).days.includes(todayDay));
        targetClass = todayClass || myClasses[0];
      }

      if (targetClass) {
        setSelectedClassId((prev) => (myClasses.some((c) => c.id === prev) ? prev : targetClass!.id));
        const smartDate = getSmartSessionDate(targetClass.schedule);
        setSessionDate((prev) => prev || smartDate);
      }
    };

    updateDisplay();
    dataStore.syncWithDatabase().then(() => {
      updateDisplay();
    });
  }, [searchParams, dataRefreshTrigger]);

  // Lớp đang chọn
  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Danh sách học viên chính thức của lớp
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return dataStore.students.filter((s) => s.classIds.includes(selectedClass.id));
  }, [selectedClass, dataRefreshTrigger]);

  // Danh sách học viên học bù trong buổi này
  const makeupStudents = useMemo(() => {
    return dataStore.students.filter((s) => makeupStudentIds.includes(s.id));
  }, [makeupStudentIds, dataRefreshTrigger]);

  // Toàn bộ học sinh tham gia buổi học hôm nay (học sinh chính thức + học sinh học bù)
  const sessionStudents = useMemo(() => {
    return [...classStudents, ...makeupStudents];
  }, [classStudents, makeupStudents]);

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

  // Khởi tạo trạng thái điểm danh khi đổi lớp hoặc đổi ngày buổi học
  useEffect(() => {
    if (!selectedClass) return;

    // Kiểm tra xem đã có buổi học nào vào ngày này chưa
    const existingSession = dataStore.sessions.find(
      (s) => s.classId === selectedClass.id && s.date === sessionDate
    );

    // Xác định học viên học bù từ buổi học đã lưu trước đó (nếu có)
    const initialMakeupIds: string[] = [];
    if (existingSession) {
      existingSession.records.forEach((rec) => {
        if (!classStudents.some((cs) => cs.id === rec.studentId)) {
          if (!initialMakeupIds.includes(rec.studentId)) {
            initialMakeupIds.push(rec.studentId);
          }
        }
      });
    }
    setMakeupStudentIds(initialMakeupIds);

    const makeupStds = dataStore.students.filter((s) => initialMakeupIds.includes(s.id));
    const allStds = [...classStudents, ...makeupStds];

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
      allStds.forEach((std) => {
        const r = existingSession.records.find((rec) => rec.studentId === std.id);
        const isMakeup = initialMakeupIds.includes(std.id);
        initial[std.id] = {
          status: r ? r.status : "PRESENT",
          note: r?.coachNote || (isMakeup ? "Học bù" : ""),
          hasBook: !!(r?.bookTitle && r?.bookPrice),
          bookTitle: r?.bookTitle || "Sách Cờ Vua Bài Tập",
          bookPrice: r?.bookPrice || 80000,
        };
      });
    } else {
      allStds.forEach((std) => {
        const isMakeup = initialMakeupIds.includes(std.id);
        initial[std.id] = {
          status: "PRESENT", // Mặc định [Có mặt] theo đặc tả
          note: isMakeup ? "Học bù" : "",
          hasBook: false,
          bookTitle: "Sách Cờ Vua Bài Tập",
          bookPrice: 80000,
        };
      });
    }

    setRecords(initial);
  }, [selectedClassId, sessionDate, selectedClass, classStudents.length]);

  // Toggle 1 chạm: PRESENT <-> ABSENT
  const toggleStatus = (studentId: string) => {
    setRecords((prev) => {
      const isMakeup = makeupStudentIds.includes(studentId);
      const current = prev[studentId] || {
        status: "PRESENT",
        note: isMakeup ? "Học bù" : "",
        hasBook: false,
        bookTitle: "Sách Cờ Vua Bài Tập",
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
      const isMakeup = makeupStudentIds.includes(studentId);
      const current = prev[studentId] || {
        status: "PRESENT",
        note: isMakeup ? "Học bù" : "",
        hasBook: false,
        bookTitle: "Sách Cờ Vua Bài Tập",
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
    setRecords((prev) => {
      const updated: Record<
        string,
        {
          status: "PRESENT" | "ABSENT";
          note: string;
          hasBook: boolean;
          bookTitle: string;
          bookPrice: number;
        }
      > = { ...prev };
      sessionStudents.forEach((std) => {
        const current = prev[std.id];
        const isMakeup = makeupStudentIds.includes(std.id);
        updated[std.id] = {
          status: "PRESENT",
          note: current?.note || (isMakeup ? "Học bù" : ""),
          hasBook: current?.hasBook || false,
          bookTitle: current?.bookTitle || "Sách Cờ Vua Bài Tập",
          bookPrice: current?.bookPrice || 80000,
        };
      });
      return updated;
    });
    showToast(`Đã chuyển toàn bộ ${sessionStudents.length} học viên sang trạng thái [Có mặt]!`);
  };

  const setAllAbsent = () => {
    setRecords((prev) => {
      const updated: Record<
        string,
        {
          status: "PRESENT" | "ABSENT";
          note: string;
          hasBook: boolean;
          bookTitle: string;
          bookPrice: number;
        }
      > = { ...prev };
      sessionStudents.forEach((std) => {
        const current = prev[std.id];
        const isMakeup = makeupStudentIds.includes(std.id);
        updated[std.id] = {
          status: "ABSENT",
          note: current?.note || (isMakeup ? "Học bù" : ""),
          hasBook: current?.hasBook || false,
          bookTitle: current?.bookTitle || "Sách Cờ Vua Bài Tập",
          bookPrice: current?.bookPrice || 80000,
        };
      });
      return updated;
    });
    showToast(`Đã chuyển toàn bộ ${sessionStudents.length} học viên sang trạng thái [Vắng mặt]!`);
  };

  const isAllPresent =
    sessionStudents.length > 0 &&
    sessionStudents.every((std) => records[std.id]?.status === "PRESENT");

  const toggleAllAttendance = () => {
    if (isAllPresent) {
      setAllAbsent();
    } else {
      setAllPresent();
    }
  };

  // Lưu buổi học vào hệ thống và Supabase
  const handleSaveAttendance = () => {
    if (!selectedClass) return;

    const sessionRecords = sessionStudents.map((std) => {
      const current = records[std.id];
      const finalStatus: "PRESENT" | "ABSENT" =
        current?.status === "ABSENT" ? "ABSENT" : "PRESENT";

      const isMakeup = makeupStudentIds.includes(std.id);
      let note = current?.note || "";
      if (isMakeup && !note.includes("Học bù")) {
        note = note ? `[Học bù] ${note}` : "[Học bù]";
      }

      return {
        id: `rec-${Date.now()}-${std.id}`,
        sessionId: `sess-${selectedClass.id}-${sessionDate}`,
        studentId: std.id,
        status: finalStatus,
        coachNote: note,
        bookTitle: current?.hasBook ? (current?.bookTitle || "Sách Cờ Vua Bài Tập") : undefined,
        bookPrice: current?.hasBook ? (Number(current?.bookPrice) || 0) : undefined,
      };
    });

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

    // Tự động tính toán lại toàn bộ học phí theo quy tắc THỰC HỌC - THỰC TRẢ (bao gồm cả học sinh học bù)
    const dateObj = new Date(sessionDate);
    dataStore.recalculateAllInvoices(dateObj.getMonth() + 1, dateObj.getFullYear());
    dataStore.saveToLocalStorage();

    // Đồng bộ lên Supabase Database
    try {
      fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass.id,
          date: sessionDate,
          topic: topic || "Buổi học cờ vua",
          records: sessionRecords,
        }),
      }).catch((err) => console.warn("Lỗi lưu điểm danh lên máy chủ Supabase:", err));
    } catch (e) {}

    setSaveSuccess(true);
    showToast(`Đã lưu điểm danh buổi học ngày ${sessionDate} thành công!`);
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.7 },
      colors: ["#00B18A", "#E67E22"],
    });

    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // -------------------------------------------------------------
  // XỬ LÝ THÊM HỌC VIÊN TRỰC TIẾP (HỌC BÙ HOẶC CHÍNH THỨC)
  // -------------------------------------------------------------
  const handleAddExistingStudent = async (student: StudentData) => {
    if (!selectedClass) return;

    if (addTab === "MAKEUP") {
      // Thêm học bù: CHỈ tham gia buổi này, KHÔNG thêm vào danh sách lớp
      if (!makeupStudentIds.includes(student.id)) {
        setMakeupStudentIds((prev) => [...prev, student.id]);
      }
      setRecords((prev) => ({
        ...prev,
        [student.id]: {
          status: "PRESENT",
          note: "[Học bù]",
          hasBook: false,
          bookTitle: "Sách Cờ Vua Bài Tập",
          bookPrice: 80000,
        },
      }));
      setIsAddModalOpen(false);
      showToast(`Đã thêm học viên "${student.fullName}" vào buổi học này với tư cách HỌC BÙ!`);
    } else {
      // Thêm chính thức vào lớp
      const updatedClassIds = Array.from(new Set([...student.classIds, selectedClass.id]));
      student.classIds = updatedClassIds;
      await dataStore.updateStudent(student.id, { classIds: updatedClassIds });
      setRecords((prev) => ({
        ...prev,
        [student.id]: {
          status: "PRESENT",
          note: "",
          hasBook: false,
          bookTitle: "Sách Cờ Vua Bài Tập",
          bookPrice: 80000,
        },
      }));
      setDataRefreshTrigger((prev) => prev + 1);
      setIsAddModalOpen(false);
      showToast(`Đã thêm học viên "${student.fullName}" vào danh sách chính thức của lớp!`);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    if (!newStudentForm.fullName.trim()) {
      alert("Vui lòng điền Họ tên học sinh!");
      return;
    }

    const birthYear = Number(newStudentForm.birthYear) || 2018;
    const customFee = newStudentForm.customFee.trim() ? parseFloat(newStudentForm.customFee) : undefined;

    if (addTab === "MAKEUP") {
      // Tạo học sinh mới và CHỈ gán vào buổi học bù này (không đưa vào classIds của lớp)
      const newStudent: StudentData = {
        id: `std-${Date.now()}`,
        code: `HS${String(birthYear).slice(-2)}`,
        fullName: newStudentForm.fullName.trim(),
        birthYear,
        parentName: newStudentForm.parentName.trim() || "Phụ huynh",
        parentPhone: newStudentForm.parentPhone.trim(),
        currentLevel: selectedClass.level,
        notes: newStudentForm.notes.trim() ? `[Học bù] ${newStudentForm.notes.trim()}` : "[Học bù]",
        classIds: [], // Không thêm classId của lớp này!
        customFeePerSession: customFee,
      };

      await dataStore.addStudent(newStudent);
      setMakeupStudentIds((prev) => [...prev, newStudent.id]);
      setRecords((prev) => ({
        ...prev,
        [newStudent.id]: {
          status: "PRESENT",
          note: "[Học bù]",
          hasBook: false,
          bookTitle: "Sách Cờ Vua Bài Tập",
          bookPrice: 80000,
        },
      }));

      setIsAddModalOpen(false);
      setNewStudentForm({
        fullName: "",
        birthYear: 2018,
        parentName: "",
        parentPhone: "",
        customFee: "",
        notes: "",
      });
      showToast(`Đã tạo học viên "${newStudent.fullName}" và thêm vào buổi học này (Học bù)!`);
    } else {
      // Tạo học sinh mới và thêm CHÍNH THỨC vào lớp
      const newStudent: StudentData = {
        id: `std-${Date.now()}`,
        code: `HS${String(birthYear).slice(-2)}`,
        fullName: newStudentForm.fullName.trim(),
        birthYear,
        parentName: newStudentForm.parentName.trim() || "Phụ huynh",
        parentPhone: newStudentForm.parentPhone.trim(),
        currentLevel: selectedClass.level,
        notes: newStudentForm.notes.trim(),
        classIds: [selectedClass.id],
        customFeePerSession: customFee,
      };

      await dataStore.addStudent(newStudent);
      setRecords((prev) => ({
        ...prev,
        [newStudent.id]: {
          status: "PRESENT",
          note: "",
          hasBook: false,
          bookTitle: "Sách Cờ Vua Bài Tập",
          bookPrice: 80000,
        },
      }));
      setDataRefreshTrigger((prev) => prev + 1);

      setIsAddModalOpen(false);
      setNewStudentForm({
        fullName: "",
        birthYear: 2018,
        parentName: "",
        parentPhone: "",
        customFee: "",
        notes: "",
      });
      showToast(`Đã tạo học viên mới "${newStudent.fullName}" và thêm vào lớp!`);
    }
  };

  // -------------------------------------------------------------
  // XỬ LÝ SỬA HỌC VIÊN TRỰC TIẾP
  // -------------------------------------------------------------
  const openEditModal = (student: StudentData) => {
    setEditingStudent(student);
    setEditForm({
      fullName: student.fullName,
      birthYear: student.birthYear || 2018,
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
      customFee: student.customFeePerSession ? String(student.customFeePerSession) : "",
      notes: student.notes || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editForm.fullName.trim()) {
      alert("Họ tên học viên không được để trống!");
      return;
    }

    const birthYear = Number(editForm.birthYear) || 2018;
    const customFee = editForm.customFee.trim() ? parseFloat(editForm.customFee) : undefined;

    await dataStore.updateStudent(editingStudent.id, {
      fullName: editForm.fullName.trim(),
      birthYear,
      parentName: editForm.parentName.trim(),
      parentPhone: editForm.parentPhone.trim(),
      customFeePerSession: customFee,
      notes: editForm.notes.trim(),
    });

    setDataRefreshTrigger((prev) => prev + 1);
    setIsEditModalOpen(false);
    setEditingStudent(null);
    showToast(`Đã cập nhật thông tin học viên "${editForm.fullName}"!`);
  };

  // -------------------------------------------------------------
  // XỬ LÝ XÓA HỌC VIÊN TRỰC TIẾP
  // -------------------------------------------------------------
  const handleDeleteStudent = async (student: StudentData) => {
    const isMakeup = makeupStudentIds.includes(student.id);

    if (isMakeup) {
      // Học sinh học bù: Chỉ cần xóa khỏi buổi học hiện tại
      if (window.confirm(`Xóa học sinh học bù "${student.fullName}" khỏi buổi học ngày ${sessionDate}?`)) {
        setMakeupStudentIds((prev) => prev.filter((id) => id !== student.id));
        setRecords((prev) => {
          const next = { ...prev };
          delete next[student.id];
          return next;
        });
        showToast(`Đã xóa học sinh học bù "${student.fullName}" khỏi buổi học này!`);
      }
    } else {
      // Học sinh chính thức: Xóa khỏi danh sách lớp
      if (
        window.confirm(
          `Bạn có chắc chắn muốn xóa học viên "${student.fullName}" khỏi lớp "${selectedClass?.name}" không?`
        )
      ) {
        if (selectedClass) {
          await dataStore.deleteStudent(student.id, selectedClass.id);
        }
        setRecords((prev) => {
          const next = { ...prev };
          delete next[student.id];
          return next;
        });
        setDataRefreshTrigger((prev) => prev + 1);
        showToast(`Đã xóa học viên "${student.fullName}" khỏi lớp!`);
      }
    }
  };

  // Danh sách học sinh có sẵn từ hệ thống để thêm vào buổi học/lớp
  const candidateStudents = useMemo(() => {
    return dataStore.students
      .filter((s) => !sessionStudents.some((cur) => cur.id === s.id))
      .filter((s) => {
        if (!studentSearchKeyword.trim()) return true;
        const kw = studentSearchKeyword.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(kw) ||
          s.parentPhone.includes(kw) ||
          (s.code && s.code.toLowerCase().includes(kw))
        );
      });
  }, [sessionStudents, studentSearchKeyword, dataRefreshTrigger]);

  // Thống kê nhanh buổi học
  const presentCount = sessionStudents.filter(
    (std) => records[std.id]?.status === "PRESENT"
  ).length;
  const absentCount = sessionStudents.length - presentCount;

  // Thống kê phát sách trong buổi học
  const totalBooksInSession = sessionStudents.filter((std) => records[std.id]?.hasBook).length;
  const totalBookPriceInSession = sessionStudents.reduce(
    (sum, std) => sum + (records[std.id]?.hasBook ? Number(records[std.id]?.bookPrice) || 0 : 0),
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
            Học viên Có mặt tính phí, Vắng mặt không tính phí. Hỗ trợ học sinh học bù và quản lý học viên trực tiếp.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
          >
            <UserPlus className="h-4 w-4 text-brand-primary" />
            <span>Thêm Học Viên / Học Bù</span>
          </button>
          <button
            onClick={handleSaveAttendance}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95 text-center transition-all"
          >
            <Save className="h-4 w-4" />
            <span>Lưu Điểm Danh</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-emerald-500/40 animate-fade-in">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-primary text-white flex-shrink-0">
            <Check className="h-4 w-4" />
          </div>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Success notification */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 animate-fade-in shadow-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary text-white">
            <Check className="h-4 w-4" />
          </div>
          <span>
            Đã lưu kết quả điểm danh thành công! Hệ thống đã tự động tính học phí theo nguyên tắc Thực học - Thực trả.
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
            Tài khoản của bạn chưa phụ trách lớp học nào. Vui lòng tạo lớp học đầu tiên và thêm học viên để bắt đầu điểm danh.
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
                  Sĩ số buổi này: <strong className="text-slate-900">{sessionStudents.length} học viên</strong>
                  {makeupStudents.length > 0 && (
                    <span className="ml-1 text-purple-700 font-bold">
                      ({classStudents.length} chính thức + {makeupStudents.length} học bù)
                    </span>
                  )}
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
          <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 p-4 gap-2 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Danh Sách Điểm Danh Buổi Học ({sessionStudents.length} Học Viên)</span>
                  {makeupStudents.length > 0 && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800 border border-purple-200">
                      {makeupStudents.length} học bù
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Chạm vào nút trạng thái để chuyển đổi [Có mặt] / [Vắng]. Bạn có thể sửa hoặc xóa học viên trực tiếp trên danh sách.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-primary/40 bg-brand-primary/10 px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-brand-primary/20 transition-all active:scale-95"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ Thêm Học Viên / Học Bù</span>
                </button>
                <button
                  type="button"
                  onClick={toggleAllAttendance}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 shadow-xs ${
                    isAllPresent
                      ? "border-rose-300 bg-rose-50/80 text-rose-700 hover:bg-rose-100"
                      : "border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100"
                  }`}
                  title={
                    isAllPresent
                      ? "Hiện tại tất cả đang có mặt. Bấm để đổi sang tất cả vắng mặt"
                      : "Bấm để đổi sang tất cả có mặt"
                  }
                >
                  {isAllPresent ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                      <span>Đổi Tất cả [Vắng]</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Đổi Tất cả [Có mặt]</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {sessionStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Chưa có học viên nào trong buổi học này. Hãy bấm <strong>&ldquo;+ Thêm Học Viên / Học Bù&rdquo;</strong> ở trên để thêm học sinh.
                </div>
              ) : (
                sessionStudents.map((std, index) => {
                  const isPresent = records[std.id]?.status === "PRESENT";
                  const currentNote = records[std.id]?.note || "";
                  const isMakeup = makeupStudentIds.includes(std.id);

                  return (
                    <div
                      key={std.id}
                      className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                        isMakeup
                          ? "bg-purple-50/30 hover:bg-purple-50/50 border-l-4 border-l-purple-500"
                          : isPresent
                          ? "bg-white hover:bg-slate-50/70"
                          : "bg-orange-50/30 hover:bg-orange-50/50"
                      }`}
                    >
                      {/* Student Info & Actions */}
                      <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={getStudentAvatarUrl(std.avatar, std.fullName, index)}
                            alt={std.fullName}
                            className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 flex-shrink-0 shadow-sm"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {std.fullName}
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-slate-400">
                                ({std.code})
                              </span>
                              {isMakeup && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-300 px-2 py-0.5 text-[10px] font-extrabold text-purple-800">
                                  ✨ Học bù (1 buổi)
                                </span>
                              )}
                              {std.customFeePerSession && (
                                <span className="rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                  {std.customFeePerSession.toLocaleString("vi-VN")} đ/buổi
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                              <span>SĐT: {std.parentPhone}</span>
                              {std.birthYear && <span>• Năm sinh: {std.birthYear}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Direct Edit / Delete buttons */}
                        <div className="flex items-center gap-1 sm:ml-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(std)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-brand-primary hover:bg-slate-100 transition-colors"
                            title="Sửa thông tin học viên trực tiếp"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(std)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title={isMakeup ? "Xóa khỏi buổi học này" : "Xóa khỏi danh sách lớp"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                                placeholder="Tên sách (VD: Sách Cờ vua Bài tập)..."
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
                })
              )}
            </div>

            {/* Bottom Save Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50 p-4 gap-3">
              <span className="text-xs text-slate-500">
                Tổng cộng: <strong className="text-brand-primary">{presentCount} Có mặt</strong> • <strong className="text-brand-secondary">{absentCount} Vắng mặt</strong>
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={toggleAllAttendance}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 shadow-xs ${
                    isAllPresent
                      ? "border-rose-300 bg-rose-50/80 text-rose-700 hover:bg-rose-100"
                      : "border-emerald-300 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  {isAllPresent ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                      <span>Đổi Tất cả [Vắng]</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Đổi Tất cả [Có mặt]</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSaveAttendance}
                  className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95 transition-all"
                >
                  <Save className="h-4 w-4" />
                  <span>Lưu Điểm Danh</span>
                </button>
              </div>
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
              {pastSessions.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">Chưa có buổi học nào được lưu cho lớp này.</div>
              ) : (
                pastSessions.map((sess) => {
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
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ============================================================= */}
      {/* MODAL THÊM HỌC VIÊN / HỌC BÙ TRỰC TIẾP                        */}
      {/* ============================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Thêm Học Viên Vào Buổi Học
                </h3>
                <p className="text-xs text-slate-500">
                  Lớp: <strong className="text-slate-800">{selectedClass?.name}</strong> • Ngày: {sessionDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab: HỌC BÙ vs HỌC VIÊN CHÍNH THỨC */}
            <div className="grid grid-cols-2 p-3 gap-2 bg-slate-100 border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddTab("MAKEUP")}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  addTab === "MAKEUP"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Học Bù (Chỉ Buổi Này)</span>
              </button>
              <button
                type="button"
                onClick={() => setAddTab("OFFICIAL")}
                className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  addTab === "OFFICIAL"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-slate-600 hover:bg-white/60"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Vào Lớp Chính Thức</span>
              </button>
            </div>

            {/* Note banner explaining the choice */}
            <div className={`p-3 text-xs border-b ${
              addTab === "MAKEUP"
                ? "bg-purple-50 text-purple-900 border-purple-200"
                : "bg-emerald-50 text-emerald-900 border-emerald-200"
            }`}>
              {addTab === "MAKEUP" ? (
                <p>
                  ⭐ <strong>Chế độ Học Bù:</strong> Học sinh này sẽ chỉ tham gia và ghi nhận điểm danh ở buổi học ngày {sessionDate}, <strong>không bị thêm</strong> vào danh sách cố định của lớp.
                </p>
              ) : (
                <p>
                  👤 <strong>Học viên Chính Thức:</strong> Học sinh này sẽ được thêm vào danh sách cố định của lớp <strong>{selectedClass?.name}</strong> cho tất cả các buổi học sau này.
                </p>
              )}
            </div>

            {/* Mode: Chọn có sẵn vs Tạo mới */}
            <div className="flex items-center gap-4 px-5 pt-4 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="addMode"
                  checked={addMode === "SELECT"}
                  onChange={() => setAddMode("SELECT")}
                  className="text-brand-primary focus:ring-brand-primary"
                />
                <span>Chọn học sinh có sẵn từ CLB</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="addMode"
                  checked={addMode === "CREATE"}
                  onChange={() => setAddMode("CREATE")}
                  className="text-brand-primary focus:ring-brand-primary"
                />
                <span>Tạo học sinh mới</span>
              </label>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {addMode === "SELECT" ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearchKeyword}
                      onChange={(e) => setStudentSearchKeyword(e.target.value)}
                      placeholder="Tìm kiếm theo Tên, Số điện thoại phụ huynh hoặc Mã..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {candidateStudents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Không tìm thấy học sinh phù hợp nào để thêm.
                      </div>
                    ) : (
                      candidateStudents.slice(0, 30).map((std) => (
                        <div
                          key={std.id}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{std.fullName}</span>
                              <span className="text-[10px] font-mono text-slate-400">({std.code})</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              SĐT: {std.parentPhone} • Trình độ: {std.currentLevel}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddExistingStudent(std)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              addTab === "MAKEUP"
                                ? "bg-purple-600 text-white hover:bg-purple-700"
                                : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                            }`}
                          >
                            {addTab === "MAKEUP" ? "Chọn Học Bù" : "Thêm Vào Lớp"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateStudent} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Họ và tên học sinh *</label>
                    <input
                      type="text"
                      required
                      value={newStudentForm.fullName}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, fullName: e.target.value })}
                      placeholder="VD: Nguyễn Tuấn Minh"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Năm sinh</label>
                      <input
                        type="number"
                        min="2010"
                        max="2025"
                        value={newStudentForm.birthYear}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, birthYear: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">SĐT phụ huynh</label>
                      <input
                        type="tel"
                        value={newStudentForm.parentPhone}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, parentPhone: e.target.value })}
                        placeholder="0912... (không bắt buộc)"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">Tên phụ huynh</label>
                      <input
                        type="text"
                        value={newStudentForm.parentName}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, parentName: e.target.value })}
                        placeholder="VD: Anh Nam"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">Đơn giá riêng (nếu có)</label>
                      <input
                        type="number"
                        step="10000"
                        value={newStudentForm.customFee}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, customFee: e.target.value })}
                        placeholder={`Mặc định: ${selectedClass?.feePerSession.toLocaleString("vi-VN")} đ`}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                    <input
                      type="text"
                      value={newStudentForm.notes}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, notes: e.target.value })}
                      placeholder="VD: Đổi lịch từ thứ 3 sang học bù..."
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-md ${
                        addTab === "MAKEUP"
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-brand-primary hover:bg-brand-primary-hover"
                      }`}
                    >
                      {addTab === "MAKEUP" ? "Tạo & Thêm Học Bù" : "Tạo & Thêm Vào Lớp"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL SỬA HỌC VIÊN TRỰC TIẾP                                  */}
      {/* ============================================================= */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Sửa Thông Tin Học Viên
                </h3>
                <p className="text-xs text-slate-500">
                  Mã học viên: <strong className="font-mono">{editingStudent.code}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingStudent(null);
                }}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Họ và tên học sinh *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Năm sinh</label>
                  <input
                    type="number"
                    min="2010"
                    max="2025"
                    value={editForm.birthYear}
                    onChange={(e) => setEditForm({ ...editForm, birthYear: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">SĐT phụ huynh</label>
                  <input
                    type="tel"
                    value={editForm.parentPhone}
                    onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                    placeholder="0912... (không bắt buộc)"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Tên phụ huynh</label>
                  <input
                    type="text"
                    value={editForm.parentName}
                    onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Đơn giá riêng (VNĐ/buổi)</label>
                  <input
                    type="number"
                    step="10000"
                    value={editForm.customFee}
                    onChange={(e) => setEditForm({ ...editForm, customFee: e.target.value })}
                    placeholder="Để trống nếu theo lớp"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Ghi chú</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-primary px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover"
                >
                  Cập Nhật Học Viên
                </button>
              </div>
            </form>
          </div>
        </div>
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
