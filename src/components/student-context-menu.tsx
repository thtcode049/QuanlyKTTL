"use client";

import React, { useEffect, useRef } from "react";
import {
  User,
  Edit2,
  Camera,
  DollarSign,
  Phone,
  Copy,
  Trash2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { StudentData } from "@/lib/data-store";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface StudentContextMenuProps {
  student: StudentData | null;
  position: ContextMenuPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (student: StudentData) => void;
  onStartInlineEdit: (student: StudentData) => void;
  onChangeAvatar: (student: StudentData) => void;
  onSetCustomFee: (student: StudentData) => void;
  onRemoveFromClass: (student: StudentData) => void;
}

export const StudentContextMenu: React.FC<StudentContextMenuProps> = ({
  student,
  position,
  isOpen,
  onClose,
  onViewProfile,
  onStartInlineEdit,
  onChangeAvatar,
  onSetCustomFee,
  onRemoveFromClass,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !student || !position) return null;

  // Ensure menu stays within screen boundaries
  const menuWidth = 220;
  const menuHeight = 270;
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  let left = position.x;
  let top = position.y;

  if (left + menuWidth > windowWidth) {
    left = windowWidth - menuWidth - 12;
  }
  if (top + menuHeight > windowHeight) {
    top = windowHeight - menuHeight - 12;
  }

  const handleCopyPhone = () => {
    if (student.parentPhone) {
      navigator.clipboard.writeText(student.parentPhone);
      alert(`Đã sao chép SĐT: ${student.parentPhone}`);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-56 rounded-2xl bg-white/95 p-1.5 shadow-2xl ring-1 ring-black/10 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Menu Header with Student Name */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary text-xs font-bold">
          ♞
        </div>
        <div className="overflow-hidden">
          <p className="truncate text-xs font-extrabold text-slate-900">{student.fullName}</p>
          <p className="text-[10px] font-mono text-slate-500">{student.code} • {student.parentPhone}</p>
        </div>
      </div>

      <div className="py-1 text-xs">
        {/* 1. Xem hồ sơ */}
        <button
          onClick={() => {
            onViewProfile(student);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-emerald-50 hover:text-brand-primary transition-colors text-left"
        >
          <User className="h-4 w-4 text-brand-primary" />
          <span className="font-semibold">Xem hồ sơ học viên</span>
        </button>

        {/* 2. Sửa thông tin trực tiếp */}
        <button
          onClick={() => {
            onStartInlineEdit(student);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
        >
          <Edit2 className="h-4 w-4 text-blue-500" />
          <span className="font-semibold">Sửa thông tin nhanh</span>
        </button>

        {/* 3. Đổi ảnh đại diện */}
        <button
          onClick={() => {
            onChangeAvatar(student);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
        >
          <Camera className="h-4 w-4 text-purple-500" />
          <span className="font-semibold">Đổi ảnh đại diện</span>
        </button>

        {/* 4. Đặt học phí riêng */}
        <button
          onClick={() => {
            onSetCustomFee(student);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
        >
          <DollarSign className="h-4 w-4 text-amber-500" />
          <span className="font-semibold">Cài đặt học phí riêng</span>
        </button>

        <div className="my-1 border-t border-slate-100" />

        {/* 5. Gọi phụ huynh */}
        {student.parentPhone && (
          <a
            href={`tel:${student.parentPhone}`}
            onClick={onClose}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
          >
            <Phone className="h-4 w-4 text-emerald-600" />
            <span className="font-semibold">Gọi: {student.parentPhone}</span>
          </a>
        )}

        {/* 6. Sao chép số điện thoại */}
        <button
          onClick={handleCopyPhone}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-slate-700 hover:bg-slate-100 transition-colors text-left"
        >
          <Copy className="h-4 w-4 text-slate-400" />
          <span className="font-semibold">Sao chép số điện thoại</span>
        </button>

        <div className="my-1 border-t border-slate-100" />

        {/* 7. Xóa khỏi lớp */}
        <button
          onClick={() => {
            onRemoveFromClass(student);
            onClose();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-rose-600 hover:bg-rose-50 transition-colors text-left"
        >
          <Trash2 className="h-4 w-4 text-rose-500" />
          <span className="font-bold">Xóa học viên khỏi lớp</span>
        </button>
      </div>
    </div>
  );
};
