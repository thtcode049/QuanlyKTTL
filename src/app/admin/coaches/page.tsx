"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Phone,
  Mail,
  Award,
  Building2,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Check,
  GraduationCap,
  ShieldCheck,
  Wallet,
  Settings,
  Shield,
  UserCheck,
  Coins,
} from "lucide-react";
import { dataStore, UserData, resolveCanonicalCoachId, getCoachClasses } from "@/lib/data-store";
import confetti from "canvas-confetti";

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<UserData[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sync and load
  const reloadCoaches = () => {
    dataStore.normalizeCoachData();
    setCoaches([...dataStore.users.filter((u) => u.role === "COACH" || u.role === "ADMIN")]);
  };

  useEffect(() => {
    reloadCoaches();

    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        const canonicalId = resolveCanonicalCoachId(u.id || u.email);
        const dbUser = dataStore.users.find(
          (x) => x.id === u.id || x.id === canonicalId || (u.email && x.email.toLowerCase() === u.email.toLowerCase())
        );
        setCurrentUser(dbUser ? { ...u, ...dbUser } : u);
      } catch (e) {}
    }

    // Đồng bộ danh sách HLV từ Supabase Database
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users && Array.isArray(data.users)) {
          data.users.forEach((dbUser: UserData) => {
            const idx = dataStore.users.findIndex(
              (u) =>
                u.id === dbUser.id ||
                u.email.toLowerCase() === dbUser.email.toLowerCase()
            );
            const updated = {
              ...dbUser,
              id: dbUser.id,
              hasAdminAccess: !!dbUser.hasAdminAccess,
            };

            if (idx >= 0) {
              dataStore.users[idx] = { ...dataStore.users[idx], ...updated };
            } else {
              dataStore.users.push(updated);
            }
          });
          reloadCoaches();
        }
      })
      .catch((err) => console.warn("Lỗi đồng bộ HLV từ DB:", err));
  }, []);

  // Modal Thêm HLV Mới
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("HLV Quốc gia");
  const [branchId, setBranchId] = useState("branch-1");
  const [managedBranchIds, setManagedBranchIds] = useState<string[]>(["branch-1"]);
  const [branchIds, setBranchIds] = useState<string[]>(["branch-1"]);
  const [systemRole, setSystemRole] = useState<"CHUNHIEM" | "PHOCHUNHIEM" | "CHUCOSO" | "COACH">("COACH");
  const [tuitionRate, setTuitionRate] = useState<number>(50);
  const [bookRate, setBookRate] = useState<number>(30);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Modal Sửa Toàn Bộ Thông Tin HLV & Cấu Hình Lương
  const [editingCoach, setEditingCoach] = useState<UserData | null>(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchId, setEditBranchId] = useState("branch-1");
  const [editManagedBranchIds, setEditManagedBranchIds] = useState<string[]>([]);
  const [editBranchIds, setEditBranchIds] = useState<string[]>([]);
  const [editSystemRole, setEditSystemRole] = useState<"CHUNHIEM" | "PHOCHUNHIEM" | "CHUCOSO" | "COACH">("COACH");
  const [editTuitionRate, setEditTuitionRate] = useState<number>(50);
  const [editBookRate, setEditBookRate] = useState<number>(30);
  const [editHasAdminAccess, setEditHasAdminAccess] = useState(false);

  const openEditModal = (coach: UserData) => {
    setEditingCoach(coach);
    setEditName(coach.name);
    setEditTitle(coach.title || "HLV Quốc gia");
    setEditEmail(coach.email);
    setEditPhone(coach.phone);
    setEditBranchId(coach.branchId || "branch-1");
    setEditManagedBranchIds(coach.managedBranchIds || (coach.branchId ? [coach.branchId] : []));
    setEditBranchIds(coach.branchIds || (coach.branchId ? [coach.branchId] : []));
    setEditSystemRole(coach.systemRole || (coach.role === "ADMIN" ? "CHUNHIEM" : "COACH"));
    setEditTuitionRate(coach.tuitionRatePercent ?? 50);
    setEditBookRate(coach.bookRatePercent ?? 30);
    setEditHasAdminAccess(!!coach.hasAdminAccess);
  };

  const handleToggleAdminAccess = async (coach: UserData) => {
    const newAccess = !coach.hasAdminAccess;
    dataStore.setCoachAdminAccess(coach.id, newAccess);

    // Cập nhật state trực tiếp ngay để UI đổi ngay lập tức
    setCoaches((prev) =>
      prev.map((c) => (c.id === coach.id ? { ...c, hasAdminAccess: newAccess } : c))
    );

    try {
      const stored = localStorage.getItem("kttll_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id === coach.id || u.email?.toLowerCase() === coach.email?.toLowerCase()) {
          u.hasAdminAccess = newAccess;
          localStorage.setItem("kttll_user", JSON.stringify(u));
          window.dispatchEvent(new CustomEvent("kttll_user_updated"));
        }
      }
    } catch (e) {}

    // Gọi API lưu vĩnh viễn vào DB Supabase PostgreSQL
    try {
      const res = await fetch("/api/coaches/admin-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId: coach.id, hasAdminAccess: newAccess }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Lỗi lưu DB quyền Admin:", err);
    }

    reloadCoaches();
  };

  const handleCreateCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const primaryBranchId = (managedBranchIds.length > 0 ? managedBranchIds[0] : (branchIds[0] || branchId));

    const newCoach: UserData = {
      id: `user-coach-${Date.now()}`,
      name,
      email,
      phone: phone || "0912.000.111",
      role: systemRole === "CHUNHIEM" || systemRole === "PHOCHUNHIEM" ? "ADMIN" : "COACH",
      systemRole,
      branchId: primaryBranchId,
      branchIds,
      managedBranchIds,
      baseRate: 200000,
      tuitionRatePercent: Number(tuitionRate) || 50,
      bookRatePercent: Number(bookRate) || 30,
      title: title || "HLV Quốc gia",
      hasAdminAccess: hasAdminAccess || systemRole === "CHUNHIEM" || systemRole === "PHOCHUNHIEM",
    };

    dataStore.users.push(newCoach);
    dataStore.saveToLocalStorage();
    reloadCoaches();
    setIsModalOpen(false);

    setName("");
    setEmail("");
    setPhone("");
    setTitle("HLV Quốc gia");
    setSystemRole("COACH");
    setTuitionRate(50);
    setBookRate(30);
    setHasAdminAccess(false);
    setManagedBranchIds(["branch-1"]);
    setBranchIds(["branch-1"]);
  };

  const handleUpdateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach) return;

    const primaryBranchId = (editManagedBranchIds.length > 0 ? editManagedBranchIds[0] : (editBranchIds[0] || editBranchId));

    const updatedData: Partial<UserData> = {
      name: editName,
      title: editTitle,
      email: editEmail,
      phone: editPhone,
      branchId: primaryBranchId,
      branchIds: editBranchIds,
      managedBranchIds: editManagedBranchIds,
      systemRole: editSystemRole,
      tuitionRatePercent: Number(editTuitionRate),
      bookRatePercent: Number(editBookRate),
      hasAdminAccess:
        editHasAdminAccess ||
        editSystemRole === "CHUNHIEM" ||
        editSystemRole === "PHOCHUNHIEM",
      role: editSystemRole === "CHUNHIEM" || editSystemRole === "PHOCHUNHIEM" ? "ADMIN" : "COACH",
    };

    dataStore.updateCoach(editingCoach.id, updatedData);

    // Gọi API lưu vĩnh viễn
    try {
      await fetch("/api/coaches/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId: editingCoach.id,
          name: editName,
          title: editTitle,
          email: editEmail,
          phone: editPhone,
          tuitionRatePercent: editTuitionRate,
          bookRatePercent: editBookRate,
          systemRole: editSystemRole,
          branchId: primaryBranchId,
          branchIds: editBranchIds,
          managedBranchIds: editManagedBranchIds,
          hasAdminAccess: updatedData.hasAdminAccess,
        }),
      });
    } catch (err) {
      console.warn("Lỗi lưu rates API:", err);
    }

    // Đồng bộ nếu đang đăng nhập đúng tài khoản này
    try {
      const stored = localStorage.getItem("kttll_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id === editingCoach.id || u.email?.toLowerCase() === editingCoach.email?.toLowerCase()) {
          Object.assign(u, updatedData);
          localStorage.setItem("kttll_user", JSON.stringify(u));
          window.dispatchEvent(new CustomEvent("kttll_user_updated"));
        }
      }
    } catch (e) {}

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}

    reloadCoaches();
    setEditingCoach(null);
  };

  const handleDeleteCoach = async (coachId: string, coachName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn Huấn luyện viên "${coachName}" không?`)) {
      await dataStore.deleteCoach(coachId);
      reloadCoaches();
      if (editingCoach?.id === coachId) {
        setEditingCoach(null);
      }
      alert(`Đã xóa thành công Huấn luyện viên "${coachName}" khỏi hệ thống!`);
    }
  };



  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Đội Ngũ HLV & Phân Quyền
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý vai trò (Chủ nhiệm, Phó chủ nhiệm, Chủ từng cơ sở, HLV) và thiết lập mức lương % học phí, tiền sách cho từng HLV.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover w-full sm:w-auto cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm HLV Mới</span>
        </button>
      </div>

      {/* Coaches Cards Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {coaches.map((coach) => {
          const branch = dataStore.branches.find((b) => b.id === coach.branchId);
          const coachClasses = getCoachClasses(coach.id, coach.email);
          const sessionsTaught = dataStore.sessions.filter((s) =>
            coachClasses.some((c) => c.id === s.classId)
          ).length;

          const tuitionPct = coach.tuitionRatePercent ?? 50;
          const bookPct = coach.bookRatePercent ?? 30;

          return (
            <div
              key={coach.id}
              className="rounded bg-white p-4 border border-slate-100 space-y-3 hover:border-slate-200 transition-all"
            >
              {/* Header card */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-emerald-500/10 text-brand-primary font-bold text-lg flex-shrink-0">
                    ♞
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900">{coach.name}</h3>

                      {/* Role Badges */}
                      {coach.systemRole === "CHUNHIEM" && (
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                          👑 Chủ nhiệm CLB
                        </span>
                      )}
                      {coach.systemRole === "PHOCHUNHIEM" && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                          🛡️ Phó chủ nhiệm
                        </span>
                      )}
                      {coach.systemRole === "CHUCOSO" && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                          🏢 Chủ nhiệm: {
                            (coach.managedBranchIds && coach.managedBranchIds.length > 0
                              ? dataStore.branches.filter((b) => coach.managedBranchIds?.includes(b.id))
                              : branch ? [branch] : []
                            ).map((b) => b.name.split("–")[0].trim()).join(", ") || "Chưa chọn cơ sở"
                          }
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-brand-primary">{coach.title}</p>
                  </div>
                </div>

                {/* Top action buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                  <button
                    onClick={() => openEditModal(coach)}
                    className="flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    title="Chỉnh sửa lương & phân quyền"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Lương & Quyền</span>
                  </button>

                  <button
                    onClick={() => handleToggleAdminAccess(coach)}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-all ${
                      coach.hasAdminAccess
                        ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                    title={coach.hasAdminAccess ? "Thu hồi quyền Admin" : "Cấp quyền Admin"}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{coach.hasAdminAccess ? "Hạ Admin" : "Cấp Admin"}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteCoach(coach.id, coach.name)}
                    title="Xóa Huấn luyện viên"
                    className="flex items-center justify-center rounded bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Commission rates highlight banner */}
              <div className="rounded bg-emerald-50/60 p-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-emerald-700" />
                  <span className="font-semibold text-emerald-950">Mức lương HLV:</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-brand-primary">
                    <b>{tuitionPct}%</b> Học phí
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-amber-700">
                    <b>{bookPct}%</b> Tiền sách
                  </span>
                </div>
              </div>

              {/* Coach Contact Info */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{coach.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">{coach.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Cơ sở công tác: <strong>{
                      (coach.branchIds && coach.branchIds.length > 0
                        ? dataStore.branches.filter((b) => coach.branchIds?.includes(b.id))
                        : branch ? [branch] : []
                      ).map((b) => b.name.split("–")[0].trim()).join(", ") || "Toàn bộ CLB"
                    }</strong>
                  </span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-2 gap-3 rounded bg-slate-50 p-2.5 text-center border border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Lớp Đang Phụ Trách</p>
                  <p className="mt-0.5 text-sm font-black text-slate-800">
                    {coachClasses.length} lớp
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Ca Đã Dạy T10</p>
                  <p className="mt-0.5 text-sm font-black text-brand-primary">
                    {sessionsTaught} ca
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Sửa Toàn Bộ Thông Tin HLV, Phân Quyền & Cấu Hình Lương */}
      {editingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cài Đặt Lương & Phân Quyền HLV
                </h3>
                <p className="text-xs font-semibold text-brand-primary mt-0.5">{editingCoach.name}</p>
              </div>
              <button onClick={() => setEditingCoach(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoach} className="mt-4 space-y-4 text-xs">
              {/* Họ tên & Danh hiệu */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Họ và tên HLV *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 p-2 font-semibold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Danh hiệu chuyên môn *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 p-2 font-semibold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Section 1: Phân Quyền Vai Trò */}
              <div className="rounded border border-purple-100 bg-purple-50/40 p-3 space-y-2">
                <label className="font-bold text-purple-900 uppercase text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-700" />
                  <span>Phân Quyền Vai Trò Trong CLB</span>
                </label>

                <select
                  value={editSystemRole}
                  onChange={(e) => setEditSystemRole(e.target.value as any)}
                  className="w-full rounded border border-purple-200 bg-white p-2 font-semibold text-slate-900 focus:border-purple-600 focus:outline-none"
                >
                  <option value="CHUNHIEM">👑 Chủ nhiệm CLB (Toàn quyền quản trị toàn bộ 8 cơ sở)</option>
                  <option value="PHOCHUNHIEM">🛡️ Phó chủ nhiệm CLB (Quản lý toàn bộ thông tin CLB)</option>
                  <option value="CHUCOSO">🏢 Chủ từng cơ sở (Chỉ nắm thống kê cơ sở của mình)</option>
                  <option value="COACH">♟️ Huấn luyện viên tiêu chuẩn (Lớp & học viên của mình)</option>
                </select>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {editSystemRole === "CHUNHIEM" && "Chủ nhiệm có toàn quyền xem mọi doanh thu, cơ sở, HLV, cấu hình lương và phân quyền."}
                  {editSystemRole === "PHOCHUNHIEM" && "Phó chủ nhiệm có quyền quản lý toàn bộ thông tin CLB, giao nhiệm vụ và xem thống kê toàn hệ thống."}
                  {editSystemRole === "CHUCOSO" && "Chủ cơ sở chỉ nắm được dữ liệu, lớp học, học viên và thống kê doanh thu của riêng cơ sở được gán."}
                  {editSystemRole === "COACH" && "HLV chỉ xem các lớp học và học viên mà mình trực tiếp giảng dạy."}
                </p>
              </div>

              {/* Cơ sở */}
              {editSystemRole === "CHUCOSO" ? (
                <div className="rounded border border-blue-200 bg-blue-50/50 p-2.5 space-y-2">
                  <label className="font-semibold text-blue-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span>Cơ sở làm Chủ nhiệm (Có thể chọn nhiều cơ sở) *</span>
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      Đã chọn {editManagedBranchIds.length} cơ sở
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {dataStore.branches.map((b) => {
                      const isChecked = editManagedBranchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className={`flex items-center gap-2 p-1.5 rounded border text-[11px] font-semibold cursor-pointer transition-all ${
                            isChecked
                              ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditManagedBranchIds((prev) => [...prev, b.id]);
                              } else {
                                setEditManagedBranchIds((prev) => prev.filter((id) => id !== b.id));
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-blue-700">
                    💡 HLV này sẽ làm Chủ nhiệm và quản lý lương, học viên của các lớp học tại những cơ sở đã chọn.
                  </p>
                </div>
              ) : null}

              {/* Danh sách cơ sở giảng dạy */}
              <div className="rounded border border-slate-100 bg-slate-50 p-2.5 space-y-2">
                <label className="font-semibold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-brand-primary" />
                    <span>Các cơ sở tham gia giảng dạy (Có thể chọn nhiều cơ sở)</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                    Đã chọn {editBranchIds.length} cơ sở
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {dataStore.branches.map((b) => {
                    const isChecked = editBranchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 p-1.5 rounded border text-[11px] font-semibold cursor-pointer transition-all ${
                          isChecked
                            ? "bg-brand-primary text-white border-brand-primary"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditBranchIds((prev) => [...prev, b.id]);
                            } else {
                              setEditBranchIds((prev) => prev.filter((id) => id !== b.id));
                            }
                          }}
                          className="rounded text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="truncate">{b.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Cấu Hình Mức Lương % Học Phí & Tiền Sách */}
              <div className="rounded bg-emerald-50/60 p-3 space-y-2.5">
                <label className="font-bold text-emerald-950 uppercase text-[11px] flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-brand-primary" />
                  <span>Cấu Hình Mức Lương % Học Phí & Tiền Sách</span>
                </label>

                {/* % Học phí */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">% Chia Sẻ Học Phí:</span>
                    <span className="font-bold text-brand-primary text-sm">{editTuitionRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editTuitionRate}
                    onChange={(e) => setEditTuitionRate(Number(e.target.value))}
                    className="mt-1 w-full accent-brand-primary cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>0%</span>
                    <span>Mặc định: 50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* % Tiền sách */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">% Chia Sẻ Tiền Sách:</span>
                    <span className="font-bold text-amber-700 text-sm">{editBookRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editBookRate}
                    onChange={(e) => setEditBookRate(Number(e.target.value))}
                    className="mt-1 w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>0%</span>
                    <span>Mặc định: 30%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteCoach(editingCoach.id, editingCoach.name)}
                  className="rounded border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-600 hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa HLV</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCoach(null)}
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

      {/* Modal Thêm HLV Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Thêm Huấn Luyện Viên Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoach} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Họ và tên HLV *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: HLV Nguyễn Văn A"
                    className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Danh hiệu / Chức danh</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: HLV Quốc gia"
                    className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hlv@kttll.vn"
                    className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912.345.678"
                    className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Vai trò phân quyền</label>
                <select
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value as any)}
                  className="mt-1 w-full rounded border border-slate-200 p-2 focus:border-brand-primary focus:outline-none font-semibold"
                >
                  <option value="COACH">Huấn luyện viên tiêu chuẩn</option>
                  <option value="CHUCOSO">Chủ cơ sở (Quản lý 1 hoặc nhiều cơ sở)</option>
                  <option value="PHOCHUNHIEM">Phó chủ nhiệm CLB</option>
                  <option value="CHUNHIEM">Chủ nhiệm CLB</option>
                </select>
              </div>

              {/* Nếu là Chủ cơ sở: chọn nhiều cơ sở quản lý */}
              {systemRole === "CHUCOSO" ? (
                <div className="rounded border border-blue-200 bg-blue-50/50 p-2.5 space-y-2">
                  <label className="font-semibold text-blue-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span>Cơ sở làm Chủ nhiệm (Có thể chọn nhiều cơ sở) *</span>
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {managedBranchIds.length} cơ sở
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {dataStore.branches.map((b) => {
                      const isChecked = managedBranchIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className={`flex items-center gap-2 p-1.5 rounded border text-[11px] font-semibold cursor-pointer transition-all ${
                            isChecked
                              ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setManagedBranchIds((prev) => [...prev, b.id]);
                              } else {
                                setManagedBranchIds((prev) => prev.filter((id) => id !== b.id));
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate">{b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Các cơ sở tham gia giảng dạy */}
              <div className="rounded border border-slate-100 bg-slate-50 p-2.5 space-y-2">
                <label className="font-semibold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-brand-primary" />
                    <span>Các cơ sở tham gia giảng dạy (Có thể chọn nhiều cơ sở)</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                    {branchIds.length} cơ sở
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {dataStore.branches.map((b) => {
                    const isChecked = branchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex items-center gap-2 p-1.5 rounded border text-[11px] font-semibold cursor-pointer transition-all ${
                          isChecked
                            ? "bg-brand-primary text-white border-brand-primary"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBranchIds((prev) => [...prev, b.id]);
                            } else {
                              setBranchIds((prev) => prev.filter((id) => id !== b.id));
                            }
                          }}
                          className="rounded text-brand-primary focus:ring-brand-primary"
                        />
                        <span className="truncate">{b.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* % Lương & Sách */}
              <div className="grid grid-cols-2 gap-3 rounded bg-slate-50 p-2.5 border border-slate-100">
                <div>
                  <label className="font-semibold text-slate-700">% Học phí HLV nhận</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={tuitionRate}
                    onChange={(e) => setTuitionRate(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-200 p-2 font-bold text-brand-primary"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">% Tiền sách HLV nhận</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={bookRate}
                    onChange={(e) => setBookRate(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-200 p-2 font-bold text-amber-700"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded border border-slate-200 px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded bg-brand-primary px-4 py-1.5 font-semibold text-white hover:bg-brand-primary-hover transition-colors"
                >
                  Tạo Tài Khoản HLV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
