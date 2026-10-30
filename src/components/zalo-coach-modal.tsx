"use client";

import React, { useState } from "react";
import {
  X,
  Send,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Image as ImageIcon,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Phone,
  BookOpen,
  DollarSign,
  Users,
} from "lucide-react";
import { dataStore, getCoachClasses } from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

interface ZaloCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: number;
  year: number;
}

export default function ZaloCoachModal({
  isOpen,
  onClose,
  month,
  year,
}: ZaloCoachModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Lấy danh sách HLV
  const coaches = dataStore.users.filter((u) => u.role === "COACH");

  // Xây dựng dữ liệu lớp & học phí cho từng HLV
  const coachDataList = coaches.map((coach) => {
    const coachClasses = getCoachClasses(coach.id, coach.email).filter(
      (c) => c.isActive
    );

    const cleanPhone = coach.phone ? coach.phone.replace(/[^0-9]/g, "") : "";

    const classesInfo = coachClasses.map((cls) => {
      const branch = dataStore.branches.find((b) => b.id === cls.branchId);
      const invoices = dataStore.invoices.filter(
        (inv) => inv.classId === cls.id && inv.month === month && inv.year === year
      );

      const totalAmount = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const students = invoices.map((inv) => {
        const student = dataStore.students.find((s) => s.id === inv.studentId);
        return {
          code: student?.code || "HS",
          name: student?.fullName || "Học viên",
          presentCount: inv.presentCount,
          totalAmount: inv.totalAmount,
          status: inv.status,
        };
      });

      return {
        id: cls.id,
        name: cls.name,
        branchName: branch?.name || "Cơ sở CLB",
        studentCount: students.length,
        totalAmount,
        students,
      };
    });

    const totalStudents = classesInfo.reduce((sum, c) => sum + c.studentCount, 0);
    const totalTuition = classesInfo.reduce((sum, c) => sum + c.totalAmount, 0);

    // Tạo nội dung tin nhắn Zalo chuẩn
    const lines = [
      `🥋 [KTTLL] BẢNG TỔNG HỢP HỌC PHÍ THÁNG ${month}/${year}`,
      `Kính gửi Thầy/Cô: ${coach.name}`,
      `CLB Cờ vua Kiện Tướng Tương Lai gửi Thầy/Cô bảng tổng hợp học phí các lớp Thầy/Cô đang phụ trách:\n`,
    ];

    classesInfo.forEach((cls, idx) => {
      lines.push(`📚 ${idx + 1}. ${cls.name} (${cls.branchName})`);
      lines.push(`- Sĩ số: ${cls.studentCount} học viên | Tổng học phí: ${cls.totalAmount.toLocaleString("vi-VN")} đ`);
      cls.students.forEach((st) => {
        const statusText = st.status === "PAID" ? "✅ Đã đóng" : "⏳ Chờ thu";
        lines.push(`  • ${st.code} - ${st.name}: ${st.presentCount} buổi = ${st.totalAmount.toLocaleString("vi-VN")} đ (${statusText})`);
      });
      lines.push("");
    });

    lines.push(`📊 TỔNG CỘNG: ${classesInfo.length} lớp | ${totalStudents} học viên | Tổng học phí: ${totalTuition.toLocaleString("vi-VN")} VNĐ`);
    lines.push(`\n📎 CLB gửi kèm đầy đủ file ảnh Thẻ Báo Học Phí (có sẵn mã VietQR của từng học viên) ngay bên dưới để Thầy/Cô chuyển tiếp cho phụ huynh hoặc theo dõi đối soát.`);
    lines.push(`Mọi thắc mắc về số buổi học, Thầy/Cô vui lòng phản hồi lại với Ban Quản Trị CLB. Trân trọng cảm ơn Thầy/Cô! 🙏`);

    const summaryText = lines.join("\n");

    return {
      coach,
      cleanPhone,
      classes: classesInfo,
      totalClasses: classesInfo.length,
      totalStudents,
      totalTuition,
      summaryText,
    };
  });

  const handleCopyText = (coachId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(coachId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-brand-primary px-5 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-white/20">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Gửi Học Phí Đến Huấn Luyện Viên (Zalo)</h2>
              <p className="text-[11px] text-emerald-100">
                Tháng {month}/{year} • Tự động phân loại theo từng HLV phụ trách & thẻ VietQR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
          {/* CLI Automation Banner */}
          <div className="rounded bg-slate-900 p-3.5 text-white shadow-xs border border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Tool Tự Động Bắn Tin Nhắn Zalo Cá Nhân (Puppeteer)
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Tool tự động mở Zalo Web cá nhân, tìm từng HLV theo số điện thoại, gửi bảng tổng hợp và đính kèm bộ ảnh thẻ học phí VietQR.
                </p>
              </div>
              <span className="shrink-0 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                npm run zalo:send
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                <span className="text-slate-500">$</span> npm run zalo:preview
                <span className="text-slate-500 text-[10px] ml-1">(Chạy thử xem trước)</span>
              </div>
              <div className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                <span className="text-slate-500">$</span> npm run zalo:send
                <span className="text-slate-500 text-[10px] ml-1">(Gửi tự động thật)</span>
              </div>
            </div>
          </div>

          {/* Coach List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              Danh Sách Huấn Luyện Viên ({coachDataList.length} HLV)
            </h3>

            {coachDataList.map((item) => {
              const isExpanded = expandedCoachId === item.coach.id;
              const isCopied = copiedId === item.coach.id;

              return (
                <div
                  key={item.coach.id}
                  className="rounded border border-slate-200/90 bg-white shadow-xs transition-all overflow-hidden"
                >
                  {/* Coach Card Header */}
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-emerald-100 text-emerald-700 font-bold text-sm">
                        {item.coach.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-slate-900 text-sm">{item.coach.name}</h4>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            {item.coach.title || "HLV"}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {item.coach.phone}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3 text-slate-400" />
                            {item.totalClasses} lớp ({item.totalStudents} học sinh)
                          </span>
                          <span>•</span>
                          <span className="font-bold text-emerald-600">
                            Tổng học phí: {formatCurrencyVND(item.totalTuition)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleCopyText(item.coach.id, item.summaryText)}
                        className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-all shadow-xs ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                        }`}
                        title="Sao chép toàn bộ tin nhắn để dán vào Zalo"
                      >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{isCopied ? "Đã chép!" : "Copy tin nhắn"}</span>
                      </button>

                      <a
                        href={`https://zalo.me/${item.cleanPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition-all"
                        title="Mở cuộc trò chuyện Zalo cá nhân"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Mở Zalo</span>
                      </a>

                      <button
                        onClick={() => setExpandedCoachId(isExpanded ? null : item.coach.id)}
                        className="flex items-center justify-center rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
                        title="Xem chi tiết các lớp & nội dung tin nhắn"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 space-y-3 bg-white">
                      {/* Classes Breakdown */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Danh sách lớp phụ trách:
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {item.classes.map((cls) => (
                            <div
                              key={cls.id}
                              className="rounded border border-slate-200/70 bg-slate-50/50 p-2.5 text-xs"
                            >
                              <div className="flex items-start justify-between">
                                <span className="font-semibold text-slate-900">{cls.name}</span>
                                <span className="font-bold text-emerald-600">
                                  {formatCurrencyVND(cls.totalAmount)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-500">{cls.branchName}</p>
                              <p className="mt-0.5 text-[11px] text-slate-600">
                                Sĩ số: <strong>{cls.studentCount}</strong> học viên
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Preview Message */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Nội dung tin nhắn Zalo gửi Thầy/Cô:
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Đã chuẩn hóa định dạng & emoji
                          </span>
                        </div>
                        <pre className="max-h-48 overflow-y-auto rounded bg-slate-900 p-3 text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed border border-slate-800">
                          {item.summaryText}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Các thẻ học phí dạng ảnh (.png) có mã VietQR đã được tự động lưu trong thư mục{" "}
            <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">
              /invoices_output
            </code>
          </p>
          <button
            onClick={onClose}
            className="rounded bg-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
