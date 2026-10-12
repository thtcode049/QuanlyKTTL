"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  Calendar,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight,
  UserPlus,
  Check,
  X,
  Sparkles,
  Edit2,
  Trash2,
  MoreVertical,
  Camera,
  Phone,
  Copy,
  Info,
  User,
  HelpCircle,
} from "lucide-react";
import { dataStore, ClassroomData, StudentData } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import { getStudentAvatarUrl } from "@/lib/chess-avatars";
import { StudentProfileModal } from "@/components/student-profile-modal";
import { StudentContextMenu, ContextMenuPosition } from "@/components/student-context-menu";

export default function CoachClassesPage() {
  const [currentCoachId, setCurrentCoachId] = useState<string>("user-coach-1");
  const [classes, setClasses] = useState<ClassroomData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  // Tải thông tin tài khoản HLV hiện tại từ localStorage
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

    // Lọc danh sách lớp học của riêng HLV này (nếu là Admin thì hiển thị toàn bộ lớp)
    const myClasses = isAdmin
      ? dataStore.classes
      : dataStore.classes.filter((c) => c.coachId === coachId);
    setClasses(myClasses);
    setSelectedClassId(myClasses[0]?.id || "");

    const myClassIds = myClasses.map((c) => c.id);
    const myStudents = isAdmin
      ? dataStore.students
      : dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid)));
    setStudents(myStudents);
  }, []);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Student Profile Modal State
  const [profileStudent, setProfileStudent] = useState<StudentData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Custom Context Menu State
  const [contextMenuStudent, setContextMenuStudent] = useState<StudentData | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  // Inline Editing State
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({
    fullName: "",
    birthYear: 2018,
    parentName: "",
    parentPhone: "",
    eloRating: 1000,
    customFee: "",
    notes: "",
  });

  // Modal State: Thêm học viên mới
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentBirthYear, setNewStudentBirthYear] = useState("2018");
  const [newParentName, setNewParentName] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  const [newStudentElo, setNewStudentElo] = useState("1000");
  const [newStudentNotes, setNewStudentNotes] = useState("");
  const [newCustomFee, setNewCustomFee] = useState("");

  // Modal State: Tạo lớp mới
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("Nhập môn");
  const [newClassBranch, setNewClassBranch] = useState("branch-1");
  const [newClassSchedule, setNewClassSchedule] = useState("Thứ 4 & Thứ 7 (18:00 - 19:30)");
  const [newClassFee, setNewClassFee] = useState("160000");

  // Modal State: Sửa thông tin lớp
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [editClassName, setEditClassName] = useState("");
  const [editClassLevel, setEditClassLevel] = useState("Nhập môn");
  const [editClassBranch, setEditClassBranch] = useState("branch-1");
  const [editClassSchedule, setEditClassSchedule] = useState("");
  const [editClassFee, setEditClassFee] = useState("");

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const branchInfo = dataStore.branches.find((b) => b.id === selectedClass?.branchId);

  // Học sinh của lớp đang chọn
  const classStudents = students.filter(
    (s) =>
      s.classIds.includes(selectedClass?.id || "") &&
      (s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.parentPhone.includes(searchTerm))
  );

  // Xử lý mở Hồ sơ học viên
  const handleOpenProfile = (student: StudentData) => {
    setProfileStudent(student);
    setIsProfileOpen(true);
  };

  // Cập nhật học sinh từ Modal Profile
  const handleStudentUpdated = (updated: StudentData) => {
    setStudents([...dataStore.students]);
    setProfileStudent(updated);
    showToast(`Đã cập nhật hồ sơ học viên ${updated.fullName}!`);
  };

  // Context Menu: Bấm chuột phải
  const handleContextMenu = (e: React.MouseEvent, student: StudentData) => {
    e.preventDefault();
    setContextMenuStudent(student);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  // Context Menu: Bấm vào nút "..." tinh gọn
  const handleMoreButtonClick = (e: React.MouseEvent, student: StudentData) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenuStudent(student);
    setContextMenuPos({ x: rect.left - 180, y: rect.bottom + 6 });
    setIsContextMenuOpen(true);
  };

  // Bắt đầu sửa nhanh trực tiếp (Inline Editing)
  const handleStartInlineEdit = (student: StudentData) => {
    setInlineEditingId(student.id);
    setInlineForm({
      fullName: student.fullName,
      birthYear: student.birthYear,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      eloRating: student.eloRating,
      customFee: student.customFeePerSession ? String(student.customFeePerSession) : "",
      notes: student.notes || "",
    });
  };

  // Lưu chỉnh sửa nhanh
  const handleSaveInlineEdit = (studentId: string) => {
    if (!inlineForm.fullName.trim()) {
      alert("Họ tên học viên không được để trống!");
      return;
    }
    const updated = dataStore.updateStudent(studentId, {
      fullName: inlineForm.fullName.trim(),
      birthYear: Number(inlineForm.birthYear) || 2018,
      parentName: inlineForm.parentName.trim(),
      parentPhone: inlineForm.parentPhone.trim(),
      eloRating: Number(inlineForm.eloRating) || 1000,
      customFeePerSession: inlineForm.customFee.trim() ? Number(inlineForm.customFee) : undefined,
      notes: inlineForm.notes.trim(),
    });

    if (updated) {
      setStudents([...dataStore.students]);
      setInlineEditingId(null);
      showToast(`Đã lưu thay đổi học viên ${updated.fullName}!`);
    }
  };

  // Hủy chỉnh sửa nhanh
  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  // Cài đặt đơn giá học phí riêng
  const handleSetCustomFee = (student: StudentData) => {
    const current = student.customFeePerSession ?? selectedClass?.feePerSession;
    const input = window.prompt(
      `Cài đặt học phí riêng (ưu đãi/học bổng) cho học viên "${student.fullName}":\n(Nhập số tiền VNĐ/buổi, hoặc để trống để dùng giá lớp chuẩn)`,
      current ? String(current) : ""
    );

    if (input !== null) {
      const parsed = parseFloat(input.trim());
      dataStore.updateStudentFee(student.id, isNaN(parsed) || parsed <= 0 ? null : parsed);
      setStudents([...dataStore.students]);
      showToast(`Đã cập nhật học phí cho học viên ${student.fullName}!`);
    }
  };

  // Thêm học viên mới vào lớp
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newParentPhone) return;

    const newCode = `HS${(dataStore.students.length + 1).toString().padStart(3, "0")}`;
    const newStudent: StudentData = {
      id: `std-${Date.now()}`,
      code: newCode,
      fullName: newStudentName,
      birthYear: parseInt(newStudentBirthYear) || 2018,
      parentName: newParentName || "Phụ huynh " + newStudentName,
      parentPhone: newParentPhone,
      currentLevel: selectedClass?.level || "Nhập môn",
      eloRating: parseInt(newStudentElo) || 1000,
      notes: newStudentNotes,
      classIds: [selectedClass.id],
      customFeePerSession: newCustomFee ? Number(newCustomFee) : undefined,
    };

    dataStore.addStudent(newStudent);
    const myClasses = dataStore.classes.filter((c) => c.coachId === currentCoachId);
    const myClassIds = myClasses.map((c) => c.id);
    setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
    setIsAddStudentOpen(false);
    showToast(`Đã thêm học viên mới ${newStudent.fullName} vào lớp!`);

    // Reset form
    setNewStudentName("");
    setNewParentName("");
    setNewParentPhone("");
    setNewStudentNotes("");
    setNewCustomFee("");
  };

  // Tạo lớp mới
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    const newCls: ClassroomData = {
      id: `class-${Date.now()}`,
      name: newClassName,
      level: newClassLevel,
      feePerSession: parseFloat(newClassFee) || 160000,
      schedule: newClassSchedule,
      branchId: newClassBranch,
      coachId: currentCoachId,
      isActive: true,
    };

    dataStore.classes.push(newCls);
    dataStore.saveToLocalStorage();
    const myClasses = dataStore.classes.filter((c) => c.coachId === currentCoachId);
    setClasses(myClasses);
    setSelectedClassId(newCls.id);
    setIsCreateClassOpen(false);
    setNewClassName("");
    showToast(`Đã tạo lớp học mới: ${newCls.name}!`);
  };

  const openEditClassModal = () => {
    if (!selectedClass) return;
    setEditClassName(selectedClass.name);
    setEditClassLevel(selectedClass.level);
    setEditClassBranch(selectedClass.branchId);
    setEditClassSchedule(selectedClass.schedule);
    setEditClassFee(selectedClass.feePerSession.toString());
    setIsEditClassOpen(true);
  };

  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !editClassName) return;

    dataStore.updateClass(selectedClass.id, {
      name: editClassName,
      level: editClassLevel,
      branchId: editClassBranch,
      schedule: editClassSchedule,
      feePerSession: parseFloat(editClassFee) || selectedClass.feePerSession,
    });

    const myClasses = dataStore.classes.filter((c) => c.coachId === currentCoachId);
    setClasses(myClasses);
    setIsEditClassOpen(false);
    showToast(`Đã cập nhật thông tin lớp học!`);
  };

  const handleDeleteClass = () => {
    if (!selectedClass) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa lớp học "${selectedClass.name}" không?`)) {
      dataStore.deleteClass(selectedClass.id);
      const remainingClasses = dataStore.classes.filter((c) => c.coachId === currentCoachId);
      setClasses(remainingClasses);
      setSelectedClassId(remainingClasses[0]?.id || "");
      const myClassIds = remainingClasses.map((c) => c.id);
      setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
      setIsEditClassOpen(false);
      showToast(`Đã xóa lớp học!`);
    }
  };

  const handleRemoveStudentFromClass = (student: StudentData) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa học viên "${student.fullName}" khỏi lớp này không?`)) {
      student.classIds = student.classIds.filter((cid) => cid !== selectedClass.id);
      dataStore.recalculateAllInvoices(10, 2026);
      dataStore.saveToLocalStorage();
      const myClasses = dataStore.classes.filter((c) => c.coachId === currentCoachId);
      const myClassIds = myClasses.map((c) => c.id);
      setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
      showToast(`Đã xóa học viên ${student.fullName} khỏi lớp!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification floating popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-brand-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Lớp Học Của Tôi
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý hồ sơ học viên, ảnh đại diện, điểm danh và học phí theo nguyên tắc Thực học - Thực trả.
          </p>
        </div>

        {/* Streamlined Top Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateClassOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo Lớp Mới</span>
          </button>
          <button
            onClick={() => setIsAddStudentOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm Học Viên</span>
          </button>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-soft">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-brand-primary shadow-sm">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">
            Chào mừng Huấn luyện viên mới!
          </h2>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Tài khoản của bạn đã được kích hoạt thành công và hoàn toàn sạch sẽ, không có bất kỳ dữ liệu mẫu hay học sinh ảo nào. Hãy bắt đầu bằng cách tạo lớp học đầu tiên của bạn để quản lý học sinh và cơ sở.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateClassOpen(true)}
            className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3 text-xs font-bold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-primary-hover active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo Lớp Học Đầu Tiên</span>
          </button>
        </div>
      ) : (
        <>
          {/* Class Selector Carousel Cards */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
            {classes.map((cls) => {
              const isSelected = cls.id === selectedClass?.id;
              const branch = dataStore.branches.find((b) => b.id === cls.branchId);
              const studentCount = dataStore.students.filter((s) => s.classIds.includes(cls.id)).length;

              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 min-w-[240px] sm:min-w-0 flex-shrink-0 sm:flex-shrink ${
                    isSelected
                      ? "bg-white shadow-card ring-2 ring-brand-primary border border-brand-primary/30"
                      : "bg-white/80 shadow-soft hover:bg-white border border-slate-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                        cls.level === "Đội tuyển"
                          ? "bg-purple-100 text-purple-700"
                          : cls.level === "Nâng cao"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {cls.level}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {studentCount} Học viên
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-sm font-bold text-slate-900 line-clamp-1">
                    {cls.name}
                  </h3>

                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{branch?.name || "Cơ sở Hà Nội"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{cls.schedule}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-brand-primary">
                      <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{formatCurrencyVND(cls.feePerSession)} / buổi</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-bold text-brand-primary">
                      <span>Đang xem chi tiết</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

      {/* Selected Class Action Header */}
      {selectedClass && (
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:p-5 shadow-soft border border-slate-200/80 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-brand-primary text-white font-black text-xl shadow-md shadow-brand-primary/20 flex-shrink-0">
              ♞
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{selectedClass.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                  {selectedClass.level}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {branchInfo?.name} • {selectedClass.schedule} • Đơn giá:{" "}
                <span className="font-bold text-slate-800">
                  {formatCurrencyVND(selectedClass.feePerSession)}/buổi
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              onClick={openEditClassModal}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5 text-brand-primary" />
              <span>Sửa Thông Tin Lớp</span>
            </button>

            <Link
              href={`/coach/attendance?classId=${selectedClass.id}`}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              <Calendar className="h-4 w-4" />
              <span>Điểm Danh</span>
            </Link>

            <Link
              href={`/coach/invoices?classId=${selectedClass.id}`}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-secondary px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-secondary-hover"
            >
              <DollarSign className="h-4 w-4" />
              <span>Tổng Kết Học Phí</span>
            </Link>
          </div>
        </div>
      )}

      {/* Student List in Selected Class */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80 overflow-hidden">
        {/* Table Top Controls & Tips */}
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Danh Sách Học Viên ({classStudents.length})
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  Lớp {selectedClass?.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhấp chuột phải vào bất kỳ học viên nào để mở menu thao tác nhanh. Nhấp đúp vào dòng để sửa trực tiếp.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, SĐT phụ huynh..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Tip Banner */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50/70 p-2.5 text-[11px] font-medium text-emerald-900 border border-emerald-200/60">
            <Sparkles className="h-4 w-4 text-brand-primary flex-shrink-0" />
            <span>
              <strong>Thao tác tinh gọn:</strong> Click vào ảnh đại diện để xem Hồ sơ & tải ảnh mới. Nhấp chuột phải (hoặc bấm nút ···) để mở menu thao tác mà không cần nhiều nút bấm rườm rà.
            </span>
          </div>
        </div>

        {/* Mobile Student Cards List (< sm) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {classStudents.map((std, idx) => {
            const avatarUrl = std.avatar || getStudentAvatarUrl(std.avatar, std.fullName, idx);
            const isEditing = inlineEditingId === std.id;

            if (isEditing) {
              return (
                <div key={std.id} className="p-3.5 bg-amber-50/80 border-l-4 border-brand-primary space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800">{std.code}</span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Đang sửa</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600">Họ và tên</label>
                    <input
                      type="text"
                      value={inlineForm.fullName}
                      onChange={(e) => setInlineForm({ ...inlineForm, fullName: e.target.value })}
                      className="w-full mt-0.5 rounded-lg border border-brand-primary bg-white px-2 py-1.5 text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">Năm sinh</label>
                      <input
                        type="number"
                        value={inlineForm.birthYear}
                        onChange={(e) => setInlineForm({ ...inlineForm, birthYear: Number(e.target.value) })}
                        className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600">SĐT Phụ huynh</label>
                      <input
                        type="tel"
                        value={inlineForm.parentPhone}
                        onChange={(e) => setInlineForm({ ...inlineForm, parentPhone: e.target.value })}
                        className="w-full mt-0.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelInlineEdit}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveInlineEdit(std.id)}
                      className="px-3 py-1.5 rounded-lg bg-brand-primary text-xs font-bold text-white shadow-sm"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={std.id}
                onContextMenu={(e) => handleContextMenu(e, std)}
                onClick={() => handleOpenProfile(std)}
                className="p-3.5 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-11 w-11 flex-shrink-0">
                      <img
                        src={avatarUrl}
                        alt={std.fullName}
                        className="h-full w-full rounded-xl object-cover ring-1 ring-slate-200 shadow-sm"
                      />
                      <span className="absolute -bottom-1 -right-1 rounded bg-amber-100 px-1 text-[9px] font-black text-amber-800 border border-amber-300">
                        ★{std.eloRating}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{std.fullName}</h4>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold flex-shrink-0">
                          {std.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        PH: {std.parentName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleStartInlineEdit(std)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-brand-primary hover:text-white transition-colors"
                      title="Sửa nhanh"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleMoreButtonClick(e, std)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      title="Tùy chọn khác"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2 text-[11px]">
                  <a
                    href={`tel:${std.parentPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 font-mono font-bold text-brand-primary bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                  >
                    <Phone className="h-3 w-3" />
                    <span>{std.parentPhone}</span>
                  </a>
                  <span className="font-bold text-slate-700">
                    {formatCurrencyVND(std.customFeePerSession ?? selectedClass.feePerSession)}/buổi
                  </span>
                </div>
              </div>
            );
          })}

          {classStudents.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              Chưa có học viên nào trong lớp.
            </div>
          )}
        </div>

        {/* Desktop Table (sm and up) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã HV</th>
                <th className="px-4 py-3">Học Viên</th>
                <th className="px-4 py-3">Năm Sinh</th>
                <th className="px-4 py-3">Phụ Huynh</th>
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">Hệ Số Elo</th>
                <th className="px-4 py-3">Học Phí / Buổi</th>
                <th className="px-4 py-3">Ghi Chú HLV</th>
                <th className="px-4 py-3 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std, idx) => {
                const isEditing = inlineEditingId === std.id;
                const avatarUrl = std.avatar || getStudentAvatarUrl(std.avatar, std.fullName, idx);

                if (isEditing) {
                  /* Inline Editing Row */
                  return (
                    <tr
                      key={std.id}
                      className="bg-amber-50/60 border-2 border-brand-primary transition-all animate-fade-in"
                    >
                      <td className="px-4 py-2 font-mono font-bold text-slate-700">
                        {std.code}
                      </td>

                      {/* Name input */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          required
                          value={inlineForm.fullName}
                          onChange={(e) =>
                            setInlineForm({ ...inlineForm, fullName: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineEdit(std.id);
                            if (e.key === "Escape") handleCancelInlineEdit();
                          }}
                          placeholder="Họ và tên..."
                          className="w-full rounded-lg border border-brand-primary bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                        />
                      </td>

                      {/* Birth Year input */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={inlineForm.birthYear}
                          onChange={(e) =>
                            setInlineForm({ ...inlineForm, birthYear: Number(e.target.value) })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineEdit(std.id);
                            if (e.key === "Escape") handleCancelInlineEdit();
                          }}
                          className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:border-brand-primary focus:outline-none"
                        />
                      </td>

                      {/* Parent Name input */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inlineForm.parentName}
                          onChange={(e) =>
                            setInlineForm({ ...inlineForm, parentName: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineEdit(std.id);
                            if (e.key === "Escape") handleCancelInlineEdit();
                          }}
                          placeholder="Phụ huynh..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:border-brand-primary focus:outline-none"
                        />
                      </td>

                      {/* Parent Phone input */}
                      <td className="px-3 py-2">
                        <input
                          type="tel"
                          value={inlineForm.parentPhone}
                          onChange={(e) =>
                            setInlineForm({ ...inlineForm, parentPhone: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineEdit(std.id);
                            if (e.key === "Escape") handleCancelInlineEdit();
                          }}
                          placeholder="0912..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono focus:border-brand-primary focus:outline-none"
                        />
                      </td>

                      {/* Elo rating input */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={inlineForm.eloRating}
                          onChange={(e) =>
                            setInlineForm({ ...inlineForm, eloRating: Number(e.target.value) })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineEdit(std.id);
                            if (e.key === "Escape") handleCancelInlineEdit();
                          }}
                          className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-amber-700 focus:border-brand-primary focus:outline-none"
                        />
                      </td>

                      {/* Custom Fee input */}
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={inlineForm.customFee}
                          onChange={(e) =>
                            setInlineForm({ ...inlineForm, customFee: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineEdit(std.id);
                            if (e.key === "Escape") handleCancelInlineEdit();
                          }}
                          placeholder="Giá riêng..."
                          className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold focus:border-brand-primary focus:outline-none"
                        />
                      </td>

                      {/* Notes input */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inlineForm.notes}
                          onChange={(e) =>
                            setInlineForm({ ...inlineForm, notes: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInlineEdit(std.id);
                            if (e.key === "Escape") handleCancelInlineEdit();
                          }}
                          placeholder="Ghi chú HLV..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:border-brand-primary focus:outline-none"
                        />
                      </td>

                      {/* Action buttons on inline edit */}
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveInlineEdit(std.id)}
                            title="Lưu (Enter)"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelInlineEdit}
                            title="Hủy bỏ (Esc)"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                /* Standard Student Row */
                return (
                  <tr
                    key={std.id}
                    onContextMenu={(e) => handleContextMenu(e, std)}
                    onDoubleClick={() => handleStartInlineEdit(std)}
                    className="hover:bg-slate-50/90 transition-colors group cursor-default select-none"
                  >
                    {/* Mã học viên */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">
                      {std.code}
                    </td>

                    {/* Avatar + Họ và tên (Click to open Profile Modal) */}
                    <td className="px-4 py-3">
                      <div
                        onClick={() => handleOpenProfile(std)}
                        className="flex items-center gap-2.5 cursor-pointer group-hover:text-brand-primary"
                        title="Click để xem & chỉnh sửa hồ sơ học viên"
                      >
                        <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-slate-100 ring-1 ring-slate-200 group-hover:ring-brand-primary transition-all flex-shrink-0">
                          <img
                            src={avatarUrl}
                            alt={std.fullName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-brand-primary transition-colors">
                            {std.fullName}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {std.currentLevel}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Năm sinh & Tuổi */}
                    <td className="px-4 py-3 text-slate-600">
                      {std.birthYear} ({new Date().getFullYear() - std.birthYear} tuổi)
                    </td>

                    {/* Phụ huynh */}
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {std.parentName}
                    </td>

                    {/* Số điện thoại */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700">
                        <span>{std.parentPhone}</span>
                        <a
                          href={`tel:${std.parentPhone}`}
                          title="Gọi cho phụ huynh"
                          className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                      </div>
                    </td>

                    {/* Hệ số Elo */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-700 border border-amber-200">
                        ★ {std.eloRating}
                      </span>
                    </td>

                    {/* Học phí / Buổi */}
                    <td className="px-4 py-3">
                      {std.customFeePerSession !== undefined && std.customFeePerSession !== null ? (
                        <div>
                          <span className="font-bold text-slate-900">
                            {formatCurrencyVND(std.customFeePerSession)}
                          </span>
                          <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 border border-amber-200">
                            Giá riêng
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-medium">
                          {formatCurrencyVND(selectedClass?.feePerSession || 150000)}
                        </span>
                      )}
                    </td>

                    {/* Ghi chú */}
                    <td className="px-4 py-3 text-slate-500 italic max-w-[150px] truncate">
                      {std.notes || "—"}
                    </td>

                    {/* 1 Nút bấm tinh gọn duy nhất "..." mở Context Menu */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => handleMoreButtonClick(e, std)}
                        title="Tùy chọn khác (Chuột phải)"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {classStudents.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-700">Lớp học này chưa có học viên nào</p>
                      <p className="text-[11px] text-slate-400 mt-1">Bấm "Thêm Học Viên" ở góc trên để ghi danh học sinh thực tế vào lớp.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddStudentOpen(true)}
                        className="mt-3 flex items-center gap-1.5 rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-primary-hover shadow-sm"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Thêm Học Viên Vào Lớp</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}

      {/* Custom Context Menu on Right Click or "..." trigger */}
      <StudentContextMenu
        student={contextMenuStudent}
        position={contextMenuPos}
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        onViewProfile={handleOpenProfile}
        onStartInlineEdit={handleStartInlineEdit}
        onChangeAvatar={handleOpenProfile}
        onSetCustomFee={handleSetCustomFee}
        onRemoveFromClass={handleRemoveStudentFromClass}
      />

      {/* Student Profile Modal with Real Image Upload */}
      <StudentProfileModal
        student={profileStudent}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpdate={handleStudentUpdated}
        currentClass={selectedClass}
      />

      {/* Modal: Thêm Học Viên */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-slate-200 ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Thêm Học Viên Vào Lớp {selectedClass?.name}
              </h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Họ và tên học viên *</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="VD: Nguyễn Tuấn Anh"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Năm sinh</label>
                  <input
                    type="number"
                    value={newStudentBirthYear}
                    onChange={(e) => setNewStudentBirthYear(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Hệ số Elo khởi điểm</label>
                  <input
                    type="number"
                    value={newStudentElo}
                    onChange={(e) => setNewStudentElo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Tên phụ huynh</label>
                <input
                  type="text"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Hùng"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Số điện thoại phụ huynh *</label>
                <input
                  type="tel"
                  required
                  value={newParentPhone}
                  onChange={(e) => setNewParentPhone(e.target.value)}
                  placeholder="VD: 0912.345.678"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">
                  Đơn giá học phí riêng (để trống nếu dùng giá lớp)
                </label>
                <input
                  type="number"
                  value={newCustomFee}
                  onChange={(e) => setNewCustomFee(e.target.value)}
                  placeholder={`Mặc định: ${formatCurrencyVND(selectedClass?.feePerSession || 150000)}/buổi`}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Ghi chú của HLV</label>
                <input
                  type="text"
                  value={newStudentNotes}
                  onChange={(e) => setNewStudentNotes(e.target.value)}
                  placeholder="VD: Mới vào học, rất hào hứng..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-primary px-5 py-2 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Thêm Vào Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tạo Lớp Mới */}
      {isCreateClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-slate-200 ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Tạo Lớp Học Mới</h3>
              <button
                onClick={() => setIsCreateClassOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Tên lớp học *</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="VD: Cờ vua Cơ Bản - K09"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Trình độ</label>
                  <select
                    value={newClassLevel}
                    onChange={(e) => setNewClassLevel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  >
                    <option value="Vỡ lòng">Vỡ lòng</option>
                    <option value="Nhập môn">Nhập môn</option>
                    <option value="Nâng cao">Nâng cao</option>
                    <option value="Đội tuyển">Đội tuyển</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Cơ sở đào tạo</label>
                  <select
                    value={newClassBranch}
                    onChange={(e) => setNewClassBranch(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  >
                    {dataStore.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Lịch học</label>
                <input
                  type="text"
                  required
                  value={newClassSchedule}
                  onChange={(e) => setNewClassSchedule(e.target.value)}
                  placeholder="VD: Thứ 4 & Thứ 7 (18:00 - 19:30)"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Đơn giá học phí / 1 buổi (VNĐ)</label>
                <input
                  type="number"
                  step="10000"
                  required
                  value={newClassFee}
                  onChange={(e) => setNewClassFee(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-bold text-brand-primary"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateClassOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-primary px-5 py-2 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Tạo Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sửa Thông Tin Lớp */}
      {isEditClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-slate-200 ring-1 ring-slate-900/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Sửa Thông Tin Lớp Học</h3>
              <button
                onClick={() => setIsEditClassOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Tên lớp học *</label>
                <input
                  type="text"
                  required
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Trình độ</label>
                  <select
                    value={editClassLevel}
                    onChange={(e) => setEditClassLevel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  >
                    <option value="Vỡ lòng">Vỡ lòng</option>
                    <option value="Nhập môn">Nhập môn</option>
                    <option value="Nâng cao">Nâng cao</option>
                    <option value="Đội tuyển">Đội tuyển</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Cơ sở đào tạo</label>
                  <select
                    value={editClassBranch}
                    onChange={(e) => setEditClassBranch(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  >
                    {dataStore.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Lịch học</label>
                <input
                  type="text"
                  required
                  value={editClassSchedule}
                  onChange={(e) => setEditClassSchedule(e.target.value)}
                  placeholder="VD: Thứ 3 & Thứ 6 (18:00 - 19:30)"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Đơn giá học phí / 1 buổi (VNĐ)</label>
                <input
                  type="number"
                  step="10000"
                  required
                  value={editClassFee}
                  onChange={(e) => setEditClassFee(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-bold text-brand-primary"
                />
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDeleteClass}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 font-bold text-rose-600 hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa Lớp Này</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditClassOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-brand-primary px-5 py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                  >
                    Lưu Thay Đổi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
