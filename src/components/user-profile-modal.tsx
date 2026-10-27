"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  Award,
  CreditCard,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Save,
  CheckCircle2,
  KeyRound,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { dataStore, UserData } from "@/lib/data-store";
import { SUPPORTED_BANKS } from "@/lib/vietqr";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserData | null;
  onProfileUpdated?: (updatedUser: UserData) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [elo, setElo] = useState<number>(2000);
  const [bankId, setBankId] = useState("MB");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Admin key input
  const [adminKey, setAdminKey] = useState("");
  const [showAdminKeyInput, setShowAdminKeyInput] = useState(false);
  const [adminKeyError, setAdminKeyError] = useState("");

  const [activeTab, setActiveTab] = useState<"PROFILE" | "BANK" | "BRANCHES" | "ADMIN">("PROFILE");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setEmail(currentUser.email || "");
      setTitle(currentUser.title || "HLV Quốc gia");
      setBio(currentUser.bio || "");
      setExperience(currentUser.experience || "");
      setElo(currentUser.elo || 2000);
      setBankName(currentUser.bankName || "");
      setBankAccount(currentUser.bankAccount || "");
      setAccountHolder(currentUser.accountHolder || currentUser.name || "");
      setHasAdminAccess(currentUser.role === "ADMIN" || !!currentUser.hasAdminAccess);

      const foundBank = SUPPORTED_BANKS.find(
        (b) => b.shortName.toLowerCase() === (currentUser.bankName || "").toLowerCase()
      );
      if (foundBank) setBankId(foundBank.id);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleBankSelect = (id: string) => {
    setBankId(id);
    const b = SUPPORTED_BANKS.find((x) => x.id === id);
    if (b) {
      setBankName(`${b.name} (${b.shortName})`);
    }
  };

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminKeyError("");

    if (!adminKey && !currentUser.hasAdminAccess) {
      setAdminKeyError("Vui lòng nhập mật mã quản trị viên");
      return;
    }

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentUser.id,
          email: currentUser.email,
          hasAdminAccess: true,
          adminSecretKey: adminKey || "admin123",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAdminKeyError(data.error || "Mã quản trị viên không chính xác");
        return;
      }

      setHasAdminAccess(true);
      setShowAdminKeyInput(false);
      setSuccessMsg("🎉 Chúc mừng! Bạn đã nhận quyền Quản trị (Admin) thành công!");

      // Update in dataStore
      dataStore.setCoachAdminAccess(currentUser.id, true);

      // Update in localStorage
      try {
        const stored = localStorage.getItem("kttll_user");
        if (stored) {
          const u = JSON.parse(stored);
          u.hasAdminAccess = true;
          localStorage.setItem("kttll_user", JSON.stringify(u));
        }
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("kttll_user_updated"));
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    } catch (err: any) {
      setAdminKeyError("Lỗi kết nối máy chủ");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      const payload = {
        id: currentUser.id,
        email: currentUser.email,
        name,
        phone,
        title,
        bio,
        experience,
        elo: Number(elo),
        bankAccount,
        bankName,
        accountHolder,
      };

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // Cập nhật dataStore
      dataStore.updateCoach(currentUser.id, payload as any);

      // Cập nhật localStorage
      try {
        const stored = localStorage.getItem("kttll_user");
        if (stored) {
          const u = JSON.parse(stored);
          const updatedLocal = { ...u, ...payload };
          localStorage.setItem("kttll_user", JSON.stringify(updatedLocal));
        }
      } catch (e) {}

      window.dispatchEvent(new CustomEvent("kttll_user_updated"));
      if (onProfileUpdated) {
        onProfileUpdated({ ...currentUser, ...payload, hasAdminAccess });
      }

      setSuccessMsg("Đã lưu thông tin hồ sơ thành công!");
      try {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      } catch (e) {}

      setTimeout(() => {
        setSuccessMsg("");
      }, 3000);
    } catch (err) {
      console.error("Lỗi lưu hồ sơ:", err);
    } finally {
      setSaving(false);
    }
  };

  const managedBranchIds = currentUser.managedBranchIds || (currentUser.branchId ? [currentUser.branchId] : []);
  const teachingBranchIds = currentUser.branchIds || (currentUser.branchId ? [currentUser.branchId] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-slate-200 my-auto text-slate-800">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary text-white text-xl font-bold shadow-md shadow-brand-primary/20">
              {currentUser.role === "ADMIN" ? "👑" : "♞"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900">{name || currentUser.name}</h2>
                {hasAdminAccess && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Có quyền Admin
                  </span>
                )}
                {currentUser.systemRole === "CHUCOSO" && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
                    🏢 Chủ cơ sở
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-primary font-semibold mt-0.5">
                {title || currentUser.title || "HLV Quốc gia"} • {currentUser.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="mt-4 flex gap-1 rounded-2xl bg-slate-100 p-1 text-xs font-bold border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab("PROFILE")}
            className={`flex-1 rounded-xl py-2 transition-all ${
              activeTab === "PROFILE" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Thông Tin Cá Nhân
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BANK")}
            className={`flex-1 rounded-xl py-2 transition-all ${
              activeTab === "BANK" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Ngân Hàng & Thù Lao
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BRANCHES")}
            className={`flex-1 rounded-xl py-2 transition-all ${
              activeTab === "BRANCHES" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Cơ Sở Phụ Trách
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ADMIN")}
            className={`flex-1 rounded-xl py-2 transition-all ${
              activeTab === "ADMIN" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Quyền Admin
          </button>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-800 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content by Tab */}
        <form onSubmit={handleSaveProfile} className="mt-4">
          {activeTab === "PROFILE" && (
            <div className="space-y-3.5 text-xs max-h-[55vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Danh hiệu chuyên môn</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: HLV Quốc gia, Kiện tướng"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Hệ số Elo cờ vua</label>
                  <input
                    type="number"
                    value={elo}
                    onChange={(e) => setElo(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Email đăng nhập (Cố định)</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Kinh nghiệm & Thành tích</label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="VD: 5 năm kinh nghiệm huấn luyện, HCV giải trẻ"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Giới thiệu bản thân / Triết lý dạy</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Giới thiệu đôi nét về bản thân và phong cách huấn luyện cờ vua..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "BANK" && (
            <div className="space-y-3.5 text-xs max-h-[55vh] overflow-y-auto pr-1">
              <div>
                <label className="font-bold text-slate-700">Ngân hàng nhận thù lao</label>
                <select
                  value={bankId}
                  onChange={(e) => handleBankSelect(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-semibold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                >
                  {SUPPORTED_BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.shortName} – {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="VD: 04092004369"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Tên chủ tài khoản (Viết hoa)</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                    placeholder="VD: NGUYEN VAN A"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-mono uppercase font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <span>Chế độ Lương & Thù lao HLV:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                    <p className="text-[11px] text-slate-500 font-medium">Tỷ lệ % Học phí</p>
                    <p className="text-base font-black text-brand-primary">
                      {currentUser.tuitionRatePercent ?? 50}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-2.5 border border-emerald-100">
                    <p className="text-[11px] text-slate-500 font-medium">Tỷ lệ % Tiền sách</p>
                    <p className="text-base font-black text-amber-700">
                      {currentUser.bookRatePercent ?? 30}%
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  💡 Tỷ lệ thù lao do Ban Quản Trị CLB thiết lập theo quy chế chuyên môn.
                </p>
              </div>
            </div>
          )}

          {activeTab === "BRANCHES" && (
            <div className="space-y-3.5 text-xs max-h-[55vh] overflow-y-auto pr-1">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5">
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>Quy chế Phân bổ Cơ sở:</span>
                </div>
                <p className="mt-1 text-[11px] text-blue-800 leading-relaxed">
                  • 1 Huấn luyện viên có thể giảng dạy tại nhiều cơ sở khác nhau.<br />
                  • 1 Huấn luyện viên có thể chủ nhiệm một hoặc nhiều cơ sở theo phân công của CLB.
                </p>
              </div>

              {/* Danh sách cơ sở chủ nhiệm nếu là CHUCOSO */}
              {currentUser.systemRole === "CHUCOSO" && (
                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 space-y-2">
                  <h4 className="font-bold text-purple-900 flex items-center gap-1.5">
                    👑 Các cơ sở bạn đang làm Chủ nhiệm:
                  </h4>
                  <div className="space-y-1.5">
                    {dataStore.branches
                      .filter((b) => managedBranchIds.includes(b.id))
                      .map((b) => (
                        <div key={b.id} className="flex items-center gap-2 rounded-xl bg-white p-2 border border-purple-100">
                          <Building2 className="h-4 w-4 text-purple-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{b.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{b.address}</p>
                          </div>
                        </div>
                      ))}
                    {dataStore.branches.filter((b) => managedBranchIds.includes(b.id)).length === 0 && (
                      <p className="text-slate-500 italic text-[11px]">Chưa được gán cơ sở chủ nhiệm.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Danh sách tất cả cơ sở HLV tham gia giảng dạy */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  🏢 Danh sách cơ sở CLB Kiện Tướng Tương Lai:
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {dataStore.branches.map((b) => {
                    const isManaged = managedBranchIds.includes(b.id) && currentUser.systemRole === "CHUCOSO";
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-2 border border-slate-200/80">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{b.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{b.address}</p>
                        </div>
                        {isManaged && (
                          <span className="flex-shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                            Chủ nhiệm
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "ADMIN" && (
            <div className="space-y-3.5 text-xs max-h-[55vh] overflow-y-auto pr-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
                      hasAdminAccess ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Trạng thái Quyền Quản Trị (Admin)</p>
                      <p className="text-[11px] text-slate-500">
                        {hasAdminAccess
                          ? "Tài khoản của bạn đã có toàn quyền truy cập khu vực Quản trị CLB."
                          : "Tài khoản hiện tại chưa có quyền truy cập khu vực Quản trị."}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                    hasAdminAccess ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {hasAdminAccess ? "Đã cấp quyền" : "Chưa cấp quyền"}
                  </span>
                </div>

                {hasAdminAccess ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                    <p className="text-emerald-900 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      Quyền Quản Trị đã kích hoạt!
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Bạn có thể chuyển đổi linh hoạt giữa giao diện Huấn Luyện Viên và Quản Trị CLB bất cứ lúc nào từ thanh Menu trên đầu trang.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push("/admin/coaches");
                      }}
                      className="mt-1 flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Đến Trang Quản Trị CLB Ngay</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <KeyRound className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-950">Nhận quyền Quản trị (Admin)</p>
                        <p className="text-[11px] text-amber-800">
                          Nếu bạn được Ban Quản Trị ủy quyền hoặc có mật mã quản trị viên của CLB, vui lòng nhập mã bảo mật để nhận quyền Admin ngay tức thì.
                        </p>
                      </div>
                    </div>

                    {!showAdminKeyInput ? (
                      <button
                        type="button"
                        onClick={() => setShowAdminKeyInput(true)}
                        className="rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Kích Hoạt / Nhận Quyền Admin</span>
                      </button>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={adminKey}
                            onChange={(e) => {
                              setAdminKey(e.target.value);
                              setAdminKeyError("");
                            }}
                            placeholder="Nhập mã bảo mật quản trị (mặc định: admin123)..."
                            className="flex-1 rounded-xl border border-amber-300 bg-white p-2 text-xs font-mono focus:border-brand-primary focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleClaimAdmin}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-sm flex-shrink-0"
                          >
                            Xác Nhận
                          </button>
                        </div>
                        {adminKeyError && (
                          <p className="text-[11px] font-bold text-rose-600">{adminKeyError}</p>
                        )}
                        <p className="text-[10px] text-slate-500">
                          💡 Mã xác nhận quản trị mặc định của hệ thống: <code>admin123</code>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Đang lưu..." : "Lưu Thông Tin Hồ Sơ"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
