"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Phone,
  Sparkles,
  GraduationCap,
  MoreVertical,
  CheckCircle2,
  FileSpreadsheet,
  Eye,
  Trash2,
  DollarSign,
} from "lucide-react";
import {
  Input,
  Select,
  Table,
  Tag,
  Button,
  Segmented,
  Space,
  App,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  dataStore,
  StudentData,
  resolveCanonicalCoachId,
  getCoachClasses,
  getCoachStudents,
} from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import { getStudentAvatarUrl } from "@/lib/chess-avatars";
import { StudentProfileModal } from "@/components/student-profile-modal";
import { StudentContextMenu, ContextMenuPosition } from "@/components/student-context-menu";
import { BatchImportStudentsModal } from "@/components/batch-import-students-modal";

export default function StudentsDirectoryPage() {
  const { message, modal } = App.useApp();
  const [currentCoachId, setCurrentCoachId] = useState<string>("user-coach-1");
  const [coachClasses, setCoachClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("ALL");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  // Tải danh sách lớp và học viên của riêng HLV này
  useEffect(() => {
    let coachId = "";
    let coachEmail = "";
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) coachId = u.id;
        if (u.email) coachEmail = u.email;
      } catch (e) {}
    }
    setCurrentCoachId(coachId);

    const updateDisplay = () => {
      const myClasses = getCoachClasses(coachId, coachEmail);
      setCoachClasses(myClasses);
      const myStudents = getCoachStudents(coachId, coachEmail);
      setStudents(myStudents);
    };

    updateDisplay();
    dataStore.syncWithDatabase().then(() => {
      updateDisplay();
    });
  }, []);

  // Profile Modal State
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Batch Import Modal State
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);

  const handleImportSuccess = (count: number) => {
    let coachId = currentCoachId;
    let coachEmail = "";
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.id) coachId = u.id;
        if (u.email) coachEmail = u.email;
      } catch (e) {}
    }
    const myStudents = getCoachStudents(coachId, coachEmail);
    setStudents([...myStudents]);
    message.success(`Đã nhập thành công ${count} học viên vào hệ thống!`);
  };

  // Context Menu State
  const [contextMenuStudent, setContextMenuStudent] = useState<StudentData | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<ContextMenuPosition | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const classes = coachClasses;

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parentPhone.includes(searchTerm);

    const matchClass = filterClass === "ALL" || s.classIds.includes(filterClass);
    const matchLevel =
      filterLevel === "ALL" ||
      s.classIds.some((cid) => {
        const cls = classes.find((c) => c.id === cid);
        return cls?.level === filterLevel;
      });

    return matchSearch && matchClass && matchLevel;
  });

  const handleOpenProfile = (student: StudentData) => {
    setSelectedStudent(student);
    setIsProfileOpen(true);
  };

  const handleStudentUpdated = (updated: StudentData) => {
    const myClassIds = coachClasses.map((c) => c.id);
    setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
    setSelectedStudent(updated);
    message.success(`Đã cập nhật hồ sơ học viên ${updated.fullName}!`);
  };

  const handleContextMenu = (e: React.MouseEvent, student: StudentData) => {
    e.preventDefault();
    setContextMenuStudent(student);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  };

  const handleMoreClick = (e: React.MouseEvent, student: StudentData) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenuStudent(student);
    setContextMenuPos({ x: rect.left - 180, y: rect.bottom + 4 });
    setIsContextMenuOpen(true);
  };

  const handleRemoveStudent = (student: StudentData) => {
    modal.confirm({
      title: "Xác nhận xóa học viên",
      content: `Bạn có chắc chắn muốn xóa học viên "${student.fullName}" khỏi hệ thống không?`,
      okText: "Xác nhận xóa",
      okType: "danger",
      cancelText: "Hủy",
      async onOk() {
        await dataStore.deleteStudent(student.id);
        const myClassIds = coachClasses.map((c) => c.id);
        setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
        message.success(`Đã xóa học viên ${student.fullName}!`);
      },
    });
  };

  const handleSetCustomFee = async (student: StudentData) => {
    const current = student.customFeePerSession ?? 150000;
    const input = window.prompt(
      `Cài đặt học phí riêng (VNĐ/buổi) cho học viên "${student.fullName}":`,
      String(current)
    );
    if (input !== null) {
      const parsed = parseFloat(input.trim());
      await dataStore.updateStudentFee(student.id, isNaN(parsed) || parsed <= 0 ? null : parsed);
      const myClassIds = coachClasses.map((c) => c.id);
      setStudents(dataStore.students.filter((s) => s.classIds.some((cid) => myClassIds.includes(cid))));
      message.success(`Đã cập nhật học phí học viên ${student.fullName}!`);
    }
  };

  // Ant Design Table Columns Definition
  const tableColumns: ColumnsType<StudentData> = [
    {
      title: "MÃ HV",
      dataIndex: "code",
      key: "code",
      width: 110,
      render: (code: string) => (
        <span className="font-mono text-xs font-semibold text-slate-700">{code}</span>
      ),
    },
    {
      title: "HỌC VIÊN",
      key: "fullName",
      render: (_, std, idx) => {
        const avatarUrl = std.avatar || getStudentAvatarUrl(std.avatar, std.fullName, idx);
        return (
          <div className="flex items-center gap-2.5">
            <img
              src={avatarUrl}
              alt={std.fullName}
              className="h-8 w-8 rounded object-cover flex-shrink-0"
            />
            <div>
              <p className="text-xs font-bold text-slate-900 hover:text-brand-primary transition-colors cursor-pointer">
                {std.fullName}
              </p>
              {std.eloRating && (
                <span className="text-[10px] text-slate-400">Elo: {std.eloRating}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "NĂM SINH",
      key: "birthYear",
      width: 120,
      render: (_, std) => (
        <span className="text-xs text-slate-600">
          {std.birthYear ? `${std.birthYear} (${new Date().getFullYear() - std.birthYear}t)` : "—"}
        </span>
      ),
    },
    {
      title: "LỚP HỌC (TRÌNH ĐỘ)",
      key: "classes",
      render: (_, std) => {
        const studentClasses = classes.filter((c) => std.classIds.includes(c.id));
        if (studentClasses.length === 0) {
          return <span className="text-xs text-slate-400">Chưa xếp lớp</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {studentClasses.map((c) => (
              <Tag key={c.id} bordered={false} color="cyan" className="m-0 text-[11px] font-medium">
                {c.name.split("-")[0]?.trim()} ({c.level})
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: "SỐ ĐIỆN THOẠI",
      dataIndex: "parentPhone",
      key: "parentPhone",
      width: 140,
      render: (phone: string) => (
        <a
          href={`tel:${phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 font-mono text-xs font-semibold text-brand-primary hover:underline"
        >
          <Phone className="h-3 w-3" />
          <span>{phone}</span>
        </a>
      ),
    },
    {
      title: "THAO TÁC",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, std) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Xem chi tiết hồ sơ">
            <Button
              type="text"
              size="small"
              icon={<Eye className="h-3.5 w-3.5 text-slate-500" />}
              onClick={() => handleOpenProfile(std)}
            />
          </Tooltip>
          <Tooltip title="Cài đặt học phí riêng">
            <Button
              type="text"
              size="small"
              icon={<DollarSign className="h-3.5 w-3.5 text-emerald-600" />}
              onClick={() => handleSetCustomFee(std)}
            />
          </Tooltip>
          <Tooltip title="Xóa học viên">
            <Button
              type="text"
              size="small"
              danger
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => handleRemoveStudent(std)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Quản Lý Hồ Sơ Học Viên
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Tổng hợp toàn bộ học viên các cơ sở, ảnh hồ sơ, thông tin liên hệ và tiến độ rèn luyện cờ vua.
          </p>
        </div>

        <Space wrap>
          <Button
            type="primary"
            icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            onClick={() => setIsBatchImportOpen(true)}
            className="font-semibold"
          >
            Nhập Hàng Loạt Từ Sheet
          </Button>

          <Link href="/coach/classes">
            <Button icon={<GraduationCap className="h-3.5 w-3.5 text-brand-primary" />}>
              Quản Lý Theo Lớp Học
            </Button>
          </Link>
        </Space>
      </div>

      {/* Search & Filter Bar - Phẳng hoàn toàn, không bọc card viền dày */}
      <div className="bg-white p-3 rounded shadow-none">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Search Box - Filled variant */}
          <div className="flex-1 max-w-md">
            <Input
              variant="filled"
              prefix={<Search className="h-3.5 w-3.5 text-slate-400 mr-1" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên học viên, mã HV, SĐT phụ huynh..."
              allowClear
            />
          </div>

          {/* Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              variant="filled"
              value={filterClass}
              onChange={(val) => setFilterClass(val)}
              className="min-w-[150px]"
              options={[
                { label: "Tất cả lớp học", value: "ALL" },
                ...classes.map((cls) => ({ label: cls.name, value: cls.id })),
              ]}
            />

            <Select
              variant="filled"
              value={filterLevel}
              onChange={(val) => setFilterLevel(val)}
              className="min-w-[130px]"
              options={[
                { label: "Tất cả trình độ", value: "ALL" },
                { label: "Nhập môn", value: "Nhập môn" },
                { label: "Cơ bản", value: "Cơ bản" },
                { label: "Nâng cao", value: "Nâng cao" },
                { label: "Đội tuyển", value: "Đội tuyển" },
              ]}
            />

            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as "GRID" | "LIST")}
              options={[
                { label: "Thẻ Profile", value: "GRID" },
                { label: "Danh Sách", value: "LIST" },
              ]}
            />
          </div>
        </div>

        {/* Tip Badge */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Sparkles className="h-3 w-3 text-brand-primary flex-shrink-0" />
          <span>
            Hiển thị <strong>{filteredStudents.length}</strong> / {students.length} học viên. Bấm vào bất kỳ thẻ học viên nào để xem và cập nhật ảnh đại diện.
          </span>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-slate-200 bg-white p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-emerald-50 text-brand-primary">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-base font-bold text-slate-900">
            Chưa có hồ sơ học viên nào
          </h2>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            Hệ thống đã tự động lọc bỏ toàn bộ dữ liệu học sinh mẫu đối với tài khoản thực của bạn. Hãy vào mục Lớp Học để tạo lớp và ghi danh học sinh thực tế.
          </p>
          <Space className="mt-5">
            <Button
              type="primary"
              icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
              onClick={() => setIsBatchImportOpen(true)}
            >
              Nhập Hàng Loạt Bằng Sheet / Excel
            </Button>
            <Link href="/coach/classes">
              <Button icon={<GraduationCap className="h-3.5 w-3.5" />}>
                Đi Đến Quản Lý Lớp Học
              </Button>
            </Link>
          </Space>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === "GRID" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredStudents.map((std, idx) => {
                const avatarUrl = std.avatar || getStudentAvatarUrl(std.avatar, std.fullName, idx);
                const studentClass = classes.find((c) => std.classIds.includes(c.id));
                const age = std.birthYear ? new Date().getFullYear() - std.birthYear : null;

                return (
                  <div
                    key={std.id}
                    onContextMenu={(e) => handleContextMenu(e, std)}
                    onClick={() => handleOpenProfile(std)}
                    className="group relative cursor-pointer rounded bg-white p-3.5 border border-slate-100 hover:border-brand-primary/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Code & Context Menu */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
                          {std.code}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleMoreClick(e, std)}
                          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Tùy chọn học viên"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Avatar & Student Name */}
                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                          <img
                            src={avatarUrl}
                            alt={std.fullName}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>

                        <div className="overflow-hidden">
                          <h3 className="truncate text-xs font-bold text-slate-900 group-hover:text-brand-primary transition-colors">
                            {std.fullName}
                          </h3>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                            {age && <span>{age} tuổi</span>}
                            {std.eloRating && (
                              <Tag bordered={false} color="gold" className="m-0 text-[10px] px-1 py-0 font-medium">
                                Elo {std.eloRating}
                              </Tag>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Class & Details */}
                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Trình độ:</span>
                          <span className="font-semibold text-emerald-700">
                            {studentClass?.level || "—"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Lớp:</span>
                          <div className="text-right max-w-[150px] truncate">
                            <span className="font-medium text-slate-700">
                              {studentClass?.name || "Chưa xếp lớp"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Card Footer */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2 text-[11px]">
                      <a
                        href={`tel:${std.parentPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 font-mono font-medium text-brand-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{std.parentPhone}</span>
                      </a>

                      <span className="text-[10px] text-slate-400 group-hover:text-brand-primary transition-colors">
                        Xem hồ sơ ➔
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List / Table View - Ant Design Table */}
          {viewMode === "LIST" && (
            <div className="bg-white rounded overflow-hidden">
              <Table<StudentData>
                columns={tableColumns}
                dataSource={filteredStudents}
                rowKey="id"
                bordered={false}
                pagination={{
                  pageSize: 15,
                  showTotal: (total) => `Tổng cộng ${total} học viên`,
                  size: "small",
                }}
                onRow={(record) => ({
                  onClick: () => handleOpenProfile(record),
                  onContextMenu: (e) => handleContextMenu(e, record),
                  className: "cursor-pointer",
                })}
              />
            </div>
          )}
        </>
      )}

      {/* Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onUpdate={handleStudentUpdated}
          currentClass={coachClasses.find((c) => selectedStudent.classIds.includes(c.id))}
        />
      )}

      {/* Context Menu Thao Tác Nhanh */}
      {contextMenuStudent && contextMenuPos && (
        <StudentContextMenu
          student={contextMenuStudent}
          position={contextMenuPos}
          isOpen={isContextMenuOpen}
          onClose={() => setIsContextMenuOpen(false)}
          onViewProfile={handleOpenProfile}
          onStartInlineEdit={() => {}}
          onChangeAvatar={() => handleOpenProfile(contextMenuStudent)}
          onSetCustomFee={handleSetCustomFee}
          onRemoveFromClass={handleRemoveStudent}
        />
      )}

      {/* Modal Nhập Hàng Loạt Bằng Sheet */}
      <BatchImportStudentsModal
        isOpen={isBatchImportOpen}
        onClose={() => setIsBatchImportOpen(false)}
        onImportSuccess={handleImportSuccess}
        availableClasses={coachClasses}
      />
    </div>
  );
}
