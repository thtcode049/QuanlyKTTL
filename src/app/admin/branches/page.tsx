"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { dataStore, BranchData } from "@/lib/data-store";

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<BranchData[]>(dataStore.branches);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;

    const newBranch: BranchData = {
      id: `branch-${Date.now()}`,
      name,
      address,
      phone: phone || "0988.123.456",
    };

    dataStore.branches.push(newBranch);
    setBranches([...dataStore.branches]);
    setIsModalOpen(false);
    setName("");
    setAddress("");
    setPhone("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
            <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
            <span>Quản Trị Cơ Sở Đào Tạo</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            Các Cơ Sở CLB Tại Hà Nội
          </h1>
          <p className="text-xs text-slate-500">
            Hệ thống đào tạo cờ vua chuẩn quốc tế trên các quận huyện Hà Nội.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm Cơ Sở Mới</span>
        </button>
      </div>

      {/* Grid of Branches */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {branches.map((b) => {
          const branchClasses = dataStore.classes.filter((c) => c.branchId === b.id);
          const branchClassIds = branchClasses.map((c) => c.id);
          const studentCount = dataStore.students.filter((s) =>
            s.classIds.some((cid) => branchClassIds.includes(cid))
          ).length;
          const coachList = dataStore.users.filter((u) => u.branchId === b.id);

          return (
            <div
              key={b.id}
              className="rounded-2xl bg-white p-6 shadow-soft border border-slate-200/80 transition-all hover:shadow-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary font-black text-xl">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{b.name}</h3>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{b.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono font-medium">{b.phone}</span>
              </div>

              {/* Stats of branch */}
              <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Lớp Đang Học</p>
                  <p className="mt-0.5 text-base font-black text-slate-800">{branchClasses.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Học Viên</p>
                  <p className="mt-0.5 text-base font-black text-brand-primary">{studentCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">HLV Phụ Trách</p>
                  <p className="mt-0.5 text-base font-black text-slate-800">{coachList.length || 1}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Thêm cơ sở */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Thêm Cơ Sở Đào Tạo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Tên cơ sở *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Cơ sở 5 - Hà Đông"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Địa chỉ cụ thể *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: Số 12 Tô Hiệu, Q. Hà Đông, Hà Nội"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Số điện thoại hotline cơ sở</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0988.777.666"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
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
