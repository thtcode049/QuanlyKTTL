"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  Calendar,
  Building2,
  Send,
  Star,
  FileText,
  ExternalLink,
  Sparkles,
  X,
  Check,
  TrendingUp,
} from "lucide-react";
import {
  dataStore,
  TaskData,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  resolveCanonicalCoachId,
} from "@/lib/data-store";
import confetti from "canvas-confetti";

export default function CoachTasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Reporting Modal
  const [reportingTask, setReportingTask] = useState<TaskData | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [reportAttachments, setReportAttachments] = useState("");

  const refreshTasks = (userObj?: any) => {
    const u = userObj || currentUser;
    if (u) {
      const coachTasks = dataStore.getCoachTasks(u.id, u.email);
      setTasks([...coachTasks]);
    }
  };

  useEffect(() => {
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
        refreshTasks(merged);
      } catch (e) {}
    }
  }, []);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIVE") return t.status === "PENDING" || t.status === "IN_PROGRESS" || t.status === "REJECTED";
    if (statusFilter === "PENDING_REVIEW") return t.status === "COMPLETED_PENDING_REVIEW";
    if (statusFilter === "APPROVED") return t.status === "APPROVED";
    return true;
  });

  // KPI Calculations
  const approvedTasks = tasks.filter((t) => t.status === "APPROVED");
  const pendingReviewTasks = tasks.filter((t) => t.status === "COMPLETED_PENDING_REVIEW");
  const activeTasks = tasks.filter(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS" || t.status === "REJECTED"
  );
  const totalKpiPoints = approvedTasks.reduce((sum, t) => sum + (t.kpiPoints || 0), 0);
  const completionRate = tasks.length > 0 ? Math.round((approvedTasks.length / tasks.length) * 100) : 0;

  const handleOpenReportModal = (task: TaskData) => {
    setReportingTask(task);
    setReportNote(task.reportNote || "");
    setReportAttachments(task.reportAttachments || "");
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingTask || !reportNote.trim()) return;

    dataStore.submitTaskReport(reportingTask.id, reportNote.trim(), reportAttachments.trim());

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {}

    setReportingTask(null);
    setReportNote("");
    setReportAttachments("");
    refreshTasks();
  };

  const getCategoryLabel = (cat: TaskCategory) => {
    switch (cat) {
      case "CHUYEN_MON":
        return { label: "Chuyên môn cờ vua", color: "bg-blue-100 text-blue-800" };
      case "GIAO_AN":
        return { label: "Soạn giáo trình/đề thi", color: "bg-purple-100 text-purple-800" };
      case "TUYEN_SINH":
        return { label: "Tuyển sinh & Phụ huynh", color: "bg-emerald-100 text-emerald-800" };
      case "SU_KIEN":
        return { label: "Giải đấu & Sự kiện", color: "bg-amber-100 text-amber-800" };
      case "CO_SO":
        return { label: "Vận hành cơ sở", color: "bg-cyan-100 text-cyan-800" };
      default:
        return { label: "Khác", color: "bg-slate-100 text-slate-800" };
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "URGENT":
        return <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">Khẩn cấp</span>;
      case "HIGH":
        return <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">Ưu tiên cao</span>;
      case "MEDIUM":
        return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Bình thường</span>;
      default:
        return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Thấp</span>;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Đã hoàn thành</span>
          </span>
        );
      case "COMPLETED_PENDING_REVIEW":
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 animate-pulse">
            <Clock className="h-3.5 w-3.5" />
            <span>Đã báo cáo • Chờ duyệt</span>
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
            <Clock className="h-3.5 w-3.5" />
            <span>Đang thực hiện</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Yêu cầu làm lại</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <Clock className="h-3.5 w-3.5" />
            <span>Chờ thực hiện</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
          Nhiệm Vụ & Điểm KPI Của Tôi
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Xem nhiệm vụ được Ban Chủ Nhiệm giao, gửi báo cáo kết quả và theo dõi điểm thi đua KPI cá nhân.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI Points */}
        <div className="rounded-2xl border border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-soft text-white">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-semibold">Điểm KPI Tích Lũy</span>
            <Award className="h-4 w-4 text-brand-secondary" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-brand-secondary">
            {totalKpiPoints} <span className="text-xs font-medium text-slate-300">Điểm</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-300">Từ các nhiệm vụ đã được duyệt</p>
        </div>

        {/* Active Tasks */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-semibold">Nhiệm Vụ Cần Làm</span>
            <ClipboardList className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{activeTasks.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">Đang trong hạn hoàn thành</p>
        </div>

        {/* Pending Review */}
        <div className={`rounded-2xl border p-4 shadow-soft ${
          pendingReviewTasks.length > 0 ? "border-amber-300 bg-amber-50/70" : "border-slate-200/80 bg-white"
        }`}>
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold">Chờ Quản Lý Duyệt</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-900">{pendingReviewTasks.length}</p>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">Đã gửi báo cáo kết quả</p>
        </div>

        {/* Approved Tasks */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold">Đã Hoàn Thành</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-700">{approvedTasks.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Tỷ lệ đạt: <span className="font-bold text-emerald-600">{completionRate}%</span>
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === "ALL"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Tất cả ({tasks.length})
        </button>

        <button
          onClick={() => setStatusFilter("ACTIVE")}
          className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === "ACTIVE"
              ? "bg-brand-primary text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Cần làm ({activeTasks.length})
        </button>

        <button
          onClick={() => setStatusFilter("PENDING_REVIEW")}
          className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === "PENDING_REVIEW"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Chờ duyệt ({pendingReviewTasks.length})
        </button>

        <button
          onClick={() => setStatusFilter("APPROVED")}
          className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === "APPROVED"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Đã duyệt hoàn thành ({approvedTasks.length})
        </button>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-soft">
          <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-800">Chưa có nhiệm vụ nào</h3>
          <p className="mt-1 text-xs text-slate-400">
            Các nhiệm vụ mới được Ban Chủ Nhiệm giao sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const branch = dataStore.branches.find((b) => b.id === task.branchId);
            const catInfo = getCategoryLabel(task.category);
            const isDueSoon = new Date(task.dueDate + "T23:59:59") <= new Date(Date.now() + 2 * 24 * 3600 * 1000);

            return (
              <div
                key={task.id}
                className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-soft transition-all ${
                  task.status === "COMPLETED_PENDING_REVIEW"
                    ? "border-amber-300 ring-2 ring-amber-100"
                    : task.status === "REJECTED"
                    ? "border-rose-300 bg-rose-50/20"
                    : "border-slate-200/80"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${catInfo.color}`}>
                        {catInfo.label}
                      </span>
                      {getPriorityBadge(task.priority)}
                      <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                        <span>+{task.kpiPoints} Điểm KPI</span>
                      </span>
                      {getStatusBadge(task.status)}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>Hạn nộp:</span>
                        <span className={`font-bold ${isDueSoon && task.status !== "APPROVED" ? "text-rose-600" : "text-slate-800"}`}>
                          {task.dueDate} {isDueSoon && task.status !== "APPROVED" ? "(Sắp đến hạn)" : ""}
                        </span>
                      </div>

                      {branch && (
                        <div className="flex items-center gap-1.5 font-medium">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{branch.name.split("–")[0].trim()}</span>
                        </div>
                      )}

                      <span className="text-[11px] text-slate-400">
                        Giao bởi: {task.creatorName || "Ban Chủ Nhiệm CLB"}
                      </span>
                    </div>

                    {/* Status Info / Báo cáo hiện tại */}
                    {task.status === "COMPLETED_PENDING_REVIEW" && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs">
                        <p className="font-bold text-amber-900 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Bạn đã gửi báo cáo kết quả ({task.submittedAt ? new Date(task.submittedAt).toLocaleDateString("vi-VN") : "Gần đây"}):</span>
                        </p>
                        <p className="mt-1 text-slate-800 font-medium">{task.reportNote}</p>
                        {task.reportAttachments && (
                          <p className="mt-1 text-brand-primary underline truncate">
                            Minh chứng: {task.reportAttachments}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-amber-700">
                          Ban Quản Lý đang kiểm tra và sẽ duyệt cộng điểm KPI cho bạn sớm nhất.
                        </p>
                      </div>
                    )}

                    {task.status === "APPROVED" && (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs">
                        <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Nhiệm vụ đã được duyệt thành công (+{task.kpiPoints} Điểm KPI)!</span>
                        </p>
                        {task.reviewFeedback && (
                          <p className="mt-1 text-slate-700 font-medium">
                            Nhận xét từ Quản lý: "{task.reviewFeedback}"
                          </p>
                        )}
                      </div>
                    )}

                    {task.status === "REJECTED" && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs">
                        <p className="font-bold text-rose-900 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Yêu cầu bổ sung / làm lại từ Quản lý:</span>
                        </p>
                        <p className="mt-1 text-rose-800 font-medium">
                          "{task.reviewFeedback || "Chưa đạt yêu cầu, vui lòng cập nhật lại báo cáo kết quả."}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Button */}
                  <div className="flex-shrink-0 self-end sm:self-center">
                    {(task.status === "PENDING" || task.status === "IN_PROGRESS" || task.status === "REJECTED") && (
                      <button
                        onClick={() => handleOpenReportModal(task)}
                        className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover transition-all cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Báo Cáo Đã Hoàn Thành</span>
                      </button>
                    )}

                    {task.status === "COMPLETED_PENDING_REVIEW" && (
                      <button
                        onClick={() => handleOpenReportModal(task)}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors"
                      >
                        <span>Chỉnh Sửa Báo Cáo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Báo Cáo Hoàn Thành */}
      {reportingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                  <Send className="h-5 w-5" />
                </div>
                <h3 className="text-base font-black text-slate-900">Báo Cáo Hoàn Thành Nhiệm Vụ</h3>
              </div>
              <button
                onClick={() => setReportingTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="mt-4 space-y-3.5 text-xs">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Nhiệm vụ</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{reportingTask.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hạn nộp: <b>{reportingTask.dueDate}</b> • Phần thưởng:{" "}
                  <b className="text-emerald-700">+{reportingTask.kpiPoints} Điểm KPI</b>
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700">
                  Nội Dung Báo Cáo Kết Quả Thực Hiện *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ghi chi tiết kết quả bạn đã làm được (số lượng học viên tham gia, nội dung giáo án hoàn thành, tài liệu đã chuẩn bị, kết quả tổ chức...)"
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">
                  Link / Minh Chứng Kết Quả (Google Drive, Ảnh, File, Gallery...)
                </label>
                <input
                  type="text"
                  placeholder="VD: https://drive.google.com/drive/folders/... hoặc link tài liệu"
                  value={reportAttachments}
                  onChange={(e) => setReportAttachments(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-medium text-slate-900 focus:border-brand-primary focus:bg-white focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
                💡 Sau khi bấm gửi báo cáo, Quản lý sẽ nhận được thông báo ngay lập tức để kiểm tra và duyệt cộng <b>+{reportingTask.kpiPoints} điểm KPI</b> vào bảng xếp hạng của bạn.
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReportingTask(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary-hover"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Nộp Báo Cáo Ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
