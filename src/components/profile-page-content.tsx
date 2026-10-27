"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  GraduationCap,
  Calendar,
  Wallet,
  Check,
  ChevronRight,
} from "lucide-react";
import { dataStore, UserData, resolveCanonicalCoachId, getCoachClasses } from "@/lib/data-store";
import { SUPPORTED_BANKS } from "@/lib/vietqr";
import confetti from "canvas-confetti";

interface ProfilePageContentProps {
  userRole: "ADMIN" | "COACH";
}

export default function ProfilePageContent({ userRole }: ProfilePageContentProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  const loadUserData = () => {
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

        setName(merged.name || "");
        setPhone(merged.phone || "");
        setEmail(merged.email || "");
        setTitle(merged.title || "HLV Quốc gia");
        setBio(merged.bio || "");
        setExperience(merged.experience || "");
        setElo(merged.elo || 2000);
        setBankName(merged.bankName || "");
        setBankAccount(merged.bankAccount || "");
        setAccountHolder(merged.accountHolder || merged.name || "");
        setHasAdminAccess(merged.role === "ADMIN" || !!merged.hasAdminAccess);

        const foundBank = SUPPORTED_BANKS.find(
          (b) => b.shortName.toLowerCase() === (merged.bankName || "").toLowerCase()
        );
        if (foundBank) setBankId(foundBank.id);
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadUserData();
    const handleUpdate = () => loadUserData();
    window.addEventListener("kttll_user_updated", handleUpdate);
    return () => window.removeEventListener("kttll_user_updated", handleUpdate);
  }, []);

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

    if (!adminKey && !currentUser?.hasAdminAccess) {
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

      // Cập nhật dataStore
      dataStore.setCoachAdminAccess(currentUser.id, true);

      // Cập nhật localStorage
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

      setSuccessMsg("Đã lưu thông tin hồ sơ thành công vào cơ sở dữ liệu!");
      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      } catch (e) {}

      setTimeout(() => {
        setSuccessMsg("");
      }, 4000);
    } catch (err) {
      console.error("Lỗi lưu hồ sơ:", err);
    } finally {
      setSaving(false);
    }
  };

  const coachClasses = currentUser ? getCoachClasses(currentUser.id, currentUser.email) : [];
  const managedBranchIds = currentUser?.managedBranchIds || (currentUser?.branchId ? [currentUser.branchId] : []);
  const teachingBranchIds = currentUser?.branchIds || (currentUser?.branchId ? [currentUser.branchId] : []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link href={userRole === "ADMIN" ? "/admin/coaches" : "/coach/classes"} className="hover:text-brand-primary">
              Trang Chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-800 font-bold">Hồ Sơ Của Tôi</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
            Hồ Sơ Cá Nhân & Quản Trị
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Xem và chỉnh sửa thông tin cá nhân, tài khoản ngân hàng nhận thù lao, cơ sở công tác và phân quyền Quản trị CLB.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasAdminAccess && userRole === "COACH" && (
            <Link
              href="/admin/coaches"
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Đến Trang Quản Trị</span>
            </Link>
          )}

          {hasAdminAccess && userRole === "ADMIN" && (
            <Link
              href="/coach/classes"
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-brand-primary shadow-sm hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Đến Giao Diện HLV</span>
            </Link>
          )}
        </div>
      </div>

      {/* Success notification banner */}
      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-900 shadow-soft animate-fade-in">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Profile Card + Right Interactive Editor */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Summary Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-200/80 text-center space-y-4">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-primary/10 text-brand-primary font-black text-4xl shadow-inner">
              {currentUser?.role === "ADMIN" ? "👑" : "♞"}
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-primary text-white text-xs font-bold shadow-md">
                ✓
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-900">{name || currentUser?.name}</h2>
              </div>
              <p className="mt-1 text-xs font-bold text-brand-primary">
                {title || currentUser?.title || "Huấn Luyện Viên Quốc Gia"}
              </p>
              <p className="mt-0.5 text-xs font-mono text-slate-500">{email || currentUser?.email}</p>
            </div>

            {/* Role & Admin Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {currentUser?.systemRole === "CHUNHIEM" && (
                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-black text-purple-800 border border-purple-200">
                  👑 Chủ nhiệm CLB
                </span>
              )}
              {currentUser?.systemRole === "PHOCHUNHIEM" && (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black text-blue-800 border border-blue-200">
                  🛡️ Phó chủ nhiệm
                </span>
              )}
              {currentUser?.systemRole === "CHUCOSO" && (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-black text-blue-800 border border-blue-200">
                  🏢 Chủ Cơ Sở
                </span>
              )}
              {hasAdminAccess ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Quyền Admin
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
                  HLV Tiêu Chuẩn
                </span>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 text-center">
                <p className="text-[10px] font-semibold text-slate-400">Lớp Phụ Trách</p>
                <p className="mt-0.5 text-base font-black text-slate-900">{coachClasses.length} lớp</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 text-center">
                <p className="text-[10px] font-semibold text-slate-400">Hệ Số Elo</p>
                <p className="mt-0.5 text-base font-black text-brand-primary">{elo || 2000}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50/60 p-3 border border-emerald-100 text-center">
                <p className="text-[10px] font-semibold text-emerald-700">Mức Học Phí</p>
                <p className="mt-0.5 text-base font-black text-brand-primary">
                  {currentUser?.tuitionRatePercent ?? 50}%
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50/60 p-3 border border-amber-100 text-center">
                <p className="text-[10px] font-semibold text-amber-700">Mức Tiền Sách</p>
                <p className="mt-0.5 text-base font-black text-amber-700">
                  {currentUser?.bookRatePercent ?? 30}%
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tab Selector */}
          <div className="rounded-3xl bg-white p-2.5 shadow-soft border border-slate-200/80 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab("PROFILE")}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all ${
                activeTab === "PROFILE"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="h-4 w-4" />
                <span>Thông Tin Cá Nhân</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("BANK")}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all ${
                activeTab === "BANK"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-4 w-4" />
                <span>Tài Khoản Ngân Hàng</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("BRANCHES")}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all ${
                activeTab === "BRANCHES"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4" />
                <span>Cơ Sở Phụ Trách</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-70" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ADMIN")}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition-all ${
                activeTab === "ADMIN"
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4" />
                <span>Quyền Quản Trị (Admin)</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-70" />
            </button>
          </div>
        </div>

        {/* Right Column: Full Editor Form (8 cols) */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* TAB 1: Thông Tin Cá Nhân */}
            {activeTab === "PROFILE" && (
              <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-200/80 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900">Thông Tin Cá Nhân & Chuyên Môn</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cập nhật họ tên, chức danh, thành tích thi đấu và thông tin liên hệ của bạn.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700">Họ và tên HLV *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: HLV Trần Huyền Trang"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-semibold text-slate-900 focus:border-brand-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Số điện thoại liên hệ *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="VD: 0983.112.233"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-mono font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700">Danh hiệu chuyên môn cờ vua</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VD: HLV Quốc gia, Đại Kiện Tướng"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-semibold text-slate-900 focus:border-brand-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Hệ số Elo cờ vua</label>
                    <input
                      type="number"
                      value={elo}
                      onChange={(e) => setElo(Number(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-mono font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="font-bold text-slate-700">Email đăng nhập tài khoản (Cố định)</label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-slate-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Email dùng để đăng nhập hệ thống và đồng bộ cơ sở dữ liệu CLB.
                  </p>
                </div>

                <div className="text-xs">
                  <label className="font-bold text-slate-700">Kinh nghiệm & Thành tích thi đấu</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="VD: 8 năm kinh nghiệm đào tạo trẻ, HCV Vô địch Cờ vua Trẻ Toàn Quốc"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="text-xs">
                  <label className="font-bold text-slate-700">Giới thiệu bản thân & Triết lý huấn luyện</label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Chia sẻ về phong cách sư phạm, tình yêu cờ vua và định hướng đào tạo học viên..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Tài Khoản Ngân Hàng */}
            {activeTab === "BANK" && (
              <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-200/80 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900">Tài Khoản Ngân Hàng & Thù Lao</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Thông tin số tài khoản dùng để nhận học phí, thù lao ca dạy và tạo mã VietQR tự động.
                  </p>
                </div>

                <div className="text-xs">
                  <label className="font-bold text-slate-700">Ngân hàng nhận thù lao</label>
                  <select
                    value={bankId}
                    onChange={(e) => handleBankSelect(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-bold text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                  >
                    {SUPPORTED_BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.shortName} – {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700">Số tài khoản ngân hàng</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="VD: 04092004369"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-mono font-black text-slate-900 focus:border-brand-primary focus:outline-none text-base"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Tên chủ tài khoản (Viết hoa không dấu)</label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                      placeholder="VD: TRAN HUYEN TRANG"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 font-mono uppercase font-black text-slate-900 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <span>Mức % Chia Sẻ Lương Của Huấn Luyện Viên:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-white p-3 border border-emerald-100">
                      <p className="text-[11px] text-slate-500 font-medium">Tỷ lệ % Học phí</p>
                      <p className="text-xl font-black text-brand-primary">
                        {currentUser?.tuitionRatePercent ?? 50}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-emerald-100">
                      <p className="text-[11px] text-slate-500 font-medium">Tỷ lệ % Tiền sách</p>
                      <p className="text-xl font-black text-amber-700">
                        {currentUser?.bookRatePercent ?? 30}%
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    💡 Mức thù lao % do Ban Chủ Nhiệm CLB phê duyệt theo biểu lương chuyên môn.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Cơ Sở Phụ Trách */}
            {activeTab === "BRANCHES" && (
              <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-200/80 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900">Cơ Sở Công Tác & Quản Lý</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Danh sách các cơ sở bạn được phân công làm Chủ nhiệm và các cơ sở bạn trực tiếp tham gia giảng dạy.
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>Quy chế Phân bổ & Chủ nhiệm Cơ sở CLB:</span>
                  </div>
                  <p className="mt-1.5 text-xs text-blue-800 leading-relaxed">
                    • <strong>1 HLV có thể chủ nhiệm nhiều cơ sở:</strong> Chủ nhiệm cơ sở quản lý số liệu, học viên và bảng lương của các lớp HLV khác dạy tại cơ sở của mình.<br />
                    • <strong>1 HLV bình thường có thể dạy tại nhiều cơ sở:</strong> Không giới hạn cơ sở giảng dạy, HLV có thể mở lớp và nhận ca dạy ở bất kỳ cơ sở nào trong hệ thống.
                  </p>
                </div>

                {currentUser?.systemRole === "CHUCOSO" && (
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-2.5">
                    <h4 className="font-bold text-purple-900 text-xs flex items-center gap-2">
                      👑 Cơ sở bạn đang làm Chủ nhiệm ({managedBranchIds.length} cơ sở):
                    </h4>
                    <div className="space-y-2">
                      {dataStore.branches
                        .filter((b) => managedBranchIds.includes(b.id))
                        .map((b) => (
                          <div key={b.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 border border-purple-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold">
                                🏢
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-xs">{b.name}</p>
                                <p className="text-[11px] text-slate-500">{b.address}</p>
                              </div>
                            </div>
                            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-800">
                              Chủ nhiệm
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 text-xs">
                  <h4 className="font-bold text-slate-900">🏢 Danh sách toàn bộ các cơ sở CLB Kiện Tướng Tương Lai:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {dataStore.branches.map((b) => {
                      const isManaged = managedBranchIds.includes(b.id) && currentUser?.systemRole === "CHUCOSO";
                      return (
                        <div key={b.id} className="rounded-2xl bg-slate-50 p-3 border border-slate-200/80 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-slate-900 text-xs truncate">{b.name}</p>
                            {isManaged && (
                              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 flex-shrink-0">
                                Chủ nhiệm
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{b.address}</p>
                          <p className="text-[10px] font-mono text-brand-primary">{b.phone}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Quyền Quản Trị (Admin) */}
            {activeTab === "ADMIN" && (
              <div className="rounded-3xl bg-white p-6 shadow-soft border border-slate-200/80 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900">Phân Quyền Quản Trị Hệ Thống (Admin)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quản lý quyền truy cập các tính năng quản trị cơ sở, phân công nhiệm vụ và bảng lương toàn CLB.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl font-black text-lg ${
                        hasAdminAccess ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">Trạng Thái Quyền Quản Trị</p>
                        <p className="text-xs text-slate-500">
                          {hasAdminAccess
                            ? "Tài khoản của bạn đã có toàn quyền truy cập khu vực Quản trị CLB."
                            : "Tài khoản của bạn hiện ở chế độ Huấn luyện viên thông thường."}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${
                      hasAdminAccess ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                    }`}>
                      {hasAdminAccess ? "Đã Kích Hoạt" : "Chưa Cấp Quyền"}
                    </span>
                  </div>

                  {hasAdminAccess ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                      <p className="text-xs font-black text-emerald-950 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        Bạn đang có quyền truy cập Trang Quản Trị CLB!
                      </p>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Bạn có thể chuyển đổi sang giao diện Quản Trị bất cứ lúc nào từ thanh Header trên đầu trang hoặc bấm nút dưới đây.
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <Link
                          href="/admin/coaches"
                          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-md"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Đến Trang Quản Trị Ngay</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <KeyRound className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-amber-950">Nhận quyền Quản trị CLB (Admin)</p>
                          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                            Nếu bạn được Ban Chủ Nhiệm ủy quyền hoặc có mật mã quản trị viên của CLB, vui lòng nhập mã bảo mật để kích hoạt quyền Admin ngay tức thì.
                          </p>
                        </div>
                      </div>

                      {!showAdminKeyInput ? (
                        <button
                          type="button"
                          onClick={() => setShowAdminKeyInput(true)}
                          className="rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-primary-hover transition-all shadow-md flex items-center gap-2"
                        >
                          <KeyRound className="h-4 w-4" />
                          <span>Kích Hoạt / Nhận Quyền Admin</span>
                        </button>
                      ) : (
                        <div className="space-y-2 pt-1 max-w-md">
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={adminKey}
                              onChange={(e) => {
                                setAdminKey(e.target.value);
                                setAdminKeyError("");
                              }}
                              placeholder="Nhập mã bảo mật quản trị (mặc định: admin123)..."
                              className="flex-1 rounded-xl border border-amber-300 bg-white p-2.5 text-xs font-mono focus:border-brand-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={handleClaimAdmin}
                              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-sm flex-shrink-0"
                            >
                              Xác Nhận
                            </button>
                          </div>
                          {adminKeyError && (
                            <p className="text-xs font-bold text-rose-600">{adminKeyError}</p>
                          )}
                          <p className="text-[11px] text-slate-500">
                            💡 Mã xác nhận quản trị mặc định của hệ thống: <code>admin123</code>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Save Action Bar */}
            <div className="sticky bottom-6 rounded-2xl bg-white/95 p-4 shadow-card border border-slate-200/90 backdrop-blur-md flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Lưu Thông Tin Hồ Sơ</p>
                <p className="text-[11px] text-slate-500">Thông tin được cập nhật và lưu trữ an toàn trong cơ sở dữ liệu.</p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-2.5 text-xs font-black text-white shadow-md shadow-brand-primary/25 hover:bg-brand-primary-hover active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Đang lưu..." : "Lưu Thay Đổi Hồ Sơ"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
