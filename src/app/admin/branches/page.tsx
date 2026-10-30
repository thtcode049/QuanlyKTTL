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
  resolveCanonicalCoachId,
} from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function AdminBranchesAndClassesPage() {
  const [branches, setBranches] = useState<BranchData[]>(dataStore.branches);
  const [classes, setClasses] = useState<ClassroomData[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all"); // "all" hoặc id cơ sở
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Chuẩn hóa dữ liệu HLV và 8 cơ sở ban đầu, đồng bộ Supabase
  useEffect(() => {
    dataStore.normalizeCoachData();

    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const canonicalId = resolveCanonicalCoachId(u.id || u.email);
        const dbUser = dataStore.users.find(
          (x) => x.id === u.id || x.id === canonicalId || (u.email && x.email.toLowerCase() === u.email.toLowerCase())
        );
        const merged = dbUser ? { ...u, ...dbUser } : u;
        setCurrentUser(merged);
        if (merged.systemRole === "CHUCOSO") {
          const mIds = merged.managedBranchIds?.length ? merged.managedBranchIds : (merged.branchId ? [merged.branchId] : []);
          if (mIds.length > 0) {
            setSelectedBranchId(mIds[0]);
          }
        }
      } catch (e) {}
    }

    const updateDisplay = () => {
      setBranches([...dataStore.branches]);
      setClasses(dataStore.classes.filter((c) => c.shareWithAdmin !== false));
    };
    updateDisplay();
    dataStore.syncWithDatabase().then(() => updateDisplay());
  }, []);

  const isBranchManager = currentUser?.systemRole === "CHUCOSO";
  const userManagedBranchIds: string[] = isBranchManager
    ? (currentUser?.managedBranchIds?.length ? currentUser.managedBranchIds : (currentUser?.branchId ? [currentUser.branchId] : []))
    : [];

  // Modal Cơ sở
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  const [editingBranch, setEditingBranch] = useState<BranchData | null>(null);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchPhone, setEditBranchPhone] = useState("");

  // Danh sách HLV phục vụ chọn HLV
  const coachList = dataStore.users.filter((u) => u.role === "COACH");

  // Lọc lớp theo cơ sở được chọn và từ khóa tìm kiếm (Chủ cơ sở chỉ quản lý các lớp tại cơ sở của mình)
  const filteredClasses = classes.filter((cls) => {
    if (isBranchManager && !userManagedBranchIds.includes(cls.branchId)) return false;
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

  // Xử lý xóa cơ sở
  const handleDeleteBranch = (branchId: string, branchName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${branchName}" không?`)) {
      dataStore.deleteBranch(branchId);
      setBranches([...dataStore.branches]);
      if (selectedBranchId === branchId) {
        setSelectedBranchId("all");
      }
      if (editingBranch?.id === branchId) {
        setEditingBranch(null);
      }
    }
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

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isBranchManager && (
            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 text-center cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm Cơ Sở</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: BẤM VÀO CƠ SỞ ĐỂ XEM LỚP */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-primary" />
            <span>{isBranchManager ? "Cơ Sở Của Bạn (Đã Phân Quyền)" : "Hệ Thống Cơ Sở (Vuốt/Bấm để lọc)"}</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {isBranchManager ? "Phạm vi: Cơ sở được gán" : `Tổng cộng: ${branches.length} cơ sở`}
          </span>
        </div>

        {/* Grid Chọn Cơ Sở: vuốt ngang trên mobile, grid trên desktop */}
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x">
          {/* Card: Tất Cả Cơ Sở (Chỉ hiển thị cho Chủ nhiệm / Phó chủ nhiệm) */}
          {!isBranchManager && (
            <div
              onClick={() => setSelectedBranchId("all")}
              className={`min-w-[190px] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink cursor-pointer rounded p-3.5 transition-all duration-200 border text-left ${
                selectedBranchId === "all"
                  ? "bg-brand-primary text-white ring-1 ring-brand-primary border-brand-primary"
                  : "bg-white text-slate-800 hover:border-slate-300 border-slate-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded font-bold text-base ${
                  selectedBranchId === "all" ? "bg-white/20 text-white" : "bg-brand-primary/10 text-brand-primary"
                }`}>
                  <Layers className="h-4 w-4" />
                </span>
                {selectedBranchId === "all" && (
                  <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
                    Đang xem
                  </span>
                )}
              </div>
              <h3 className="mt-2.5 text-xs font-bold line-clamp-1">Tất Cả Cơ Sở</h3>
              <p className={`mt-0.5 text-[11px] ${selectedBranchId === "all" ? "text-emerald-100" : "text-slate-400"}`}>
                Toàn hệ thống CLB
              </p>
              <div className={`mt-2.5 pt-2 border-t flex justify-between text-[11px] font-semibold ${
                selectedBranchId === "all" ? "border-white/20 text-emerald-100" : "border-slate-100 text-slate-600"
              }`}>
                <span>{classes.length} lớp học</span>
                <span>{dataStore.students.length} học viên</span>
              </div>
            </div>
          )}

          {/* Cards: Từng Cơ Sở Cụ Thể */}
          {branches.map((b) => {
            if (isBranchManager && !userManagedBranchIds.includes(b.id)) return null;
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
                className={`min-w-[210px] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink group cursor-pointer rounded p-3.5 transition-all duration-200 border text-left relative ${
                  isSelected
                    ? "bg-white ring-1 ring-brand-primary border-brand-primary"
                    : "bg-white hover:border-slate-300 border-slate-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded font-bold text-base ${
                    isSelected ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700 group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
                  }`}>
                    <Building2 className="h-4 w-4" />
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => openEditBranchModal(b, e)}
                      title="Sửa cơ sở"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteBranch(b.id, b.name, e)}
                      title="Xóa cơ sở"
                      className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{b.name}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                    <span>{b.address}</span>
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span className="font-semibold text-slate-800">{branchClasses.length} lớp</span>
                  <span className="text-brand-primary font-bold">{studentCount} HS</span>
                </div>

                {isSelected && (
                  <div className="mt-2 text-center text-[10px] font-bold text-brand-primary bg-emerald-50 rounded py-0.5">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand-primary" />
              <span>
                {selectedBranchId === "all"
                  ? "Tất Cả Lớp Học Trong Toàn Hệ Thống"
                  : `Danh Sách Lớp Tại: ${activeBranch?.name}`}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
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
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên lớp, cấp độ, lịch học..."
              className="w-full rounded border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Lưới Thẻ Lớp Học */}
        {filteredClasses.length === 0 ? (
          <div className="rounded border border-dashed border-slate-200 bg-white p-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có lớp học nào phù hợp</p>
            <p className="mt-1 text-xs text-slate-400">
              Cơ sở này hiện chưa có lớp nào hoặc không khớp từ khóa tìm kiếm.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Lớp học do từng Huấn luyện viên trực tiếp khởi tạo và quản lý tại giao diện HLV của mình.
            </p>
            <Link
              href="/coach/classes"
              className="mt-3 inline-flex items-center gap-1.5 rounded bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-all"
            >
              <span>Chuyển sang giao diện HLV để tạo lớp</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredClasses.map((cls) => {
              const branch = branches.find((b) => b.id === cls.branchId);
              const coach = dataStore.users.find(
                (u) =>
                  u.id === cls.coachId ||
                  resolveCanonicalCoachId(u.id || u.email) === resolveCanonicalCoachId(cls.coachId)
              );
              const students = dataStore.students.filter((s) => s.classIds.includes(cls.id));
              const sessions = dataStore.sessions.filter((s) => s.classId === cls.id);

              return (
                <div
                  key={cls.id}
                  className="rounded bg-white p-4 border border-slate-100 transition-all hover:border-slate-300 flex flex-col justify-between space-y-3"
                >
                  <div>
                    {/* Header Thẻ Lớp */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                            cls.level === "Đội tuyển"
                              ? "bg-purple-100 text-purple-800"
                              : cls.level === "Nâng cao"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {cls.level}
                        </span>
                        <h3 className="mt-1 text-base font-bold text-slate-900">{cls.name}</h3>
                      </div>

                      <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        <span>{students.length} học viên</span>
                      </span>
                    </div>

                    {/* Chi Tiết Lớp Học */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-800">{branch?.name}</span>
                        <span className="text-slate-400 truncate">({branch?.address})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span>{cls.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold text-brand-primary">
                        <DollarSign className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
                        <span>Học phí: {formatCurrencyVND(cls.feePerSession)} / buổi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        <span>
                          HLV Phụ Trách: <strong className="text-slate-900">{coach?.name || "Chưa phân công"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Số Buổi Đã Diễn Ra */}
                    <div className="mt-4 rounded bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100 flex items-center justify-between">
                      <span>
                        Số buổi đã diễn ra tháng 10: <strong>{sessions.length} buổi</strong>
                      </span>
                      <span className="text-[11px] font-semibold text-brand-primary">
                        {cls.isActive !== false ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </div>
                  </div>

                  {/* THÔNG TIN HLV PHỤ TRÁCH & LIÊN KẾT HLV */}
                  <div className="mt-4 border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <Users className="h-4 w-4 text-brand-primary" />
                      <span>HLV phụ trách: <strong>{coach?.name || "Chưa phân công"}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/coach/classes?classId=${cls.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline"
                      >
                        <span>Xem ở giao diện HLV</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* MODAL SỬA CƠ SỞ */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fade-in">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl border border-slate-200">
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
                  className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Địa chỉ cụ thể *</label>
                <input
                  type="text"
                  required
                  value={editBranchAddress}
                  onChange={(e) => setEditBranchAddress(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Số điện thoại hotline</label>
                <input
                  type="tel"
                  value={editBranchPhone}
                  onChange={(e) => setEditBranchPhone(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none font-mono"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteBranch(editingBranch.id, editingBranch.name)}
                  className="rounded border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-600 hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa Cơ Sở Này</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBranch(null)}
                    className="rounded border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-brand-primary px-4 py-1.5 font-semibold text-white hover:bg-brand-primary-hover transition-colors"
                  >
                    Lưu Thay Đổi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM CƠ SỞ */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Thêm Cơ Sở Đào Tạo</h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Tên cơ sở *</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="VD: Cơ sở Hà Đông, Cơ sở Cầu Giấy..."
                  className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Địa chỉ cụ thể *</label>
                <input
                  type="text"
                  required
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="VD: Số 12 Nguyễn Trãi, Hà Đông, Hà Nội"
                  className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Số điện thoại hotline</label>
                <input
                  type="tel"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="0988.123.456"
                  className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none font-mono"
                />
              </div>

              <div className="mt-4 flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="flex-1 rounded border border-slate-200 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded bg-brand-primary py-1.5 font-semibold text-white hover:bg-brand-primary-hover transition-colors"
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
