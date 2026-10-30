"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  Calendar,
  Building2,
  User,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Flame,
  Check,
  X,
  Sparkles,
  Edit2,
  Trash2,
  Send,
  FileText,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  dataStore,
  TaskData,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  UserData,
  resolveCanonicalCoachId,
} from "@/lib/data-store";
import confetti from "canvas-confetti";

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [activeTab, setActiveTab] = useState<"tasks" | "kpi">("tasks");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [coachFilter, setCoachFilter] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create Task Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskCategory, setTaskCategory] = useState<TaskCategory>("CHUYEN_MON");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskKpi, setTaskKpi] = useState<number>(30);
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>("");
  const [taskBranchId, setTaskBranchId] = useState<string>("branch-1");

  // Review Modal
  const [reviewingTask, setReviewingTask] = useState<TaskData | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");

  const coaches = dataStore.users.filter((u) => u.role === "COACH");
  const branches = dataStore.branches;

  const refreshTasks = () => {
    setTasks([...dataStore.tasks]);
  };

  useEffect(() => {
    refreshTasks();
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

        // Nếu là Chủ cơ sở (CHUCOSO), tự động lọc theo cơ sở của mình
        if (merged.systemRole === "CHUCOSO" && merged.branchId) {
          setBranchFilter(merged.branchId);
          setTaskBranchId(merged.branchId);
        }
      } catch (e) {}
    }

    // Mặc định ngày dueDate là 7 ngày tới
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setTaskDueDate(nextWeek.toISOString().split("T")[0]);

    if (coaches.length > 0) {
      setTaskAssigneeId(coaches[0].id);
    }
  }, []);

  const isBranchManager = currentUser?.systemRole === "CHUCOSO";
  const userBranch = branches.find((b) => b.id === currentUser?.branchId);

  // Lọc nhiệm vụ
  const filteredTasks = tasks.filter((t) => {
    if (isBranchManager && currentUser?.branchId && t.branchId && t.branchId !== currentUser.branchId) {
      return false;
    }
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (coachFilter !== "ALL") {
      const canonicalCoach = resolveCanonicalCoachId(coachFilter);
      const canonicalTaskCoach = resolveCanonicalCoachId(t.assigneeId);
      if (t.assigneeId !== coachFilter && canonicalTaskCoach !== canonicalCoach) return false;
    }
    if (branchFilter !== "ALL" && t.branchId !== branchFilter) return false;
    if (categoryFilter !== "ALL" && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  // KPI stats
  const kpiData = dataStore.getKpiStats(isBranchManager ? currentUser?.branchId : branchFilter !== "ALL" ? branchFilter : undefined);

  // Top metric counters
  const totalTasksCount = filteredTasks.length;
  const pendingReviewCount = filteredTasks.filter((t) => t.status === "COMPLETED_PENDING_REVIEW").length;
  const approvedCount = filteredTasks.filter((t) => t.status === "APPROVED").length;
  const inProgressCount = filteredTasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "PENDING").length;
  const onTimeCount = filteredTasks.filter((t) => t.status === "APPROVED" && t.isCompletedOnTime !== false).length;
  const onTimeRate = approvedCount > 0 ? Math.round((onTimeCount / approvedCount) * 100) : 100;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskAssigneeId || !taskDueDate) return;

    dataStore.createTask({
      title: taskTitle,
      description: taskDesc,
      category: taskCategory,
      priority: taskPriority,
      status: "PENDING",
      kpiPoints: Number(taskKpi) || 20,
      dueDate: taskDueDate,
      branchId: taskBranchId,
      assigneeId: taskAssigneeId,
      creatorId: currentUser?.id || "user-admin",
      creatorName: currentUser?.name || "Ban Chủ Nhiệm CLB",
    });

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {}

    setIsCreateModalOpen(false);
    setTaskTitle("");
    setTaskDesc("");
    refreshTasks();
  };

  const handleReview = (approved: boolean) => {
    if (!reviewingTask) return;

    dataStore.reviewTask(reviewingTask.id, approved, reviewFeedback, currentUser?.id || "user-admin");

    if (approved) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }

    setReviewingTask(null);
    setReviewFeedback("");
    refreshTasks();
  };

  const handleDeleteTask = (taskId: string, title: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa nhiệm vụ "${title}" không?`)) {
      dataStore.deleteTask(taskId);
      refreshTasks();
    }
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
            <span>Chờ duyệt báo cáo</span>
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
            <span>Cần làm lại</span>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
              Nhiệm Vụ & Thống Kê KPI
            </h1>
            {isBranchManager && (
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                {userBranch?.name.split("–")[0].trim() || "Cơ sở của bạn"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isBranchManager
              ? `Quản lý nhiệm vụ và thống kê KPI cho các HLV phụ trách tại cơ sở: ${userBranch?.name}`
              : "Giao nhiệm vụ cho HLV, duyệt báo cáo hoàn thành và thống kê KPI minh bạch toàn CLB."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Giao Nhiệm Vụ Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tasks */}
        <div className="rounded border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tổng Nhiệm Vụ</span>
            <ClipboardList className="h-4 w-4 text-brand-primary" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">{totalTasksCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {inProgressCount} đang làm, {approvedCount} đã xong
          </p>
        </div>

        {/* Pending Review */}
        <div className={`rounded border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${
          pendingReviewCount > 0
            ? "border-amber-200 bg-amber-50/50"
            : "border-slate-100 bg-white"
        }`}>
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold">Chờ Duyệt Báo Cáo</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-amber-900 tracking-tight">{pendingReviewCount}</p>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">
            {pendingReviewCount > 0 ? "⚡ Cần quản lý xem & duyệt ngay" : "Không có báo cáo chờ duyệt"}
          </p>
        </div>

        {/* Approved Count */}
        <div className="rounded border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-medium">Đã Hoàn Thành</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-emerald-700 tracking-tight">{approvedCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Đúng hạn: <span className="font-semibold text-emerald-600">{onTimeRate}%</span>
          </p>
        </div>

        {/* Total KPI Points */}
        <div className="rounded border border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-medium">Tổng Điểm KPI Đạt Được</span>
            <Award className="h-4 w-4 text-brand-secondary" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-brand-secondary tracking-tight">
            {kpiData.overall.totalKpiPoints} <span className="text-xs font-medium text-slate-300">Điểm</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Tích lũy từ các task hoàn thành</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "tasks"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Danh Sách Nhiệm Vụ ({filteredTasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("kpi")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "kpi"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Bảng Xếp Hạng & Thống Kê KPI HLV</span>
        </button>
      </div>

      {activeTab === "tasks" ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 gap-2.5 rounded bg-white p-3 border border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề nhiệm vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="COMPLETED_PENDING_REVIEW">⚡ Chờ duyệt báo cáo</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="PENDING">Chờ làm</option>
                <option value="APPROVED">Đã hoàn thành</option>
                <option value="REJECTED">Cần làm lại</option>
              </select>
            </div>

            {/* Coach Filter */}
            <div>
              <select
                value={coachFilter}
                onChange={(e) => setCoachFilter(e.target.value)}
                className="w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả HLV</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Filter (Disabled if branch manager) */}
            <div>
              <select
                value={branchFilter}
                disabled={isBranchManager}
                onChange={(e) => setBranchFilter(e.target.value)}
                className={`w-full rounded border border-slate-200 p-1.5 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none cursor-pointer ${
                  isBranchManager ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white"
                }`}
              >
                <option value="ALL">Tất cả 8 cơ sở</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name.split("–")[0].trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded border border-slate-200 bg-white p-1.5 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả danh mục</option>
                <option value="CHUYEN_MON">Chuyên môn cờ vua</option>
                <option value="GIAO_AN">Soạn giáo án/đề thi</option>
                <option value="TUYEN_SINH">Tuyển sinh & Phụ huynh</option>
                <option value="SU_KIEN">Giải đấu & Sự kiện</option>
                <option value="CO_SO">Vận hành cơ sở</option>
                <option value="KHAC">Khác</option>
              </select>
            </div>
          </div>

          {/* Task Cards List */}
          {filteredTasks.length === 0 ? (
            <div className="rounded border border-slate-100 bg-white p-10 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-800">Không tìm thấy nhiệm vụ nào</h3>
              <p className="mt-1 text-xs text-slate-400">
                Hãy thử thay đổi bộ lọc hoặc bấm nút "+ Giao Nhiệm Vụ Mới" ở phía trên.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const coach = coaches.find(
                  (c) =>
                    c.id === task.assigneeId ||
                    resolveCanonicalCoachId(c.id) === resolveCanonicalCoachId(task.assigneeId)
                );
                const branch = branches.find((b) => b.id === task.branchId);
                const catInfo = getCategoryLabel(task.category);

                return (
                  <div
                    key={task.id}
                    className={`rounded border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors ${
                      task.status === "COMPLETED_PENDING_REVIEW"
                        ? "border-amber-300 ring-1 ring-amber-100"
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      {/* Left: Task Info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${catInfo.color}`}>
                            {catInfo.label}
                          </span>
                          {getPriorityBadge(task.priority)}
                          <span className="flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-100">
                            <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                            <span>+{task.kpiPoints} KPI</span>
                          </span>
                          {getStatusBadge(task.status)}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                            {task.description}
                          </p>
                        )}

                        {/* Meta info tags */}
                        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5 font-medium">
                            <User className="h-3.5 w-3.5 text-brand-primary" />
                            <span>HLV:</span>
                            <span className="font-semibold text-slate-800">
                              {coach?.name || "Huấn luyện viên"}
                            </span>
                          </div>

                          {branch && (
                            <div className="flex items-center gap-1.5 font-medium">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              <span>{branch.name.split("–")[0].trim()}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Hạn:</span>
                            <span className="font-semibold text-slate-800">{task.dueDate}</span>
                          </div>
                        </div>

                        {/* Báo cáo hoàn thành của HLV (nếu có) */}
                        {task.reportNote && (
                          <div className="mt-2.5 rounded border border-amber-200 bg-amber-50/50 p-2.5 text-xs">
                            <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              <span>Báo cáo kết quả từ HLV ({task.submittedAt ? new Date(task.submittedAt).toLocaleDateString("vi-VN") : "Gần đây"}):</span>
                            </p>
                            <p className="mt-1 text-slate-800 leading-relaxed font-medium">
                              {task.reportNote}
                            </p>
                            {task.reportAttachments && (
                              <p className="mt-1.5 flex items-center gap-1 text-brand-primary font-semibold">
                                <span>Minh chứng/Link:</span>
                                <a
                                  href={task.reportAttachments}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline hover:text-brand-primary-hover truncate max-w-md inline-block"
                                >
                                  {task.reportAttachments}
                                </a>
                              </p>
                            )}

                            {task.reviewFeedback && (
                              <p className="mt-2 border-t border-amber-200/60 pt-1.5 text-[11px] text-slate-600">
                                <span className="font-semibold text-slate-700">Nhận xét của Quản lý:</span>{" "}
                                {task.reviewFeedback}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-start flex-shrink-0 pt-1 sm:pt-0">
                        {task.status === "COMPLETED_PENDING_REVIEW" && (
                          <button
                            onClick={() => {
                              setReviewingTask(task);
                              setReviewFeedback("");
                            }}
                            className="flex items-center gap-1.5 rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Duyệt Báo Cáo</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Xóa nhiệm vụ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <h2 className="text-base font-bold text-slate-900">
              Bảng Xếp Hạng KPI Đội Ngũ Huấn Luyện Viên
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tổng hợp điểm thi đua, số nhiệm vụ hoàn thành và tỷ lệ thực hiện đúng hạn của từng HLV.
            </p>

            <div className="mt-3.5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase text-slate-500">
                    <th className="py-2.5 px-3">Hạng</th>
                    <th className="py-2.5 px-3">Huấn Luyện Viên</th>
                    <th className="py-2.5 px-3">Cơ Sở Phụ Trách</th>
                    <th className="py-2.5 px-3 text-center">Nhiệm Vụ Giao</th>
                    <th className="py-2.5 px-3 text-center">Đã Hoàn Thành</th>
                    <th className="py-2.5 px-3 text-center">Tỷ Lệ Đạt</th>
                    <th className="py-2.5 px-3 text-center">Tổng Điểm KPI</th>
                    <th className="py-2.5 px-3 text-center">Xếp Loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kpiData.coachStats
                    .sort((a, b) => b.kpiPoints - a.kpiPoints)
                    .map((item, idx) => (
                      <tr key={item.coachId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {idx === 0 ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-400 text-white font-bold text-[11px]">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-300 text-slate-800 font-bold text-[11px]">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-700 text-white font-bold text-[11px]">
                              3
                            </span>
                          ) : (
                            <span className="pl-1.5 font-medium text-slate-400">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">{item.coachName}</p>
                          <p className="text-[10px] text-slate-400">{item.title}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{item.branchName.split("–")[0].trim()}</td>
                        <td className="py-3 px-3 text-center font-medium text-slate-700">{item.totalTasks}</td>
                        <td className="py-3 px-3 text-center font-semibold text-emerald-700">
                          {item.approvedTasks}
                          {item.pendingReviewTasks > 0 && (
                            <span className="ml-1 text-[10px] text-amber-600">({item.pendingReviewTasks} chờ duyệt)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-semibold text-slate-800">{item.completionRate}%</span>
                            <div className="hidden sm:block h-1.5 w-16 rounded bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-brand-primary rounded"
                                style={{ width: `${item.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                            <Star className="h-3 w-3 fill-emerald-600" />
                            <span>{item.kpiPoints}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                              item.rating === "Xuất sắc"
                                ? "bg-purple-50 text-purple-800 border border-purple-100"
                                : item.rating === "Tốt"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                : item.rating === "Khá"
                                ? "bg-blue-50 text-blue-800 border border-blue-100"
                                : "bg-slate-50 text-slate-600 border border-slate-100"
                            }`}
                          >
                            {item.rating}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Giao Nhiệm Vụ Mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-brand-primary/10 text-brand-primary">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Giao Nhiệm Vụ Mới Cho HLV</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-3.5 space-y-3 text-xs">
              {/* Chọn HLV */}
              <div>
                <label className="font-semibold text-slate-700">Chọn Huấn Luyện Viên Được Giao *</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  required
                  className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
                >
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {branches.find((b) => b.id === c.branchId)?.name.split("–")[0].trim() || "CLB"} ({c.title || "HLV"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tiêu đề */}
              <div>
                <label className="font-semibold text-slate-700">Tiêu Đề Nhiệm Vụ *</label>
                <input
                  type="text"
                  placeholder="VD: Soạn giáo án Sicilian Najdorf cho lớp Đội tuyển"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <label className="font-semibold text-slate-700">Mô Tả Chi Tiết & Yêu Cầu Kết Quả</label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ nội dung cần làm, kết quả mong muốn hoặc hướng dẫn thực hiện..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-normal text-slate-900 focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Grid 2 cột: Danh mục & Mức độ ưu tiên */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700">Danh Mục Nhiệm Vụ</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                    className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
                  >
                    <option value="CHUYEN_MON">Chuyên môn cờ vua</option>
                    <option value="GIAO_AN">Soạn giáo án/đề thi</option>
                    <option value="TUYEN_SINH">Tuyển sinh & Phụ huynh</option>
                    <option value="SU_KIEN">Giải đấu & Sự kiện</option>
                    <option value="CO_SO">Vận hành cơ sở</option>
                    <option value="KHAC">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Mức Độ Ưu Tiên</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Bình thường</option>
                    <option value="HIGH">Ưu tiên cao</option>
                    <option value="URGENT">Khẩn cấp</option>
                  </select>
                </div>
              </div>

              {/* Grid 2 cột: Điểm KPI & Hạn nộp */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700">Điểm KPI Thưởng (Điểm)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={taskKpi}
                    onChange={(e) => setTaskKpi(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Hạn Hoàn Thành (Deadline) *</label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Cơ sở */}
              <div>
                <label className="font-semibold text-slate-700">Cơ Sở Trực Thuộc</label>
                <select
                  value={taskBranchId}
                  onChange={(e) => setTaskBranchId(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded bg-brand-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Giao Việc & Gửi Thông Báo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Duyệt Báo Cáo */}
      {reviewingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 border border-slate-100 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-100 text-amber-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Duyệt Báo Cáo Hoàn Thành</h3>
              </div>
              <button
                onClick={() => setReviewingTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhiệm vụ</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{reviewingTask.title}</p>
              </div>

              <div className="rounded border border-amber-200 bg-amber-50/50 p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-900">Nội dung báo cáo của HLV:</p>
                <p className="text-slate-800 leading-relaxed font-medium">
                  {reviewingTask.reportNote || "HLV đã đánh dấu hoàn thành nhiệm vụ."}
                </p>
                {reviewingTask.reportAttachments && (
                  <p className="pt-0.5 text-[11px] text-brand-primary font-semibold">
                    Link/Minh chứng:{" "}
                    <a
                      href={reviewingTask.reportAttachments}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {reviewingTask.reportAttachments}
                    </a>
                  </p>
                )}
                <div className="pt-1.5 flex items-center gap-4 text-[10px] text-slate-500 border-t border-amber-200/60">
                  <span>Hạn nộp: <b>{reviewingTask.dueDate}</b></span>
                  <span>
                    Hoàn thành:{" "}
                    <b className={reviewingTask.isCompletedOnTime ? "text-emerald-700" : "text-rose-600"}>
                      {reviewingTask.isCompletedOnTime ? "Đúng hạn ✓" : "Quá hạn"}
                    </b>
                  </span>
                  <span>Điểm KPI: <b className="text-brand-primary">+{reviewingTask.kpiPoints}</b></span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Nhận xét của Quản lý / Ban Chủ Nhiệm:</label>
                <textarea
                  rows={2}
                  placeholder="Ghi nhận xét đánh giá chất lượng hoàn thành hoặc lý do yêu cầu làm lại..."
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-200 bg-white p-2 text-xs font-normal text-slate-900 focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleReview(false)}
                  className="flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Yêu Cầu Làm Lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleReview(true)}
                  className="flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>Duyệt & Cộng +{reviewingTask.kpiPoints} KPI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
