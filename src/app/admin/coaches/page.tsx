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
    setEditSystemRole(coach.systemRole || (coach.role === "ADMIN" ? "CHUNHIEM" : "COACH"));
    setEditTuitionRate(coach.tuitionRatePercent ?? 50);
    setEditBookRate(coach.bookRatePercent ?? 30);
    setEditHasAdminAccess(!!coach.hasAdminAccess);
  };

  const handleToggleAdminAccess = (coach: UserData) => {
    const newAccess = !coach.hasAdminAccess;
    dataStore.setCoachAdminAccess(coach.id, newAccess);
    try {
      const stored = localStorage.getItem("kttll_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id === coach.id) {
          u.hasAdminAccess = newAccess;
          localStorage.setItem("kttll_user", JSON.stringify(u));
        }
      }
    } catch (e) {}
    reloadCoaches();
  };

  const handleCreateCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newCoach: UserData = {
      id: `user-coach-${Date.now()}`,
      name,
      email,
      phone: phone || "0912.000.111",
      role: systemRole === "CHUNHIEM" || systemRole === "PHOCHUNHIEM" ? "ADMIN" : "COACH",
      systemRole,
      branchId,
      baseRate: 200000,
      tuitionRatePercent: Number(tuitionRate) || 50,
      bookRatePercent: Number(bookRate) || 30,
      title: title || "HLV Quốc gia",
      hasAdminAccess: hasAdminAccess || systemRole === "CHUNHIEM" || systemRole === "PHOCHUNHIEM" || systemRole === "CHUCOSO",
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
  };

  const handleUpdateCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach) return;

    dataStore.updateCoach(editingCoach.id, {
      name: editName,
      title: editTitle,
      email: editEmail,
      phone: editPhone,
      branchId: editBranchId,
      systemRole: editSystemRole,
      tuitionRatePercent: Number(editTuitionRate),
      bookRatePercent: Number(editBookRate),
      hasAdminAccess:
        editHasAdminAccess ||
        editSystemRole === "CHUNHIEM" ||
        editSystemRole === "PHOCHUNHIEM" ||
        editSystemRole === "CHUCOSO",
      role: editSystemRole === "CHUNHIEM" || editSystemRole === "PHOCHUNHIEM" ? "ADMIN" : "COACH",
    });

    // Gọi API lưu
    fetch("/api/coaches/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachId: editingCoach.id,
        tuitionRatePercent: editTuitionRate,
        bookRatePercent: editBookRate,
        systemRole: editSystemRole,
        branchId: editBranchId,
      }),
    }).catch((err) => console.warn("Lỗi lưu rates API:", err));

    // Đồng bộ nếu đang đăng nhập đúng tài khoản này
    try {
      const stored = localStorage.getItem("kttll_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id === editingCoach.id) {
          u.name = editName;
          u.title = editTitle;
          u.systemRole = editSystemRole;
          u.tuitionRatePercent = editTuitionRate;
          u.bookRatePercent = editBookRate;
          u.branchId = editBranchId;
          u.hasAdminAccess = true;
          localStorage.setItem("kttll_user", JSON.stringify(u));
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
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover w-full sm:w-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm HLV Mới</span>
        </button>
      </div>

      {/* Coaches Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              className="rounded-2xl bg-white p-4 sm:p-6 shadow-soft border border-slate-200/80 transition-all hover:shadow-card space-y-4"
            >
              {/* Header card */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-brand-primary font-black text-xl flex-shrink-0">
                    ♞
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-base font-bold text-slate-900">{coach.name}</h3>

                      {/* Role Badges */}
                      {coach.systemRole === "CHUNHIEM" && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800 border border-purple-200">
                          👑 Chủ nhiệm CLB
                        </span>
                      )}
                      {coach.systemRole === "PHOCHUNHIEM" && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800 border border-blue-200">
                          🛡️ Phó chủ nhiệm
                        </span>
                      )}
                      {coach.systemRole === "CHUCOSO" && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800 border border-blue-200">
                          🏢 Chủ nhiệm: {branch ? branch.name.split("–")[0].trim() : "Chưa chọn cơ sở"}
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
                    className="flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-brand-primary hover:text-white transition-all shadow-sm cursor-pointer"
                    title="Chỉnh sửa lương & phân quyền"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Lương & Quyền</span>
                  </button>

                  <button
                    onClick={() => handleToggleAdminAccess(coach)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                      coach.hasAdminAccess
                        ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                    }`}
                    title={coach.hasAdminAccess ? "Thu hồi quyền Admin" : "Cấp quyền Admin"}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{coach.hasAdminAccess ? "Hạ Admin" : "Cấp Admin"}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteCoach(coach.id, coach.name)}
                    title="Xóa Huấn luyện viên"
                    className="flex items-center justify-center rounded-xl bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Commission rates highlight banner */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-700" />
                  <span className="font-bold text-emerald-950">Mức lương HLV:</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-brand-primary">
                    <b>{tuitionPct}%</b> Học phí
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-amber-700">
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
                  <span>Cơ sở công tác: <strong>{branch?.name || "Toàn bộ CLB"}</strong></span>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-2.5 text-center border border-slate-100 text-xs">
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
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
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
                  <label className="font-bold text-slate-700">Họ và tên HLV *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Danh hiệu chuyên môn *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Section 1: Phân Quyền Vai Trò */}
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 space-y-2">
                <label className="font-black text-purple-900 uppercase text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-700" />
                  <span>Phân Quyền Vai Trò Trong CLB</span>
                </label>

                <select
                  value={editSystemRole}
                  onChange={(e) => setEditSystemRole(e.target.value as any)}
                  className="w-full rounded-xl border border-purple-200 bg-white p-2.5 font-bold text-slate-900 focus:border-purple-600 focus:outline-none"
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
                <div className="rounded-xl border border-blue-300 bg-blue-50/70 p-3 space-y-1.5">
                  <label className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>Chọn cơ sở quản lý (Dành cho Chủ nhiệm cơ sở) *</span>
                  </label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="w-full rounded-xl border border-blue-300 bg-white p-2.5 font-bold text-slate-900 focus:border-blue-600 focus:outline-none"
                    required
                  >
                    {dataStore.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-blue-700">
                    HLV này sẽ được phân quyền quản lý số liệu và học viên tại cơ sở này.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-700">Cơ sở công tác chính</label>
                  <select
                    value={editBranchId}
                    onChange={(e) => setEditBranchId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-semibold"
                  >
                    {dataStore.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Section 2: Cấu Hình Mức Lương % Học Phí & Tiền Sách */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
                <label className="font-black text-emerald-950 uppercase text-[11px] flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-brand-primary" />
                  <span>Cấu Hình Mức Lương % Học Phí & Tiền Sách</span>
                </label>

                {/* % Học phí */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">% Chia Sẻ Học Phí:</span>
                    <span className="font-black text-brand-primary text-sm">{editTuitionRate}%</span>
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
                    <span className="font-bold text-slate-700">% Chia Sẻ Tiền Sách:</span>
                    <span className="font-black text-amber-700 text-sm">{editBookRate}%</span>
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

              <div className="mt-5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteCoach(editingCoach.id, editingCoach.name)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 font-bold text-rose-600 hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa HLV</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCoach(null)}
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

      {/* Modal Thêm HLV Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Thêm Huấn Luyện Viên Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoach} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Họ và tên HLV *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: HLV Nguyễn Văn A"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Danh hiệu / Chức danh</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: HLV Quốc gia"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hlv@kttll.vn"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912.345.678"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Vai trò phân quyền</label>
                  <select
                    value={systemRole}
                    onChange={(e) => setSystemRole(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-semibold"
                  >
                    <option value="COACH">Huấn luyện viên</option>
                    <option value="CHUCOSO">Chủ cơ sở (Quản lý 1 cơ sở)</option>
                    <option value="PHOCHUNHIEM">Phó chủ nhiệm</option>
                    <option value="CHUNHIEM">Chủ nhiệm CLB</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">
                    {systemRole === "CHUCOSO" ? "Cơ sở quản lý *" : "Cơ sở công tác"}
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className={`mt-1 w-full rounded-xl p-2.5 font-bold focus:outline-none ${
                      systemRole === "CHUCOSO"
                        ? "border-2 border-blue-400 bg-blue-50/50 text-blue-950 focus:border-blue-600"
                        : "border border-slate-200 text-slate-800 focus:border-brand-primary"
                    }`}
                  >
                    {dataStore.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* % Lương & Sách */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700">% Học phí HLV nhận</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={tuitionRate}
                    onChange={(e) => setTuitionRate(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 font-bold text-brand-primary"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">% Tiền sách HLV nhận</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={bookRate}
                    onChange={(e) => setBookRate(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 font-bold text-amber-700"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-primary px-5 py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
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
