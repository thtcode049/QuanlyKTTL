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
} from "lucide-react";
import { dataStore, UserData } from "@/lib/data-store";

export default function AdminCoachesPage() {
  // Đảm bảo dữ liệu HLV luôn được chuẩn hóa và đồng bộ từ Database
  useEffect(() => {
    dataStore.normalizeCoachData();
    setCoaches([...dataStore.users.filter((u) => u.role === "COACH")]);

    // Đồng bộ danh sách HLV từ Supabase Database
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users && Array.isArray(data.users)) {
          data.users.forEach((dbUser: UserData) => {
            const idx = dataStore.users.findIndex(
              (u) => u.id === dbUser.id || u.email.toLowerCase() === dbUser.email.toLowerCase()
            );
            if (idx >= 0) {
              dataStore.users[idx] = { ...dataStore.users[idx], ...dbUser };
            } else {
              dataStore.users.push(dbUser);
            }
          });
          dataStore.saveToLocalStorage();
          setCoaches([...dataStore.users.filter((u) => u.role === "COACH")]);
        }
      })
      .catch((err) => console.warn("Lỗi đồng bộ HLV từ DB:", err));
  }, []);

  const [coaches, setCoaches] = useState<UserData[]>(
    dataStore.users.filter((u) => u.role === "COACH")
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("HLV Quốc gia");
  const [branchId, setBranchId] = useState("branch-1");
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Modal Sửa Toàn Bộ Thông Tin HLV
  const [editingCoach, setEditingCoach] = useState<UserData | null>(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchId, setEditBranchId] = useState("branch-1");
  const [editHasAdminAccess, setEditHasAdminAccess] = useState(false);

  const openEditModal = (coach: UserData) => {
    setEditingCoach(coach);
    setEditName(coach.name);
    setEditTitle(coach.title || "HLV Quốc gia");
    setEditEmail(coach.email);
    setEditPhone(coach.phone);
    setEditBranchId(coach.branchId || "branch-1");
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
    setCoaches([...dataStore.users.filter((u) => u.role === "COACH")]);
  };

  const handleCreateCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newCoach: UserData = {
      id: `user-coach-${Date.now()}`,
      name,
      email,
      phone: phone || "0912.000.111",
      role: "COACH",
      branchId,
      baseRate: 200000,
      title: title || "HLV Quốc gia",
      hasAdminAccess,
    };

    dataStore.users.push(newCoach);
    setCoaches([...dataStore.users.filter((u) => u.role === "COACH")]);
    setIsModalOpen(false);

    setName("");
    setEmail("");
    setPhone("");
    setTitle("HLV Quốc gia");
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
      hasAdminAccess: editHasAdminAccess,
    });

    // Đồng bộ nếu đang lưu trong localStorage
    try {
      const stored = localStorage.getItem("kttll_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id === editingCoach.id) {
          u.name = editName;
          u.title = editTitle;
          u.email = editEmail;
          u.phone = editPhone;
          u.hasAdminAccess = editHasAdminAccess;
          localStorage.setItem("kttll_user", JSON.stringify(u));
        }
      }
    } catch (e) {
      // bỏ qua nếu lỗi parse
    }

    setCoaches([...dataStore.users.filter((u) => u.role === "COACH")]);
    setEditingCoach(null);
  };

  const handleDeleteCoach = (coachId: string, coachName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa Huấn luyện viên "${coachName}" không?`)) {
      dataStore.deleteCoach(coachId);
      setCoaches([...dataStore.users.filter((u) => u.role === "COACH")]);
      if (editingCoach?.id === coachId) {
        setEditingCoach(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Quản Lý Huấn Luyện Viên
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý toàn bộ thông tin HLV, danh hiệu chuyên môn và cơ sở công tác.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm HLV Mới</span>
        </button>
      </div>

      {/* Coaches Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {coaches.map((coach) => {
          const branch = dataStore.branches.find((b) => b.id === coach.branchId);
          const coachClasses = dataStore.classes.filter((c) => c.coachId === coach.id);
          const sessionsTaught = dataStore.sessions.filter((s) =>
            coachClasses.some((c) => c.id === s.classId)
          ).length;

          return (
            <div
              key={coach.id}
              className="rounded-2xl bg-white p-4 sm:p-6 shadow-soft border border-slate-200/80 transition-all hover:shadow-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-brand-primary font-black text-xl flex-shrink-0">
                    ♞
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{coach.name}</h3>
                      {coach.hasAdminAccess && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          <ShieldCheck className="h-3 w-3 text-amber-600" />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-brand-primary">{coach.title}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                  <button
                    onClick={() => handleToggleAdminAccess(coach)}
                    className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                      coach.hasAdminAccess
                        ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                    }`}
                    title={coach.hasAdminAccess ? "Thu hồi quyền quản trị Admin" : "Cấp quyền quản trị Admin"}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{coach.hasAdminAccess ? "Hạ Admin" : "Cấp Admin"}</span>
                  </button>
                  <button
                    onClick={() => openEditModal(coach)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Sửa</span>
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

              <div className="mt-4 space-y-2 text-xs text-slate-600">
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
                  <span>Cơ sở chính: <strong>{branch?.name || "Linh hoạt đa cơ sở"}</strong></span>
                </div>
              </div>

              {/* Classes & Sessions Stats (Đã xóa bỏ hoàn toàn phần Đơn Giá / Ca) */}
              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Lớp Đang Dạy</p>
                  <p className="mt-0.5 text-base font-black text-slate-800">
                    {coachClasses.length} lớp
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Ca Đã Dạy T10</p>
                  <p className="mt-0.5 text-base font-black text-brand-primary">
                    {sessionsTaught} ca
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Sửa Toàn Bộ Thông Tin HLV */}
      {editingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Sửa Thông Tin Huấn Luyện Viên
                </h3>
                <p className="text-xs text-slate-500">Mã HLV: {editingCoach.id}</p>
              </div>
              <button onClick={() => setEditingCoach(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCoach} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Họ và tên HLV *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="VD: HLV Trần Huyền Trang"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Danh hiệu / Chức danh *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="VD: HLV Quốc gia / Đại Kiện Tướng"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

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

              <div>
                <label className="font-bold text-slate-700">Cơ sở công tác chính</label>
                <select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                >
                  {dataStore.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phân quyền Quản trị (Admin) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHasAdminAccess}
                    onChange={(e) => setEditHasAdminAccess(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Cấp quyền Quản trị (Admin)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Cho phép Huấn luyện viên này truy cập vào hệ thống Quản trị CLB và hiển thị nút chuyển sang trang Admin.
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteCoach(editingCoach.id, editingCoach.name)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 font-bold text-rose-600 hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa HLV Này</span>
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

      {/* Modal Thêm HLV Mới (Đã loại bỏ trường đơn giá/ca) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Thêm Huấn Luyện Viên Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCoach} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Họ và tên HLV *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: HLV Trần Huyền Trang"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Email đăng nhập *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hlv3@kttll.vn"
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
                    placeholder="0912.333.444"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Cơ sở chính</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                >
                  {dataStore.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phân quyền Quản trị (Admin) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAdminAccess}
                    onChange={(e) => setHasAdminAccess(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Cấp quyền Quản trị (Admin)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Cho phép Huấn luyện viên này truy cập vào hệ thống Quản trị CLB và chuyển sang trang Admin.
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-primary py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Lưu HLV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
