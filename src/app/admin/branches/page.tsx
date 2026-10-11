"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  BookOpen,
  Users,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  Search,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  dataStore,
  BranchData,
  ClassroomData,
  UserData,
} from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function AdminBranchesAndClassesPage() {
  // Chuẩn hóa dữ liệu HLV ban đầu
  useEffect(() => {
    dataStore.normalizeCoachData();
  }, []);

  const [branches, setBranches] = useState<BranchData[]>(dataStore.branches);
  const [classes, setClasses] = useState<ClassroomData[]>(dataStore.classes);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all"); // "all" hoặc id cơ sở
  const [searchTerm, setSearchTerm] = useState("");

  // Modal Cơ sở
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  const [editingBranch, setEditingBranch] = useState<BranchData | null>(null);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchPhone, setEditBranchPhone] = useState("");

  // Modal Lớp Học
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("Vỡ lòng");
  const [newClassBranchId, setNewClassBranchId] = useState("branch-1");
  const [newClassCoachId, setNewClassCoachId] = useState("user-coach-1");
  const [newClassSchedule, setNewClassSchedule] = useState("Thứ 3 & Thứ 6 (18:00 - 19:30)");
  const [newClassFee, setNewClassFee] = useState("150000");

  // Modal Sửa Toàn Bộ Thông Tin Lớp Học
  const [editingClass, setEditingClass] = useState<ClassroomData | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassLevel, setEditClassLevel] = useState("");
  const [editClassBranchId, setEditClassBranchId] = useState("");
  const [editClassCoachId, setEditClassCoachId] = useState("");
  const [editClassSchedule, setEditClassSchedule] = useState("");
  const [editClassFee, setEditClassFee] = useState("");
  const [editClassIsActive, setEditClassIsActive] = useState(true);

  // Danh sách HLV phục vụ chọn HLV
  const coachList = dataStore.users.filter((u) => u.role === "COACH");

  // Lọc lớp theo cơ sở được chọn và từ khóa tìm kiếm
  const filteredClasses = classes.filter((cls) => {
    const matchBranch = selectedBranchId === "all" || cls.branchId === selectedBranchId;
    const matchSearch =
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.schedule.toLowerCase().includes(searchTerm.toLowerCase());
    return matchBranch && matchSearch;
  });

  // Cơ sở đang được chọn
  const activeBranch = branches.find((b) => b.id === selectedBranchId);

  // Xử lý tạo cơ sở mới
  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchAddress) return;

    const newBranch: BranchData = {
      id: `branch-${Date.now()}`,
      name: branchName,
      address: branchAddress,
      phone: branchPhone || "0988.123.456",
    };

    dataStore.branches.push(newBranch);
    setBranches([...dataStore.branches]);
    setIsBranchModalOpen(false);
    setBranchName("");
    setBranchAddress("");
    setBranchPhone("");
  };

  // Xử lý sửa cơ sở
  const handleUpdateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    dataStore.updateBranch(editingBranch.id, {
      name: editBranchName,
      address: editBranchAddress,
      phone: editBranchPhone,
    });

    setBranches([...dataStore.branches]);
    setEditingBranch(null);
  };

  // Mở modal sửa cơ sở
  const openEditBranchModal = (b: BranchData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBranch(b);
    setEditBranchName(b.name);
    setEditBranchAddress(b.address);
    setEditBranchPhone(b.phone);
  };

  // Mở modal sửa toàn bộ thông tin lớp học
  const openEditClassModal = (cls: ClassroomData) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassLevel(cls.level);
    setEditClassBranchId(cls.branchId);
    setEditClassCoachId(cls.coachId);
    setEditClassSchedule(cls.schedule);
    setEditClassFee(cls.feePerSession.toString());
    setEditClassIsActive(cls.isActive !== false);
  };

  // Xử lý sửa toàn bộ thông tin lớp học
  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    dataStore.updateClass(editingClass.id, {
      name: editClassName,
      level: editClassLevel,
      branchId: editClassBranchId,
      coachId: editClassCoachId,
      schedule: editClassSchedule,
      feePerSession: parseFloat(editClassFee) || 150000,
      isActive: editClassIsActive,
    });

    setClasses([...dataStore.classes]);
    setEditingClass(null);
  };

  // Xử lý tạo lớp mới
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    const newCls: ClassroomData = {
      id: `class-${Date.now()}`,
      name: newClassName,
      level: newClassLevel,
      feePerSession: parseFloat(newClassFee) || 150000,
      schedule: newClassSchedule,
      branchId: selectedBranchId !== "all" ? selectedBranchId : newClassBranchId,
      coachId: newClassCoachId,
      isActive: true,
    };

    dataStore.classes.push(newCls);
    dataStore.recalculateAllInvoices(10, 2026);
    setClasses([...dataStore.classes]);
    setIsCreateClassOpen(false);

    setNewClassName("");
    setNewClassLevel("Vỡ lòng");
    setNewClassSchedule("Thứ 3 & Thứ 6 (18:00 - 19:30)");
    setNewClassFee("150000");
  };

  return (
    <div className="space-y-7">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Cơ Sở Đào Tạo & Lớp Học
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Bấm chọn từng cơ sở để xem toàn bộ danh sách lớp học và chỉnh sửa thông tin chi tiết.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBranchModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm Cơ Sở</span>
          </button>
          <button
            onClick={() => {
              if (selectedBranchId !== "all") {
                setNewClassBranchId(selectedBranchId);
              }
              setIsCreateClassOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm Lớp Mới</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: BẤM VÀO CƠ SỞ ĐỂ XEM LỚP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-primary" />
            <span>Hệ Thống Cơ Sở (Bấm để xem các lớp tại cơ sở đó)</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng: <strong>{branches.length} cơ sở</strong>
          </span>
        </div>

        {/* Grid Chọn Cơ Sở */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card: Tất Cả Cơ Sở */}
          <div
            onClick={() => setSelectedBranchId("all")}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border text-left ${
              selectedBranchId === "all"
                ? "bg-brand-primary text-white shadow-card ring-2 ring-brand-primary border-brand-primary"
                : "bg-white text-slate-800 shadow-soft hover:border-brand-primary/50 border-slate-200/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-lg ${
                selectedBranchId === "all" ? "bg-white/20 text-white" : "bg-brand-primary/10 text-brand-primary"
              }`}>
                <Layers className="h-5 w-5" />
              </span>
              {selectedBranchId === "all" && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                  Đang xem
                </span>
              )}
            </div>
            <h3 className="mt-3 text-sm font-bold line-clamp-1">Tất Cả Cơ Sở</h3>
            <p className={`mt-0.5 text-[11px] ${selectedBranchId === "all" ? "text-emerald-100" : "text-slate-400"}`}>
              Toàn hệ thống CLB
            </p>
            <div className={`mt-3 pt-2 border-t flex justify-between text-xs font-semibold ${
              selectedBranchId === "all" ? "border-white/20 text-emerald-100" : "border-slate-100 text-slate-600"
            }`}>
              <span>{classes.length} lớp học</span>
              <span>{dataStore.students.length} học viên</span>
            </div>
          </div>

          {/* Cards: Từng Cơ Sở Cụ Thể */}
          {branches.map((b) => {
            const isSelected = selectedBranchId === b.id;
            const branchClasses = classes.filter((c) => c.branchId === b.id);
            const branchClassIds = branchClasses.map((c) => c.id);
            const studentCount = dataStore.students.filter((s) =>
              s.classIds.some((cid) => branchClassIds.includes(cid))
            ).length;

            return (
              <div
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`group cursor-pointer rounded-2xl p-4 transition-all duration-200 border text-left relative ${
                  isSelected
                    ? "bg-white shadow-card ring-2 ring-brand-primary border-brand-primary"
                    : "bg-white shadow-soft hover:shadow-md hover:border-slate-300 border-slate-200/80"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-lg ${
                    isSelected ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700 group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
                  }`}>
                    <Building2 className="h-5 w-5" />
                  </span>

                  <button
                    onClick={(e) => openEditBranchModal(b, e)}
                    title="Sửa cơ sở"
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2.5">
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{b.name}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                    <span>{b.address}</span>
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="font-bold text-slate-800">{branchClasses.length} lớp</span>
                  <span className="text-brand-primary font-bold">{studentCount} HS</span>
                </div>

                {isSelected && (
                  <div className="mt-2 text-center text-[10px] font-bold text-brand-primary bg-emerald-50 rounded-md py-0.5">
                    ✓ Đang chọn cơ sở này
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: DANH SÁCH TOÀN BỘ LỚP TẠI CƠ SỞ ĐƯỢC CHỌN */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200/80 pt-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-brand-primary" />
              <span>
                {selectedBranchId === "all"
                  ? "Tất Cả Lớp Học Trong Toàn Hệ Thống"
                  : `Danh Sách Lớp Tại: ${activeBranch?.name}`}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                {filteredClasses.length} lớp
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {selectedBranchId === "all"
                ? "Bấm vào bất kỳ cơ sở nào ở trên để lọc riêng các lớp của cơ sở đó."
                : `Địa chỉ: ${activeBranch?.address} • Hotline: ${activeBranch?.phone}`}
            </p>
          </div>

          {/* Ô Tìm Kiếm Lớp */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên lớp, cấp độ, lịch học..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-brand-primary focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Lưới Thẻ Lớp Học */}
        {filteredClasses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-700">Chưa có lớp học nào phù hợp</p>
            <p className="mt-1 text-xs text-slate-400">
              Cơ sở này hiện chưa có lớp nào hoặc không khớp từ khóa tìm kiếm.
            </p>
            <button
              onClick={() => {
                if (selectedBranchId !== "all") {
                  setNewClassBranchId(selectedBranchId);
                }
                setIsCreateClassOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm lớp mới ngay</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {filteredClasses.map((cls) => {
              const branch = branches.find((b) => b.id === cls.branchId);
              const coach = dataStore.users.find((u) => u.id === cls.coachId);
              const students = dataStore.students.filter((s) => s.classIds.includes(cls.id));
              const sessions = dataStore.sessions.filter((s) => s.classId === cls.id);

              return (
                <div
                  key={cls.id}
                  className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200/80 transition-all hover:shadow-card flex flex-col justify-between"
                >
                  <div>
                    {/* Header Thẻ Lớp */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={`inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold ${
                            cls.level === "Đội tuyển"
                              ? "bg-purple-100 text-purple-800"
                              : cls.level === "Nâng cao"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {cls.level}
                        </span>
                        <h3 className="mt-2 text-lg font-black text-slate-900">{cls.name}</h3>
                      </div>

                      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        <span>{students.length} học viên</span>
                      </span>
                    </div>

                    {/* Chi Tiết Lớp Học */}
                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-800">{branch?.name}</span>
                        <span className="text-slate-400 truncate">({branch?.address})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>{cls.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold text-brand-primary">
                        <DollarSign className="h-4 w-4 text-brand-primary flex-shrink-0" />
                        <span>Học phí: {formatCurrencyVND(cls.feePerSession)} / buổi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        <span>
                          HLV Phụ Trách: <strong className="text-slate-900">{coach?.name || "Chưa phân công"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Số Buổi Đã Diễn Ra */}
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100 flex items-center justify-between">
                      <span>
                        Số buổi đã diễn ra tháng 10: <strong>{sessions.length} buổi</strong>
                      </span>
                      <span className="text-[11px] font-semibold text-brand-primary">
                        {cls.isActive !== false ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </div>
                  </div>

                  {/* CÁC NÚT HÀNH ĐỘNG: SỬA TOÀN BỘ THÔNG TIN THAY VÌ CHỈ SỬA ĐIỂM DANH */}
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-3">
                    {/* Nút Sửa Toàn Bộ Thông Tin Lớp Học */}
                    <button
                      onClick={() => openEditClassModal(cls)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-primary/40 bg-emerald-50/60 py-2.5 text-xs font-bold text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Sửa Thông Tin Lớp Học</span>
                    </button>

                    {/* Các Nút Điểm Danh & Học Phí */}
                    <div className="flex gap-2">
                      <Link
                        href={`/coach/attendance?classId=${cls.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Xem / Sửa Điểm Danh</span>
                      </Link>
                      <Link
                        href={`/coach/invoices?classId=${cls.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-primary py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover transition-colors"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Xem Học Phí</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL SỬA TOÀN BỘ THÔNG TIN LỚP HỌC */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Sửa Toàn Bộ Thông Tin Lớp Học
                </h3>
                <p className="text-xs text-slate-500">Mã lớp: {editingClass.id}</p>
              </div>
              <button
                onClick={() => setEditingClass(null)}
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
                  <label className="font-bold text-slate-700">Cơ sở đào tạo *</label>
                  <select
                    value={editClassBranchId}
                    onChange={(e) => setEditClassBranchId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">HLV Phụ Trách *</label>
                  <select
                    value={editClassCoachId}
                    onChange={(e) => setEditClassCoachId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  >
                    {coachList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.title || "HLV"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Học phí / Buổi (VNĐ) *</label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={editClassFee}
                    onChange={(e) => setEditClassFee(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-bold text-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Lịch học chi tiết *</label>
                <input
                  type="text"
                  required
                  value={editClassSchedule}
                  onChange={(e) => setEditClassSchedule(e.target.value)}
                  placeholder="VD: Thứ 3 & Thứ 6 (18:00 - 19:30)"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="classActive"
                  checked={editClassIsActive}
                  onChange={(e) => setEditClassIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="classActive" className="font-semibold text-slate-700 cursor-pointer">
                  Lớp đang hoạt động giảng dạy bình thường
                </label>
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-primary py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Lưu Thay Đổi Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM LỚP MỚI */}
      {isCreateClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Thêm Lớp Học Mới</h3>
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
                  placeholder="VD: Cờ vua Cơ Bản - K05"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Trình độ *</label>
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
                  <label className="font-bold text-slate-700">Cơ sở đào tạo *</label>
                  <select
                    value={newClassBranchId}
                    onChange={(e) => setNewClassBranchId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">HLV Phụ Trách *</label>
                  <select
                    value={newClassCoachId}
                    onChange={(e) => setNewClassCoachId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  >
                    {coachList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.title || "HLV"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Học phí / Buổi (VNĐ) *</label>
                  <input
                    type="number"
                    step="10000"
                    required
                    value={newClassFee}
                    onChange={(e) => setNewClassFee(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-bold text-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Lịch học chi tiết *</label>
                <input
                  type="text"
                  required
                  value={newClassSchedule}
                  onChange={(e) => setNewClassSchedule(e.target.value)}
                  placeholder="VD: Thứ 3 & Thứ 6 (18:00 - 19:30)"
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
                  Tạo Lớp Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỬA CƠ SỞ */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Sửa Cơ Sở Đào Tạo</h3>
              <button
                onClick={() => setEditingBranch(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Tên cơ sở *</label>
                <input
                  type="text"
                  required
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Địa chỉ cụ thể *</label>
                <input
                  type="text"
                  required
                  value={editBranchAddress}
                  onChange={(e) => setEditBranchAddress(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Số điện thoại hotline</label>
                <input
                  type="tel"
                  value={editBranchPhone}
                  onChange={(e) => setEditBranchPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
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

      {/* MODAL THÊM CƠ SỞ */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Thêm Cơ Sở Đào Tạo</h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Tên cơ sở *</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="VD: Cơ sở 5 - Hà Đông"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Địa chỉ cụ thể *</label>
                <input
                  type="text"
                  required
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="VD: Số 12 Nguyễn Trãi, Hà Đông, Hà Nội"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Số điện thoại hotline</label>
                <input
                  type="tel"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="0988.123.456"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-primary py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Tạo Cơ Sở
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
