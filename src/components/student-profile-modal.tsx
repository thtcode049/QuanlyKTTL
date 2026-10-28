"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  Upload,
  Phone,
  Copy,
  Check,
  Award,
  Calendar,
  School,
  MapPin,
  Clock,
  DollarSign,
  Edit2,
  Save,
  User,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { StudentData, ClassroomData, dataStore } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import { CHESS_AVATARS, getStudentAvatarUrl } from "@/lib/chess-avatars";

// Tối ưu hóa nén ảnh từ camera/thư viện điện thoại tránh tràn bộ nhớ localStorage
const compressImage = (file: File, maxDim = 600, quality = 0.82): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Lỗi đọc file ảnh"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Lỗi tải file"));
    reader.readAsDataURL(file);
  });
};

interface StudentProfileModalProps {
  student: StudentData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedStudent: StudentData) => void;
  currentClass?: ClassroomData;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  onUpdate,
  currentClass,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Form states when editing
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState<number | string>(2018);
  const [gender, setGender] = useState<"Nam" | "Nữ" | "">("Nam");
  const [parentPhone, setParentPhone] = useState("");
  const [school, setSchool] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [customFee, setCustomFee] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");

  // Sync state whenever student changes or modal opens
  React.useEffect(() => {
    if (student) {
      setFullName(student.fullName || "");
      setBirthYear(student.birthYear ?? "");
      setGender(student.gender || "");
      setParentPhone(student.parentPhone || "");
      setSchool(student.school || "");
      setAddress(student.address || "");
      setNotes(student.notes || "");
      setCustomFee(student.customFeePerSession ? String(student.customFeePerSession) : "");
      setAvatar(student.avatar || "");
      setIsEditing(false);
      setShowAvatarPicker(false);
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const currentClassInfo =
    currentClass ||
    dataStore.classes.find((c) => student.classIds.includes(c.id)) ||
    dataStore.classes[0];

  const handleCopyPhone = () => {
    if (student.parentPhone) {
      navigator.clipboard.writeText(student.parentPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressedBase64 = await compressImage(file, 600, 0.82);
      setAvatar(compressedBase64);
      // Cập nhật ngay lập tức vào student
      const updated = await dataStore.updateStudent(student.id, { avatar: compressedBase64 });
      if (updated) onUpdate(updated);
      setShowAvatarPicker(false);
    } catch (err) {
      alert("Không thể xử lý ảnh này. Vui lòng thử lại với ảnh khác.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSelectPresetAvatar = async (dataUri: string) => {
    setAvatar(dataUri);
    setShowAvatarPicker(false);
    const updated = await dataStore.updateStudent(student.id, { avatar: dataUri });
    if (updated) onUpdate(updated);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData: Partial<StudentData> = {
      fullName: fullName.trim(),
      birthYear: birthYear !== "" ? Number(birthYear) : undefined,
      gender: (gender as "Nam" | "Nữ" | "") || undefined,
      parentName: "",
      parentPhone: parentPhone.trim(),
      currentLevel: currentClassInfo?.level || undefined,
      school: school.trim(),
      address: address.trim(),
      notes: notes.trim(),
      avatar,
      customFeePerSession: customFee.trim() ? Number(customFee) : undefined,
    };

    const updated = await dataStore.updateStudent(student.id, updatedData);
    if (updated) {
      onUpdate(updated);
      setIsEditing(false);
    }
  };

  const studentAvatar = avatar || getStudentAvatarUrl(student.avatar, student.fullName);
  const age = student.birthYear ? new Date().getFullYear() - student.birthYear : null;

  // Thống kê buổi học của học viên trong lớp hiện tại
  const sessionsOfClass = dataStore.sessions.filter((s) => s.classId === currentClassInfo?.id);
  const totalAttended = sessionsOfClass.reduce((cnt, s) => {
    const r = s.records.find((rec) => rec.studentId === student.id);
    return cnt + (r && r.status === "PRESENT" ? 1 : 0);
  }, 0);
  const evaluation = dataStore.evaluations.find((ev) => ev.studentId === student.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-transparent animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-slate-200 ring-1 ring-slate-900/10 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Cover Banner */}
        <div className="relative bg-gradient-to-r from-[#161616] via-[#1F332E] to-[#00B18A] p-6 text-white flex-shrink-0">
          {/* Subtle chess watermark */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Nút Đóng X lớn, dễ bấm trên cả điện thoại và máy tính */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hồ sơ"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 active:bg-black active:scale-90 transition-all shadow-xl border border-white/30 cursor-pointer touch-manipulation"
          >
            <X className="h-6 w-6 text-white stroke-[2.5]" />
          </button>

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Avatar container with photo upload button */}
            <div className="relative group">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden bg-white p-1 ring-4 ring-white/30 shadow-xl">
                <img
                  src={studentAvatar}
                  alt={student.fullName}
                  className="h-full w-full object-cover rounded-xl bg-slate-50"
                />
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl text-white">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                    <span className="text-[10px] font-bold mt-1">Đang lưu...</span>
                  </div>
                )}
              </div>

              {/* Upload & Choose preset button overlay */}
              <button
                type="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                title="Thay đổi ảnh học viên (Chụp ảnh / Thư viện)"
                className="absolute -bottom-2 -right-2 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-brand-primary text-white shadow-xl ring-2 ring-white hover:bg-brand-primary-hover active:scale-95 transition-all cursor-pointer"
              >
                <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Quick Profile Headline */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="rounded-lg bg-black/40 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-emerald-300 border border-emerald-500/30">
                  {student.code}
                </span>
                <span className="rounded-lg bg-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 border border-emerald-400/30 backdrop-blur-sm">
                  {currentClassInfo?.level || "Lớp cờ vua"}
                </span>
              </div>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                {student.fullName}
              </h2>

              <p className="mt-0.5 text-xs text-white/80">
                {student.birthYear ? `${student.birthYear} (${age} tuổi)` : "Năm sinh: —"} •{" "}
                {student.gender || "—"} • Lớp:{" "}
                <span className="font-bold text-white underline decoration-brand-primary">
                  {currentClassInfo?.name || "Chưa xếp lớp"}
                </span>
              </p>
            </div>

            {/* Edit Profile Toggle Button */}
            <div className="sm:self-center">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isEditing
                    ? "bg-amber-400 text-slate-900 shadow-md hover:bg-amber-300"
                    : "bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                }`}
              >
                {isEditing ? (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>Hủy Chỉnh Sửa</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Sửa Hồ Sơ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Input chụp ảnh trực tiếp từ camera điện thoại */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageSelected}
        />

        {/* Input chọn ảnh từ thư viện ảnh điện thoại / máy tính */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelected}
        />

        {/* Avatar Drawer Picker */}
        {showAvatarPicker && (
          <div className="bg-slate-900 text-white p-4 sm:p-5 border-b border-slate-800 animate-fade-in flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Đổi ảnh đại diện học viên
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarPicker(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Hai nút hành động: Chụp từ camera hoặc Chọn từ thư viện */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover active:scale-98 transition-all cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>Chụp Ảnh Trực Tiếp Từ Camera</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 active:scale-98 border border-white/15 transition-all cursor-pointer"
              >
                <ImageIcon className="h-4 w-4 text-emerald-400" />
                <span>Chọn Từ Thư Viện Ảnh</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">
              Hoặc chọn một trong các linh vật cờ vua có sẵn:
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CHESS_AVATARS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPresetAvatar(item.dataUri)}
                  className="group flex flex-col items-center rounded-xl bg-white/5 p-2 hover:bg-white/15 border border-white/10 transition-all hover:scale-105"
                >
                  <img
                    src={item.dataUri}
                    alt={item.name}
                    className="h-11 w-11 rounded-xl object-contain shadow-sm"
                  />
                  <span className="mt-1 text-[10px] font-bold text-slate-300 group-hover:text-white truncate">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {isEditing ? (
            /* Editing Form */
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/80 flex items-center gap-2 text-amber-800 font-medium">
                <Edit2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span>Chế độ chỉnh sửa hồ sơ học viên. Nhấn Lưu thay đổi để áp dụng ngay.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700">Họ và tên học viên *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700">Năm sinh</label>
                    <input
                      type="number"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="Để trống"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700">Giới tính</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as "Nam" | "Nữ" | "")}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none bg-white"
                    >
                      <option value="">-- Để trống --</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Số điện thoại phụ huynh (Không bắt buộc)</label>
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="VD: 0912.345.678 (không bắt buộc)"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Trường học</label>
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="VD: Tiểu học Kim Liên"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700">Địa chỉ nơi ở</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="VD: Bạch Mai, Hai Bà Trưng, HN"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700">
                    Đơn giá học phí riêng theo buổi (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={customFee}
                    onChange={(e) => setCustomFee(e.target.value)}
                    placeholder={`Để trống nếu áp dụng giá lớp (${formatCurrencyVND(currentClassInfo?.feePerSession || 150000)}/buổi)`}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none font-mono"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Dành cho học viên có học bổng, ưu đãi anh em hoặc kèm nâng cao đặc biệt.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700">Ghi chú của Huấn luyện viên</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tính cách, sở trường khai cuộc, lưu ý sức khỏe..."
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2.5 font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Lưu Hồ Sơ</span>
                </button>
              </div>
            </form>
          ) : (
            /* View Details */
            <>
              {/* Quick Highlight Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Số buổi đi học
                  </span>
                  <p className="text-xl font-black text-brand-primary mt-0.5">
                    {totalAttended} buổi
                  </p>
                  <span className="text-[10px] text-slate-500">Tháng 10/2026</span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Học phí / Buổi
                  </span>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {student.customFeePerSession
                      ? formatCurrencyVND(student.customFeePerSession)
                      : formatCurrencyVND(currentClassInfo?.feePerSession || 150000)}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    {student.customFeePerSession ? "Ưu đãi riêng" : "Tiêu chuẩn lớp"}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Trạng thái
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-700">Đang học</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Chuyên cần cao</span>
                </div>
              </div>

              {/* Information Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Family & Contact Card */}
                <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-soft space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User className="h-4 w-4 text-brand-primary" />
                    <h3 className="font-bold text-slate-900">Thông Tin Liên Hệ</h3>
                  </div>

                  <div className="space-y-2 text-slate-700">

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400">Số điện thoại:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-brand-primary">
                          {student.parentPhone}
                        </span>
                        <a
                          href={`tel:${student.parentPhone}`}
                          title="Gọi điện cho phụ huynh"
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyPhone}
                          title="Sao chép số điện thoại"
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          {copiedPhone ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-400">Trường học:</span>
                      <span className="font-medium text-slate-800">
                        {student.school || "Tiểu học tại Hà Nội"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Địa chỉ:</span>
                      <span className="font-medium text-slate-800 text-right max-w-[180px] truncate">
                        {student.address || "Hà Nội"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Class & Training Card */}
                <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-soft space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-brand-secondary" />
                      <h3 className="font-bold text-slate-900">Lớp Học & Cơ Sở Đào Tạo</h3>
                    </div>
                    {dataStore.classes.filter((c) => student.classIds?.includes(c.id)).length > 1 && (
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-brand-primary">
                        Học {dataStore.classes.filter((c) => student.classIds?.includes(c.id)).length} lớp
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 text-slate-700">
                    {dataStore.classes
                      .filter((c) => student.classIds?.includes(c.id))
                      .map((cls, idx) => {
                        const branch = dataStore.branches.find((b) => b.id === cls.branchId);
                        return (
                          <div
                            key={cls.id}
                            className={`p-2.5 rounded-xl ${
                              idx === 0 ? "bg-slate-50 border border-slate-200/60" : "bg-emerald-50/50 border border-emerald-200/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{cls.name}</span>
                              <span className="text-[10px] font-bold text-emerald-700">
                                {student.customFeePerSession
                                  ? formatCurrencyVND(student.customFeePerSession)
                                  : formatCurrencyVND(cls.feePerSession)}
                                /buổi
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                              <span>Lịch: {cls.schedule}</span>
                              <span className="font-medium">{branch?.name.split("–")[0]?.trim() || "Cơ sở CLB"}</span>
                            </div>
                          </div>
                        );
                      })}

                    {dataStore.classes.filter((c) => student.classIds?.includes(c.id)).length === 0 && (
                      <p className="text-xs text-slate-400 italic">Chưa xếp lớp học cụ thể</p>
                    )}

                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400">Quy tắc học phí:</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 text-[10px]">
                        Thực học - Thực trả (Buổi nào học lớp nào tính lớp đó)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Evaluation Progress (if any) */}
              {evaluation && (
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Đánh Giá Năng Lực Kỳ Thủ (Tháng {evaluation.month}/{evaluation.year})
                    </h4>
                    <span className="text-[10px] text-slate-500">HLV nhận xét chuyên môn</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200/70 text-center">
                      <span className="text-[10px] font-bold text-slate-400">Khai cuộc</span>
                      <p className="text-sm font-extrabold text-amber-500">
                        {"★".repeat(evaluation.opening)}
                        {"☆".repeat(5 - evaluation.opening)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200/70 text-center">
                      <span className="text-[10px] font-bold text-slate-400">Chiến thuật</span>
                      <p className="text-sm font-extrabold text-amber-500">
                        {"★".repeat(evaluation.tactics)}
                        {"☆".repeat(5 - evaluation.tactics)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200/70 text-center">
                      <span className="text-[10px] font-bold text-slate-400">Tính toán</span>
                      <p className="text-sm font-extrabold text-amber-500">
                        {"★".repeat(evaluation.calculation)}
                        {"☆".repeat(5 - evaluation.calculation)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200/70 text-center">
                      <span className="text-[10px] font-bold text-slate-400">Tàn cuộc</span>
                      <p className="text-sm font-extrabold text-amber-500">
                        {"★".repeat(evaluation.endgame)}
                        {"☆".repeat(5 - evaluation.endgame)}
                      </p>
                    </div>
                  </div>

                  {evaluation.generalNote && (
                    <div className="rounded-xl bg-white p-3 border border-slate-200/70 text-xs italic text-slate-600">
                      "{evaluation.generalNote}"
                    </div>
                  )}
                </div>
              )}

              {/* Notes from Coach */}
              <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-200/60">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                  Ghi chú của HLV về học viên
                </span>
                <p className="mt-1 text-xs text-amber-950 font-medium">
                  {student.notes || "Học viên ngoan, nắm bài tốt, đi học đều đặn."}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 flex-shrink-0">
          <span className="text-[11px] text-slate-400 font-medium">
            Hồ sơ lưu trữ tại CLB Kiện Tướng Tương Lai
          </span>
          <span className="text-[11px] font-mono text-slate-400 font-semibold">
            {student.code}
          </span>
        </div>
      </div>
    </div>
  );
};
