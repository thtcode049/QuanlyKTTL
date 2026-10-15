"use client";

import React, { useState, useRef, useId, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Users,
  Sparkles,
  ClipboardPaste,
  Plus,
  Upload,
  RotateCcw,
  Check,
  Info,
  Layers,
} from "lucide-react";
import confetti from "canvas-confetti";
import { ClassroomData, StudentData, dataStore } from "@/lib/data-store";
import {
  downloadStudentImportTemplate,
  EditableStudentRow,
  createEmptyStudentRow,
  parseClipboardToEditableRows,
  parseExcelBufferToEditableRows,
  normalizePhoneNumber,
  extractBirthYear,
  normalizeFee,
} from "@/lib/student-import";
import { formatCurrencyVND } from "@/lib/vietqr";

interface BatchImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableClasses: ClassroomData[];
  initialClassId?: string;
  onImportSuccess?: (count: number) => void;
}

export const BatchImportStudentsModal: React.FC<BatchImportStudentsModalProps> = ({
  isOpen,
  onClose,
  availableClasses,
  initialClassId,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Khởi tạo các dòng trống
  const initDefaultRows = (clsId?: string) => {
    return Array.from({ length: 5 }, () => createEmptyStudentRow(clsId || "NONE"));
  };

  // State
  const [step, setStep] = useState<"TABLE" | "RESULT">("TABLE");
  const [targetClassId, setTargetClassId] = useState<string>(initialClassId || "AUTO");
  const [rows, setRows] = useState<EditableStudentRow[]>(() => initDefaultRows(initialClassId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [manualPasteText, setManualPasteText] = useState("");

  // Cập nhật khi mở modal hoặc đổi initialClassId
  useEffect(() => {
    if (isOpen) {
      setStep("TABLE");
      setRows(initDefaultRows(initialClassId));
      setTargetClassId(initialClassId || "AUTO");
      setToastMessage("");
    }
  }, [isOpen, initialClassId]);

  if (!isOpen) return null;

  // Hiển thị thông báo toast tạm thời
  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? "" : prev));
    }, 4000);
  };

  // Thêm dòng mới vào bảng
  const handleAddRow = (count: number = 1) => {
    const defaultCls = targetClassId && targetClassId !== "AUTO" ? targetClassId : "NONE";
    const newRows = Array.from({ length: count }, () => createEmptyStudentRow(defaultCls));
    setRows((prev) => [...prev, ...newRows]);
    notify(`Đã thêm ${count} dòng vào bảng.`);
  };

  // Xóa 1 dòng
  const handleDeleteRow = (rowId: string) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      return filtered.length > 0 ? filtered : [createEmptyStudentRow(targetClassId)];
    });
  };

  // Xóa trắng bảng
  const handleClearTable = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu trong bảng và làm mới?")) {
      setRows(initDefaultRows(targetClassId));
      notify("Đã xóa trắng bảng dữ liệu.");
    }
  };

  // Cập nhật giá trị ô
  const handleCellChange = (rowId: string, field: keyof EditableStudentRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return { ...r, [field]: value };
      })
    );
  };

  // Thêm dữ liệu từ chuỗi dán (Clipboard TSV / CSV)
  const applyPastedTextToRows = (text: string) => {
    const parsed = parseClipboardToEditableRows(text, targetClassId, availableClasses);
    if (parsed.length === 0) {
      alert("Không tìm thấy dữ liệu học viên hợp lệ từ nội dung dán!");
      return;
    }

    setRows((prev) => {
      // Nếu tất cả các dòng hiện tại đều rỗng -> thay thế hoàn toàn
      const isAllBlank = prev.every((r) => !r.fullName.trim() && !r.parentPhone.trim());
      if (isAllBlank) {
        return parsed;
      }
      // Ngược lại, lọc bỏ các dòng rỗng và nối thêm vào cuối
      const nonBlank = prev.filter((r) => r.fullName.trim() || r.parentPhone.trim());
      return [...nonBlank, ...parsed];
    });

    notify(`✨ Đã dán thành công ${parsed.length} dòng học viên vào bảng!`);
  };

  // Bắt sự kiện Paste toàn cục trên bảng
  const handleContainerPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    // Nếu nội dung dán có dấu xuống dòng hoặc tab -> là dữ liệu bảng từ Excel/Sheets
    if (text && (text.includes("\n") || text.includes("\t"))) {
      e.preventDefault();
      applyPastedTextToRows(text);
    }
  };

  // Xử lý nút "Dán từ Clipboard"
  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          applyPastedTextToRows(text);
          return;
        }
      }
      // Nếu không đọc được trực tiếp, mở modal dán thủ công
      setShowPasteModal(true);
    } catch (err) {
      // Trình duyệt chặn quyền truy cập Clipboard -> mở modal dán
      setShowPasteModal(true);
    }
  };

  // Xử lý dán qua Modal thủ công
  const handleApplyManualPaste = () => {
    if (!manualPasteText.trim()) return;
    applyPastedTextToRows(manualPasteText);
    setManualPasteText("");
    setShowPasteModal(false);
  };

  // Đọc file Excel trực tiếp vào bảng
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExcelBufferToEditableRows(buffer, targetClassId, availableClasses);
      if (parsed.length === 0) {
        alert("Không tìm thấy dữ liệu học viên trong file!");
        return;
      }

      setRows((prev) => {
        const isAllBlank = prev.every((r) => !r.fullName.trim() && !r.parentPhone.trim());
        if (isAllBlank) return parsed;
        const nonBlank = prev.filter((r) => r.fullName.trim() || r.parentPhone.trim());
        return [...nonBlank, ...parsed];
      });

      notify(`📁 Đã nạp thành công ${parsed.length} học viên từ file ${file.name}!`);
    } catch (err: any) {
      alert("Không thể đọc file: " + (err.message || "Định dạng file không hợp lệ"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Áp dụng lớp học cho tất cả các dòng
  const handleApplyClassToAllRows = (classId: string) => {
    setRows((prev) => prev.map((r) => ({ ...r, classId })));
    notify("Đã áp dụng lớp học cho toàn bộ các dòng!");
  };

  // Áp dụng lớp học cho các dòng chưa xếp lớp
  const handleApplyClassToUnsetRows = (classId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.classId === "NONE" || !r.classId ? { ...r, classId } : r))
    );
    notify("Đã gán lớp học cho các dòng chưa chọn lớp!");
  };

  // Tính toán trạng thái các dòng
  const rowStatuses = rows.map((r) => {
    const name = r.fullName.trim();
    const phone = normalizePhoneNumber(r.parentPhone);
    const isBlank = !name && !phone && !r.parentName.trim();
    const hasName = name.length >= 2;
    const hasPhone = phone.length >= 9 && phone.length <= 11;
    const isValid = hasName && hasPhone;

    let issue = "";
    if (!isBlank) {
      if (!hasName && !hasPhone) issue = "Thiếu Họ tên & SĐT";
      else if (!hasName) issue = "Thiếu Họ và tên";
      else if (!hasPhone) issue = "Thiếu SĐT PH hợp lệ";
    }

    return { isValid, isBlank, issue };
  });

  const validRowsCount = rowStatuses.filter((s) => s.isValid).length;
  const blankRowsCount = rowStatuses.filter((s) => s.isBlank).length;
  const issueRowsCount = rowStatuses.filter((s) => !s.isValid && !s.isBlank).length;

  // Xác nhận lưu vào hệ thống
  const handleSaveStudents = async () => {
    const validRows = rows.filter((r) => {
      const name = r.fullName.trim();
      const phone = normalizePhoneNumber(r.parentPhone);
      return name.length >= 2 && phone.length >= 9 && phone.length <= 11;
    });

    if (validRows.length === 0) {
      alert(
        "Chưa có học viên nào hợp lệ để lưu!\nVui lòng nhập ít nhất Họ và tên (*) cùng Số điện thoại phụ huynh (*)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let nextCodeNum = dataStore.students.length + 1;

      const studentsToSave: StudentData[] = validRows.map((r, i) => {
        const classIds: string[] = [];
        if (r.classId && r.classId !== "NONE" && r.classId !== "AUTO") {
          classIds.push(r.classId);
        } else if (targetClassId && targetClassId !== "AUTO" && targetClassId !== "NONE") {
          classIds.push(targetClassId);
        }

        const birthYear = extractBirthYear(r.birthYear);
        const fee = normalizeFee(r.customFee);
        const phone = normalizePhoneNumber(r.parentPhone);
        const name = r.fullName.trim();
        const parent = r.parentName.trim() || `Phụ huynh ${name}`;

        return {
          id: `std-bulk-${Date.now()}-${i + 1}-${Math.random().toString(36).substring(2, 6)}`,
          code: `HS${(nextCodeNum++).toString().padStart(3, "0")}`,
          fullName: name,
          birthYear,
          gender: r.gender || "Nam",
          parentName: parent,
          parentPhone: phone,
          currentLevel: r.currentLevel || "Nhập môn",
          classIds,
          customFeePerSession: fee,
          school: r.school.trim() || undefined,
          address: r.address?.trim() || undefined,
          notes: r.notes.trim() || undefined,
          status: "ACTIVE",
        };
      });

      await dataStore.addStudentsBatch(
        studentsToSave,
        targetClassId === "AUTO" || targetClassId === "NONE" ? undefined : targetClassId
      );

      setImportedCount(studentsToSave.length);
      setStep("RESULT");

      try {
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      if (onImportSuccess) {
        onImportSuccess(studentsToSave.length);
      }
    } catch (err: any) {
      console.error("Lỗi khi lưu học viên hàng loạt:", err);
      alert("Có lỗi xảy ra: " + (err.message || "Không thể lưu học sinh"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden"
      onPaste={handleContainerPaste}
    >
      <div className="relative w-full max-w-[96vw] xl:max-w-7xl rounded-3xl bg-white shadow-2xl border border-slate-200 ring-1 ring-slate-900/10 flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50/70 px-5 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
                  Nhập Bảng Học Viên Hàng Loạt
                </h3>
                <span className="hidden sm:inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                  Nhập & Dán trực tiếp trên Web
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">
                Điền trực tiếp vào bảng hoặc copy các ô từ Excel / Google Sheets rồi bấm{" "}
                <span className="font-bold text-slate-700">Dán (Ctrl+V)</span>. Các trường không bắt
                buộc có thể để trống.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toast Message Notification */}
        {toastMessage && (
          <div className="bg-emerald-600 px-4 py-2 text-white text-xs font-bold flex items-center justify-between animate-fade-in shadow-inner">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage("")}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5 space-y-3.5">
          {step === "TABLE" && (
            <>
              {/* Quick Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 rounded-2xl p-3 border border-slate-200">
                {/* Lựa chọn lớp ghi danh nhanh */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span>Lớp ghi danh mặc định:</span>
                  </div>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none shadow-sm"
                  >
                    <option value="AUTO">✨ Tự động theo cột lớp / Giữ nguyên</option>
                    <option value="NONE">📁 Chưa xếp lớp (Chỉ lưu hồ sơ)</option>
                    <optgroup label="Danh sách lớp học hiện có">
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.level} - {formatCurrencyVND(c.feePerSession)}/buổi)
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {targetClassId !== "AUTO" && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleApplyClassToUnsetRows(targetClassId)}
                        title="Áp dụng lớp này cho tất cả các dòng hiện đang để 'Chưa xếp lớp'"
                        className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs"
                      >
                        Gán cho dòng chưa có lớp
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyClassToAllRows(targetClassId)}
                        title="Gán lớp này cho tất cả mọi dòng trong bảng"
                        className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-2xs"
                      >
                        Gán cho tất cả dòng
                      </button>
                    </div>
                  )}
                </div>

                {/* Các nút hành động chính */}
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {/* Nút Dán Clipboard */}
                  <button
                    type="button"
                    onClick={handlePasteButtonClick}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    <span>Dán từ Clipboard (Ctrl + V)</span>
                  </button>

                  {/* Thêm 1 dòng */}
                  <button
                    type="button"
                    onClick={() => handleAddRow(1)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>+1 dòng</span>
                  </button>

                  {/* Thêm 5 dòng */}
                  <button
                    type="button"
                    onClick={() => handleAddRow(5)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>+5 dòng</span>
                  </button>

                  {/* Nhập từ file Excel */}
                  <label
                    htmlFor={fileInputId}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    title="Mở file Excel để tự động điền danh sách vào bảng"
                  >
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    <span>Mở file Excel</span>
                  </label>
                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Tải file mẫu */}
                  <button
                    type="button"
                    onClick={() => downloadStudentImportTemplate(availableClasses)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
                    title="Tải file Excel mẫu chuẩn"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span>File mẫu</span>
                  </button>

                  {/* Xóa trắng bảng */}
                  <button
                    type="button"
                    onClick={handleClearTable}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                    title="Xóa toàn bộ các dòng và bắt đầu lại"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Làm mới</span>
                  </button>
                </div>
              </div>

              {/* Tips Banner */}
              <div className="flex items-center justify-between rounded-xl bg-amber-50/70 px-3 py-1.5 border border-amber-200/80 text-[11px] text-amber-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>Mẹo dán dữ liệu:</strong> Bạn chỉ cần bôi đen các ô trong Excel/Google
                    Sheets bấm <strong>Ctrl+C</strong>, sau đó quay lại trang này bấm{" "}
                    <strong>Ctrl+V</strong> (hoặc bấm nút "Dán từ Clipboard"). Các cột không cần
                    thiết có thể để trống, hệ thống sẽ tự động chuẩn hóa!
                  </span>
                </div>
              </div>

              {/* Spreadsheet Grid Table */}
              <div
                ref={tableContainerRef}
                className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-inner max-h-[56vh]"
              >
                <table className="w-full border-collapse text-left text-xs min-w-[1250px]">
                  <thead className="sticky top-0 z-20 bg-slate-100 font-extrabold text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-300">
                    <tr>
                      <th className="px-2 py-2.5 text-center w-12 bg-slate-100">#</th>
                      <th className="px-3 py-2.5 w-52 bg-slate-100">
                        <span className="text-emerald-700">Họ và tên (*)</span>
                      </th>
                      <th className="px-2 py-2.5 w-24 bg-slate-100">Năm sinh</th>
                      <th className="px-2 py-2.5 w-24 bg-slate-100">Giới tính</th>
                      <th className="px-3 py-2.5 w-44 bg-slate-100">Tên phụ huynh</th>
                      <th className="px-3 py-2.5 w-40 bg-slate-100">
                        <span className="text-emerald-700">SĐT Phụ huynh (*)</span>
                      </th>
                      <th className="px-2 py-2.5 w-32 bg-slate-100">Trình độ</th>
                      <th className="px-3 py-2.5 w-52 bg-slate-100">Lớp học</th>
                      <th className="px-2 py-2.5 w-32 bg-slate-100">Học phí riêng (VNĐ)</th>
                      <th className="px-3 py-2.5 w-40 bg-slate-100">Trường học</th>
                      <th className="px-3 py-2.5 min-w-[180px] bg-slate-100">Ghi chú</th>
                      <th className="px-2 py-2.5 text-center w-12 bg-slate-100">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => {
                      const status = rowStatuses[idx];
                      const isRowValid = status?.isValid;
                      const isRowBlank = status?.isBlank;
                      const hasIssue = !isRowValid && !isRowBlank;

                      return (
                        <tr
                          key={row.id}
                          className={`group transition-colors ${
                            hasIssue
                              ? "bg-rose-50/40 hover:bg-rose-50/60"
                              : isRowValid
                              ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          {/* STT + Indicator */}
                          <td className="px-2 py-1.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-mono text-[11px] text-slate-400">
                                {idx + 1}
                              </span>
                              {isRowValid && (
                                <span title="Dòng hợp lệ sẵn sàng lưu">
                                  <Check className="h-3 w-3 text-emerald-600" />
                                </span>
                              )}
                              {hasIssue && (
                                <span
                                  className="text-[10px] text-rose-600 font-bold"
                                  title={status.issue}
                                >
                                  ⚠️
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Họ và tên (*) */}
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.fullName}
                              onChange={(e) => handleCellChange(row.id, "fullName", e.target.value)}
                              placeholder="VD: Nguyễn Gia Huy"
                              className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none transition-all ${
                                !row.fullName.trim() && !isRowBlank
                                  ? "border border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500"
                                  : "border border-slate-200 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                              }`}
                            />
                          </td>

                          {/* Năm sinh */}
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.birthYear}
                              onChange={(e) => handleCellChange(row.id, "birthYear", e.target.value)}
                              placeholder="2018"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-800 text-center focus:border-emerald-600 focus:outline-none"
                            />
                          </td>

                          {/* Giới tính */}
                          <td className="px-2 py-1.5">
                            <select
                              value={row.gender}
                              onChange={(e) =>
                                handleCellChange(row.id, "gender", e.target.value as "Nam" | "Nữ")
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
                            >
                              <option value="Nam">Nam</option>
                              <option value="Nữ">Nữ</option>
                            </select>
                          </td>

                          {/* Tên phụ huynh */}
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.parentName}
                              onChange={(e) =>
                                handleCellChange(row.id, "parentName", e.target.value)
                              }
                              placeholder="Tên bố/mẹ..."
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                            />
                          </td>

                          {/* SĐT phụ huynh (*) */}
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.parentPhone}
                              onChange={(e) =>
                                handleCellChange(row.id, "parentPhone", e.target.value)
                              }
                              placeholder="0912345678"
                              className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none transition-all ${
                                !normalizePhoneNumber(row.parentPhone) && !isRowBlank
                                  ? "border border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500"
                                  : "border border-slate-200 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                              }`}
                            />
                          </td>

                          {/* Trình độ */}
                          <td className="px-2 py-1.5">
                            <select
                              value={row.currentLevel}
                              onChange={(e) =>
                                handleCellChange(row.id, "currentLevel", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
                            >
                              <option value="Nhập môn">Nhập môn</option>
                              <option value="Vỡ lòng">Vỡ lòng</option>
                              <option value="Cơ bản">Cơ bản</option>
                              <option value="Nâng cao">Nâng cao</option>
                              <option value="Đội tuyển">Đội tuyển</option>
                            </select>
                          </td>

                          {/* Lớp học */}
                          <td className="px-2 py-1.5">
                            <select
                              value={row.classId || "NONE"}
                              onChange={(e) =>
                                handleCellChange(row.id, "classId", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
                            >
                              <option value="NONE">Chưa xếp lớp</option>
                              {availableClasses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Học phí riêng */}
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.customFee}
                              onChange={(e) =>
                                handleCellChange(row.id, "customFee", e.target.value)
                              }
                              placeholder="Theo lớp"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-800 text-right focus:border-emerald-600 focus:outline-none"
                            />
                          </td>

                          {/* Trường học */}
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.school}
                              onChange={(e) => handleCellChange(row.id, "school", e.target.value)}
                              placeholder="Trường..."
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                            />
                          </td>

                          {/* Ghi chú */}
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => handleCellChange(row.id, "notes", e.target.value)}
                              placeholder="Ghi chú thêm..."
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                            />
                          </td>

                          {/* Nút xóa dòng */}
                          <td className="px-2 py-1.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors"
                              title="Xóa dòng này"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Status & Confirmation Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                {/* Status counts */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1 font-extrabold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Hợp lệ: {validRowsCount} học viên</span>
                  </span>

                  {issueRowsCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-rose-100 px-2.5 py-1 font-bold text-rose-700">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{issueRowsCount} dòng thiếu Tên/SĐT</span>
                    </span>
                  )}

                  {blankRowsCount > 0 && (
                    <span className="text-slate-400 font-medium">
                      ({blankRowsCount} dòng trống sẽ tự động bỏ qua)
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Đóng
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || validRowsCount === 0}
                    onClick={handleSaveStudents}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Đang lưu vào hệ thống...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Lưu {validRowsCount} Học Viên Vào Hệ Thống</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP: RESULT SUCCESS */}
          {step === "RESULT" && (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 shadow-lg shadow-emerald-600/10">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Nhập Học Viên Thành Công!
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md">
                  Đã thêm thành công <strong>{importedCount}</strong> học sinh vào hệ thống dữ liệu
                  CLB Kiện Tướng Tương Lai. Hồ sơ và danh sách lớp đã được đồng bộ tự động!
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  Hoàn Tất & Xem Danh Sách
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("TABLE");
                    setRows(initDefaultRows(targetClassId));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Tiếp Tục Nhập Bảng Khác
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Paste Dialog Fallback */}
      {showPasteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <ClipboardPaste className="h-4 w-4 text-emerald-600" />
                <span>Dán dữ liệu từ Excel / Google Sheets</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Nhấn <strong>Ctrl + V</strong> vào khung bên dưới rồi bấm{" "}
              <strong>Nhập Vào Bảng</strong>:
            </p>
            <textarea
              rows={8}
              value={manualPasteText}
              onChange={(e) => setManualPasteText(e.target.value)}
              placeholder="Nguyễn Gia Huy&#9;2017&#9;Nam&#9;0912345678&#9;Nhập môn&#10;Trần Phương Linh&#9;2018&#9;Nữ&#9;0987654321&#9;Cơ bản"
              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono focus:border-emerald-600 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!manualPasteText.trim()}
                onClick={handleApplyManualPaste}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
              >
                Nhập Vào Bảng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
