"use client";

import React, { useState } from "react";
import {
  Users,
  Plus,
  Phone,
  Mail,
  Award,
  DollarSign,
  Building2,
  Edit2,
  X,
  Sparkles,
  Check,
} from "lucide-react";
import { dataStore, UserData } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<UserData[]>(
    dataStore.users.filter((u) => u.role === "COACH")
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("Kiện tướng Quốc gia / HLV Trẻ");
  const [baseRate, setBaseRate] = useState("200000");
  const [branchId, setBranchId] = useState("branch-1");

  // Edit rate inline modal
  const [editingCoach, setEditingCoach] = useState<UserData | null>(null);
  const [editRateValue, setEditRateValue] = useState("");

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
      baseRate: parseFloat(baseRate) || 200000,
      title,
    };

    dataStore.users.push(newCoach);
    setCoaches(dataStore.users.filter((u) => u.role === "COACH"));
    setIsModalOpen(false);

    setName("");
    setEmail("");
    setPhone("");
  };

  const handleUpdateRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoach) return;

    editingCoach.baseRate = parseFloat(editRateValue) || editingCoach.baseRate;
    setCoaches([...dataStore.users.filter((u) => u.role === "COACH")]);
    setEditingCoach(null);
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
            Cấu hình đơn giá thù lao/ca dạy và cơ sở công tác của từng Huấn luyện viên.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm HLV Mới</span>
        </button>
      </div>

      {/* Coaches Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {coaches.map((coach) => {
          const branch = dataStore.branches.find((b) => b.id === coach.branchId);
          const coachClasses = dataStore.classes.filter((c) => c.coachId === coach.id);
          const sessionsTaught = dataStore.sessions.filter((s) =>
            coachClasses.some((c) => c.id === s.classId)
          ).length;

          return (
            <div
              key={coach.id}
              className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200/80 transition-all hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-brand-primary font-black text-xl">
                    ♞
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{coach.name}</h3>
                    <p className="text-xs font-semibold text-brand-primary">{coach.title}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingCoach(coach);
                    setEditRateValue(coach.baseRate.toString());
                  }}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Sửa đơn giá</span>
                </button>
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

              {/* Rate & Classes Stats */}
              <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Đơn Giá / Ca</p>
                  <p className="mt-0.5 text-sm font-black text-brand-secondary">
                    {formatCurrencyVND(coach.baseRate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Lớp Đang Dạy</p>
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

      {/* Modal Cấu hình Đơn giá Thù Lao */}
      {editingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Sửa Đơn Giá Thù Lao: {editingCoach.name}
              </h3>
              <button onClick={() => setEditingCoach(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRate} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Đơn giá thù lao / 1 ca dạy (VNĐ)</label>
                <input
                  type="number"
                  step="10000"
                  value={editRateValue}
                  onChange={(e) => setEditRateValue(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-base font-black text-brand-secondary focus:border-brand-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Thù lao = (Số ca dạy thực tế) × (Đơn giá này)
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCoach(null)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand-primary py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm HLV Mới */}
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
                  placeholder="VD: Kiện tướng Trần Văn A"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Danh hiệu / Chức danh</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Kiện tướng Quốc gia"
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
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
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
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Đơn giá thù lao / ca (VNĐ)</label>
                  <input
                    type="number"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
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
