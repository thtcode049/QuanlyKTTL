"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Phone,
  Sparkles,
  Award,
  GraduationCap,
  Calendar,
  MoreVertical,
  CheckCircle2,
  DollarSign,
  Camera,
  Edit2,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import {
  dataStore,
  StudentData,
  resolveCanonicalCoachId,
  getCoachClasses,
  getCoachStudents,
} from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import { getStudentAvatarUrl } from "@/lib/chess-avatars";
import { StudentProfileModal } from "@/components/student-profile-modal";
import { StudentContextMenu, ContextMenuPosition } from "@/components/student-context-menu";
import { BatchImportStudentsModal } from "@/components/batch-import-students-modal";

export default function StudentsDirectoryPage() {
  const [currentCoachId, setCurrentCoachId] = useState<string>("user-coach-1");
  const [coachClasses, setCoachClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("ALL");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  // Tải danh sách lớp và học viên của riêng HLV này (đồng bộ từ Supabase)
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

    const updateDisplay = () => {
      // Ở giao diện HLV, chỉ hiển thị lớp và học viên thuộc quyền quản lý của chính HLV
      const myClasses = getCoachClasses(coachId, coachEmail);
      setCoachClasses(myClasses);
      const myStudents = getCoachStudents(coachId, coachEmail);
      setStudents(myStudents);
    };

    updateDisplay();
    dataStore.syncWithDatabase().then(() => {
      updateDisplay();
    });
  }, []);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Profile Modal State
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Batch Import Modal State
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);

  const handleImportSuccess = (count: number) => {
    let coachId = currentCoachId;
    let coachEmail = "";
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) coachId = u.id;
        if (u.email) coachEmail = u.email;
      } catch (e) {}
    }
    const myStudents = getCoachStudents(coachId, coachEmail);
    setStudents([...myStudents]);
    showToast(`Đã nhập thành công ${count} học viên vào hệ thống!`);
  };

  // Context Menu State
  const [contextMenuStudent, setContextMenuStudent] = useState<StudentData | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const classes = coachClasses;

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parentPhone.includes(searchTerm);

    const matchClass = filterClass === "ALL" || s.classIds.includes(filterClass);
    const matchLevel =
      filterLevel === "ALL" ||
      s.classIds.some((cid) => {
        const cls = classes.find((c) => c.id === cid);
        return cls?.level === filterLevel;
      });

    return matchSearch && matchClass && matchLevel;
  });

  const handleOpenProfile = (student: StudentData) => {
    setSelectedStudent(student);
    setIsProfileOpen(true);
  };

  const handleStudentUpdated = (updated: StudentData) => {
    const myClassIds = coachClasses.map((c) => c.id);
    setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
    setSelectedStudent(updated);
    showToast(`Đã cập nhật hồ sơ học viên ${updated.fullName}!`);
  };

  const handleContextMenu = (e: React.MouseEvent, student: StudentData) => {
    e.preventDefault();
    setContextMenuStudent(student);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const handleMoreClick = (e: React.MouseEvent, student: StudentData) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenuStudent(student);
    setContextMenuPos({ x: rect.left - 180, y: rect.bottom + 4 });
    setIsContextMenuOpen(true);
  };

  const handleRemoveStudent = async (student: StudentData) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa học viên "${student.fullName}" khỏi hệ thống không?`)) {
      await dataStore.deleteStudent(student.id);
      const myClassIds = coachClasses.map((c) => c.id);
      setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
      showToast(`Đã xóa học viên ${student.fullName}!`);
    }
  };

  const handleSetCustomFee = async (student: StudentData) => {
    const current = student.customFeePerSession ?? 150000;
    const input = window.prompt(
      `Cài đặt học phí riêng (VNĐ/buổi) cho học viên "${student.fullName}":`,
      String(current)
    );
    if (input !== null) {
      const parsed = parseFloat(input.trim());
      await dataStore.updateStudentFee(student.id, isNaN(parsed) || parsed <= 0 ? null : parsed);
      const myClassIds = coachClasses.map((c) => c.id);
      setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
      showToast(`Đã cập nhật học phí học viên ${student.fullName}!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-brand-primary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Quản Lý Hồ Sơ Học Viên
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Tổng hợp toàn bộ học viên các cơ sở, ảnh hồ sơ, thông tin liên hệ và tiến độ rèn luyện cờ vua.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsBatchImportOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Nhập Hàng Loạt Từ Sheet</span>
          </button>

          <Link
            href="/coach/classes"
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <GraduationCap className="h-4 w-4 text-brand-primary" />
            <span>Quản Lý Theo Lớp Học</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl bg-white p-4 shadow-soft border border-slate-200/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên học viên, mã HV, SĐT phụ huynh..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs focus:border-brand-primary focus:bg-white focus:outline-none"
            />
          </div>

          {/* Filters & View Switcher */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand-primary focus:bg-white focus:outline-none"
            >
              <option value="ALL">Tất cả lớp học</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand-primary focus:bg-white focus:outline-none"
              >
                <option value="ALL">Tất cả trình độ</option>
                <option value="Nhập môn">Nhập môn</option>
                <option value="Cơ bản">Cơ bản</option>
                <option value="Nâng cao">Nâng cao</option>
                <option value="Đội tuyển">Đội tuyển</option>
              </select>

              {/* View Mode Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60">
                <button
                  onClick={() => setViewMode("GRID")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    viewMode === "GRID" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Thẻ Profile
                </button>
                <button
                  onClick={() => setViewMode("LIST")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    viewMode === "LIST" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Danh Sách
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Badge */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
          <span>
            Hiển thị <strong>{filteredStudents.length}</strong> / {students.length} học viên. Bấm vào bất kỳ thẻ học viên nào để xem và cập nhật ảnh đại diện. Bấm chuột phải để mở menu thao tác nhanh.
          </span>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-soft">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-brand-primary shadow-sm">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">
            Chưa có hồ sơ học viên nào
          </h2>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            Hệ thống đã tự động lọc bỏ toàn bộ dữ liệu học sinh mẫu đối với tài khoản thực của bạn. Hãy vào mục Lớp Học để tạo lớp và ghi danh học sinh thực tế.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsBatchImportOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Nhập Hàng Loạt Bằng Sheet / Excel</span>
            </button>

            <Link
              href="/coach/classes"
              className="flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-3 text-xs font-bold text-white shadow-lg shadow-brand-primary/25 hover:bg-brand-primary-hover active:scale-95 transition-all"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Đi Đến Quản Lý Lớp Học & Thêm Học Viên</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === "GRID" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredStudents.map((std, idx) => {
            const avatarUrl = std.avatar || getStudentAvatarUrl(std.avatar, std.fullName, idx);
            const studentClass = classes.find((c) => std.classIds.includes(c.id));
            const age = std.birthYear ? new Date().getFullYear() - std.birthYear : null;

            return (
              <div
                key={std.id}
                onContextMenu={(e) => handleContextMenu(e, std)}
                onClick={() => handleOpenProfile(std)}
                className="group relative cursor-pointer rounded-2xl bg-white p-4 shadow-soft border border-slate-200/80 hover:shadow-card hover:border-brand-primary/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Code & Action Button */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {std.code}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleMoreClick(e, std)}
                      title="Tùy chọn khác (Chuột phải)"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Avatar & Basic Info */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-slate-50 p-0.5 ring-2 ring-slate-100 group-hover:ring-brand-primary transition-all flex-shrink-0 shadow-sm">
                      <img
                        src={avatarUrl}
                        alt={std.fullName}
                        className="h-full w-full object-cover rounded-xl"
                      />
                    </div>

                    <div className="overflow-hidden">
                      <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-brand-primary transition-colors truncate">
                        {std.fullName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {std.birthYear ? `${std.birthYear} (${age} tuổi)` : "Năm sinh: —"} • {std.gender || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Level & Class Info */}
                  <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Trình độ lớp:</span>
                      <span className="font-bold text-emerald-700 text-[11px]">
                        {classes.find((c) => std.classIds.includes(c.id))?.level || "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Lớp:</span>
                      <div className="text-right max-w-[160px] truncate">
                        {classes.filter((c) => std.classIds.includes(c.id)).length > 1 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-brand-primary text-[11px]">
                            <span className="rounded bg-brand-primary/10 px-1 py-0.2 text-[10px]">
                              {classes.filter((c) => std.classIds.includes(c.id)).length} lớp
                            </span>
                            <span className="truncate">
                              {classes
                                .filter((c) => std.classIds.includes(c.id))
                                .map((c) => c.name.split("-")[0]?.trim() || c.name)
                                .join(", ")}
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-700 text-[11px] truncate">
                            {classes.find((c) => std.classIds.includes(c.id))?.name || "Chưa xếp lớp"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2">
                  <a
                    href={`tel:${std.parentPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 font-mono text-[11px] font-bold text-brand-primary hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    <span>{std.parentPhone}</span>
                  </a>

                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-brand-primary transition-colors">
                    Xem hồ sơ ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List / Table View */}
      {viewMode === "LIST" && (
        <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã HV</th>
                  <th className="px-4 py-3">Học Viên</th>
                  <th className="px-4 py-3">Năm Sinh</th>
                  <th className="px-4 py-3">Lớp Học (Trình Độ)</th>
                  <th className="px-4 py-3">Số Điện Thoại</th>
                  <th className="px-4 py-3 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((std, idx) => {
                  const avatarUrl = std.avatar || getStudentAvatarUrl(std.avatar, std.fullName, idx);
                  const studentClass = classes.find((c) => std.classIds.includes(c.id));

                  return (
                    <tr
                      key={std.id}
                      onContextMenu={(e) => handleContextMenu(e, std)}
                      onClick={() => handleOpenProfile(std)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        {std.code}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={avatarUrl}
                            alt={std.fullName}
                            className="h-8 w-8 rounded-xl object-cover ring-1 ring-slate-200 group-hover:ring-brand-primary transition-all flex-shrink-0"
                          />
                          <span className="font-bold text-slate-900 group-hover:text-brand-primary transition-colors">
                            {std.fullName}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {std.birthYear
                          ? `${std.birthYear} (${new Date().getFullYear() - std.birthYear}t)`
                          : "—"}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        {classes.filter((c) => std.classIds.includes(c.id)).length > 1 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="rounded bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-primary">
                              {classes.filter((c) => std.classIds.includes(c.id)).length} lớp
                            </span>
                            <span className="text-slate-700 text-xs truncate max-w-[180px]">
                              {classes
                                .filter((c) => std.classIds.includes(c.id))
                                .map((c) => `${c.name.split("-")[0]?.trim() || c.name} (${c.level})`)
                                .join(", ")}
                            </span>
                          </div>
                        ) : studentClass ? (
                          <span>
                            {studentClass.name}{" "}
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 ml-1">
                              {studentClass.level}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Chưa xếp lớp</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-700">
                        {std.parentPhone}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleMoreClick(e, std)}
                          title="Tùy chọn khác (Chuột phải)"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )}

      {/* Context Menu on Right Click */}
      <StudentContextMenu
        student={contextMenuStudent}
        position={contextMenuPos}
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        onViewProfile={handleOpenProfile}
        onStartInlineEdit={handleOpenProfile}
        onChangeAvatar={handleOpenProfile}
        onSetCustomFee={handleSetCustomFee}
        onRemoveFromClass={handleRemoveStudent}
      />

      {/* Profile Modal */}
      <StudentProfileModal
        student={selectedStudent}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpdate={handleStudentUpdated}
      />

      {/* Batch Import From Sheet Modal */}
      <BatchImportStudentsModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        availableClasses={coachClasses}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
