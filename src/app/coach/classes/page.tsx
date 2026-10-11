"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { dataStore, ClassroomData, StudentData } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function CoachClassesPage() {
  const [classes, setClasses] = useState<ClassroomData[]>(dataStore.classes);
  const [students, setStudents] = useState<StudentData[]>(dataStore.students);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const [searchTerm, setSearchTerm] = useState("");

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

    dataStore.students.push(newStudent);
    dataStore.recalculateAllInvoices(10, 2026);
    setStudents([...dataStore.students]);
    setIsAddStudentOpen(false);

    // Reset form
    setNewStudentName("");
    setNewParentName("");
    setNewParentPhone("");
    setNewStudentNotes("");
    setNewCustomFee("");
  };

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
      coachId: "user-coach-1",
      isActive: true,
    };

    dataStore.classes.push(newCls);
    setClasses([...dataStore.classes]);
    setSelectedClassId(newCls.id);
    setIsCreateClassOpen(false);
    setNewClassName("");
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

    setClasses([...dataStore.classes]);
    setIsEditClassOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Lớp Học Của Tôi
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý thông tin học viên, lịch học và đơn giá theo nguyên tắc Thực học - Thực trả.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateClassOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo Lớp Mới</span>
          </button>
          <button
            onClick={() => setIsAddStudentOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm Học Viên</span>
          </button>
        </div>
      </div>

      {/* Class Selector Carousel Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {classes.map((cls) => {
          const isSelected = cls.id === selectedClass?.id;
          const branch = dataStore.branches.find((b) => b.id === cls.branchId);
          const studentCount = dataStore.students.filter((s) => s.classIds.includes(cls.id)).length;

          return (
            <div
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 ${
                isSelected
                  ? "bg-white shadow-card ring-2 ring-brand-primary border border-brand-primary/30"
                  : "bg-white/80 shadow-soft hover:bg-white border border-slate-200/80"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                  cls.level === "Đội tuyển"
                    ? "bg-purple-100 text-purple-700"
                    : cls.level === "Nâng cao"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-emerald-100 text-emerald-800"
                }`}>
                  {cls.level}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {studentCount} Học viên
                </span>
              </div>

              <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-1">
                {cls.name}
              </h3>

              <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{branch?.name || "Cơ sở Hà Nội"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{cls.schedule}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-brand-primary">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{formatCurrencyVND(cls.feePerSession)} / buổi</span>
                </div>
              </div>

              {isSelected && (
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-bold text-brand-primary">
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
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft border border-slate-200/80 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary text-white font-black text-xl shadow-md shadow-brand-primary/20">
              ♞
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{selectedClass.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                  {selectedClass.level}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {branchInfo?.name} • {selectedClass.schedule} • Đơn giá: {formatCurrencyVND(selectedClass.feePerSession)}/buổi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openEditClassModal}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="h-4 w-4 text-brand-primary" />
              <span>Sửa Thông Tin Lớp</span>
            </button>

            <Link
              href={`/coach/attendance?classId=${selectedClass.id}`}
              className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              <Calendar className="h-4 w-4" />
              <span>Điểm Danh Buổi Mới</span>
            </Link>

            <Link
              href={`/coach/invoices?classId=${selectedClass.id}`}
              className="flex items-center gap-1.5 rounded-xl bg-brand-secondary px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-secondary-hover"
            >
              <DollarSign className="h-4 w-4" />
              <span>Tổng Kết Học Phí</span>
            </Link>
          </div>
        </div>
      )}

      {/* Student List in Selected Class */}
      <div className="rounded-2xl bg-white shadow-soft border border-slate-200/80">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Danh Sách Học Viên ({classStudents.length})
            </h3>
            <p className="text-xs text-slate-500">
              Học viên thuộc lớp {selectedClass?.name}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
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

        {/* Students Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã HV</th>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3">Năm Sinh</th>
                <th className="px-4 py-3">Phụ Huynh</th>
                <th className="px-4 py-3">Số Điện Thoại</th>
                <th className="px-4 py-3">Hệ Số Elo</th>
                <th className="px-4 py-3">Học Phí / Buổi</th>
                <th className="px-4 py-3">Ghi Chú HLV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std) => (
                <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-700">
                    {std.code}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {std.fullName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {std.birthYear} ({new Date().getFullYear() - std.birthYear} tuổi)
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {std.parentName}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {std.parentPhone}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-700 border border-amber-200">
                      ★ {std.eloRating}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {std.customFeePerSession !== undefined && std.customFeePerSession !== null ? (
                      <div>
                        <span className="font-bold text-slate-900">{formatCurrencyVND(std.customFeePerSession)}</span>
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
                  <td className="px-4 py-3 text-slate-500 italic">
                    {std.notes || "—"}
                  </td>
                </tr>
              ))}
              {classStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy học viên nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Thêm Học Viên */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
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
                <label className="font-bold text-slate-700">Họ tên Phụ huynh</label>
                <input
                  type="text"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Toàn"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">
                  Học phí riêng (VNĐ/buổi)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={newCustomFee}
                  onChange={(e) => setNewCustomFee(e.target.value)}
                  placeholder={`Để trống nếu áp dụng giá lớp (${formatCurrencyVND(selectedClass?.feePerSession || 150000)}/buổi)`}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Số điện thoại Phụ huynh (Nhận Zalo) *</label>
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
                <label className="font-bold text-slate-700">Ghi chú đặc điểm cờ vua</label>
                <textarea
                  rows={2}
                  value={newStudentNotes}
                  onChange={(e) => setNewStudentNotes(e.target.value)}
                  placeholder="VD: Đã biết chơi cơ bản, thích giải cờ thế..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-primary py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Lưu Học Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tạo Lớp Mới */}
      {isCreateClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
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
                  placeholder="VD: Cờ vua Khám Phá - K03"
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
                  <label className="font-bold text-slate-700">Cơ sở</label>
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
                  value={newClassSchedule}
                  onChange={(e) => setNewClassSchedule(e.target.value)}
                  placeholder="VD: Thứ 3 & Thứ 6 (18:00 - 19:30)"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Đơn giá học phí / 1 buổi (VNĐ)</label>
                <input
                  type="number"
                  value={newClassFee}
                  onChange={(e) => setNewClassFee(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateClassOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-primary py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Tạo Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa Toàn Bộ Thông Tin Lớp Học */}
      {isEditClassOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Sửa Thông Tin Lớp: {selectedClass.name}
              </h3>
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
                  <label className="font-bold text-slate-700">Trình độ / Cấp độ *</label>
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
                  <label className="font-bold text-slate-700">Cơ sở</label>
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

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditClassOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-primary py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
