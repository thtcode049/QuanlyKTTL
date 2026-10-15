"use client";

import React, { useState, useRef, useId } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Users,
  Sparkles,
  ArrowRight,
  ClipboardPaste,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import confetti from "canvas-confetti";
import { ClassroomData, StudentData, dataStore } from "@/lib/data-store";
import {
  downloadStudentImportTemplate,
  parseExcelBuffer,
  parsePastedText,
  ParseResult,
  ParsedStudentRow,
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

  // State
  const [step, setStep] = useState<"INPUT" | "PREVIEW" | "RESULT">("INPUT");
  const [inputTab, setInputTab] = useState<"FILE" | "PASTE">("FILE");
  const [targetClassId, setTargetClassId] = useState<string>(initialClassId || "AUTO");
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [filterMode, setFilterMode] = useState<"ALL" | "VALID" | "INVALID">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  if (!isOpen) return null;

  // Xử lý khi chọn file Excel / CSV
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelBuffer(
        buffer,
        targetClassId,
        availableClasses,
        dataStore.students
      );
      setParsedResult(result);
      setStep("PREVIEW");
    } catch (err: any) {
      alert("Không thể đọc file: " + (err.message || "Định dạng file không hợp lệ"));
    }
  };

  // Xử lý kéo thả file
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  // Xử lý phân tích dữ liệu dán trực tiếp
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    setFileName("Dữ liệu copy từ Google Sheets / Excel");
    const result = parsePastedText(
      pastedText,
      targetClassId,
      availableClasses,
      dataStore.students
    );
    setParsedResult(result);
    setStep("PREVIEW");
  };

  // Tải file mẫu Excel
  const handleDownloadTemplate = () => {
    downloadStudentImportTemplate(availableClasses);
  };

  // Xóa 1 dòng khỏi danh sách xem trước
  const handleRemoveRow = (index: number) => {
    if (!parsedResult) return;
    const newRows = parsedResult.rows.filter((r) => r.index !== index);
    const validCount = newRows.filter((r) => r.isValid).length;
    const invalidCount = newRows.filter((r) => !r.isValid).length;
    const warningCount = newRows.filter((r) => r.warnings.length > 0).length;

    setParsedResult({
      rows: newRows,
      total: newRows.length,
      validCount,
      invalidCount,
      warningCount,
    });
  };

  // Đổi lớp học trực tiếp cho 1 dòng trong bảng
  const handleRowClassChange = (index: number, classId: string) => {
    if (!parsedResult) return;
    const newRows = parsedResult.rows.map((r) => {
      if (r.index === index) {
        const cls = availableClasses.find((c) => c.id === classId);
        return {
          ...r,
          matchedClassId: classId === "NONE" ? undefined : classId,
          matchedClassName: cls?.name,
        };
      }
      return r;
    });
    setParsedResult({ ...parsedResult, rows: newRows });
  };

  // Lọc các dòng hiển thị
  const filteredRows = (parsedResult?.rows || []).filter((r) => {
    if (filterMode === "VALID" && !r.isValid) return false;
    if (filterMode === "INVALID" && r.isValid) return false;
    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.parentPhone.includes(q) ||
      r.parentName.toLowerCase().includes(q) ||
      (r.code && r.code.toLowerCase().includes(q)) ||
      (r.matchedClassName && r.matchedClassName.toLowerCase().includes(q))
    );
  });

  // Tiến hành lưu học viên vào hệ thống
  const handleConfirmImport = async () => {
    if (!parsedResult || parsedResult.rows.length === 0) return;

    // Lọc danh sách cần nhập
    const rowsToImport = skipInvalid
      ? parsedResult.rows.filter((r) => r.isValid)
      : parsedResult.rows;

    if (rowsToImport.length === 0) {
      alert("Không có dòng hợp lệ nào để nhập!");
      return;
    }

    setIsSubmitting(true);
    try {
      const studentsToSave: StudentData[] = rowsToImport.map((r) => {
        const classIds: string[] = [];
        if (r.matchedClassId) {
          classIds.push(r.matchedClassId);
        } else if (targetClassId && targetClassId !== "AUTO" && targetClassId !== "NONE") {
          classIds.push(targetClassId);
        }

        return {
          id: r.id,
          code: r.code,
          fullName: r.fullName,
          birthYear: r.birthYear,
          gender: r.gender,
          parentName: r.parentName,
          parentPhone: r.parentPhone,
          currentLevel: r.currentLevel,
          notes: r.notes,
          classIds,
          customFeePerSession: r.customFeePerSession,
          school: r.school,
          address: r.address,
          status: "ACTIVE",
        };
      });

      // Lưu qua dataStore (đồng bộ Supabase)
      await dataStore.addStudentsBatch(
        studentsToSave,
        targetClassId === "AUTO" || targetClassId === "NONE" ? undefined : targetClassId
      );

      setImportedCount(studentsToSave.length);
      setStep("RESULT");

      // Bắn pháo hoa ăn mừng
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      if (onImportSuccess) {
        onImportSuccess(studentsToSave.length);
      }
    } catch (err: any) {
      console.error("Lỗi khi nhập học viên hàng loạt:", err);
      alert("Có lỗi xảy ra trong quá trình nhập: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("INPUT");
    setParsedResult(null);
    setPastedText("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 ring-1 ring-slate-900/10 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
                  Nhập Hàng Loạt Học Viên Từ Sheet / Excel
                </h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                  Tự động chuẩn hóa
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Thêm danh sách học sinh theo đúng quy chuẩn trường dữ liệu (Họ tên, SĐT phụ huynh, Năm sinh, Trình độ, Học phí)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: INPUT DATA */}
          {step === "INPUT" && (
            <div className="space-y-6 animate-fade-in">
              {/* Target Class Selection & Download Template Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
                {/* Lựa chọn lớp ghi danh */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-brand-primary" />
                    <span>Lớp học ghi danh cho học viên:</span>
                  </label>
                  <div className="relative">
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand-primary focus:outline-none shadow-sm"
                    >
                      <option value="AUTO">
                        ✨ Tự động nhận diện theo cột 'Lớp học' trong sheet
                      </option>
                      <option value="NONE">
                        📁 Không xếp lớp ngay (Chỉ lưu hồ sơ học viên)
                      </option>
                      <optgroup label="Chọn cố định 1 lớp cụ thể">
                        {availableClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.level} - {formatCurrencyVND(c.feePerSession)}/buổi)
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    💡 Nếu chọn lớp cụ thể, mọi học viên trong file sẽ được tự động xếp vào lớp này.
                  </p>
                </div>

                {/* Nút Tải Mẫu Excel */}
                <div className="flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Chưa có file mẫu?</span>
                    </label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tải file Excel mẫu có sẵn cấu trúc cột và 4 học sinh ví dụ để điền nhanh:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-emerald-300 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Tải File Mẫu Excel (.xlsx) Chuẩn KTTLL</span>
                  </button>
                </div>
              </div>

              {/* Tabs Switcher: Upload File vs Paste Text */}
              <div className="border-b border-slate-200">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setInputTab("FILE")}
                    className={`flex items-center gap-2 border-b-2 pb-3 text-xs font-bold transition-all ${
                      inputTab === "FILE"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    <span>Tải Lên File Excel / CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTab("PASTE")}
                    className={`flex items-center gap-2 border-b-2 pb-3 text-xs font-bold transition-all ${
                      inputTab === "PASTE"
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    <span>Dán Trực Tiếp Từ Google Sheets / Excel (Copy-Paste)</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: FILE UPLOAD DROPZONE */}
              {inputTab === "FILE" && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-50/50 scale-[0.99]"
                      : "border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 shadow-inner">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-800">
                    Kéo và thả file Excel (.xlsx, .xls) hoặc file .csv vào đây
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 max-w-md">
                    Hệ thống tự động nhận diện thông minh các cột Họ tên, Số điện thoại phụ huynh, Năm sinh, Trình độ, Học phí riêng...
                  </p>

                  <div className="mt-6 flex items-center gap-3">
                    <label
                      htmlFor={fileInputId}
                      className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Chọn file từ máy tính</span>
                    </label>
                    <input
                      id={fileInputId}
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PASTE DIRECTLY */}
              {inputTab === "PASTE" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Dán toàn bộ các ô từ Google Sheets hoặc Excel vào khung bên dưới:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      (Bao gồm cả dòng tiêu đề cột hoặc dán trực tiếp dữ liệu)
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Họ và tên\tNăm sinh\tGiới tính\tTên phụ huynh\tSố điện thoại\tTrình độ\nNguyễn Gia Huy\t2017\tNam\tNguyễn Văn Hùng\t0912345678\tNhập môn\nTrần Phương Linh\t2018\tNữ\tLê Thị Thu\t0987654321\tCơ bản`}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-mono focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!pastedText.trim()}
                      onClick={handleProcessPastedText}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <span>Tiếp tục & Xem trước</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tips Section */}
              <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200/80 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>Quy tắc chuẩn hóa thông minh:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 pl-1">
                  <li>
                    <strong>Họ tên & SĐT phụ huynh</strong> là 2 trường bắt buộc để tạo hồ sơ và gửi thông báo Zalo.
                  </li>
                  <li>
                    <strong>Năm sinh:</strong> Chấp nhận cả số 4 chữ số (VD: 2017) hoặc ngày sinh (VD: 15/08/2017).
                  </li>
                  <li>
                    <strong>Giới tính:</strong> Mặc định là 'Nam' nếu để trống.
                  </li>
                  <li>
                    <strong>Số điện thoại:</strong> Tự động bỏ dấu chấm, khoảng trắng, chuyển đầu số quốc tế (+84) về 0.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATE */}
          {step === "PREVIEW" && parsedResult && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-slate-100 p-3.5 border border-slate-200 text-center">
                  <div className="text-xl font-black text-slate-800">{parsedResult.total}</div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Tổng số học viên
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200 text-center">
                  <div className="text-xl font-black text-emerald-700">{parsedResult.validCount}</div>
                  <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                    Hợp lệ sẵn sàng
                  </div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 text-center">
                  <div className="text-xl font-black text-amber-700">{parsedResult.warningCount}</div>
                  <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                    Có cảnh báo (Trùng SĐT)
                  </div>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3.5 border border-rose-200 text-center">
                  <div className="text-xl font-black text-rose-700">{parsedResult.invalidCount}</div>
                  <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                    Dòng lỗi
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterMode("ALL")}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      filterMode === "ALL"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({parsedResult.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("VALID")}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      filterMode === "VALID"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Hợp lệ ({parsedResult.validCount})
                  </button>
                  {parsedResult.invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode("INVALID")}
                      className={`rounded-lg px-3 py-1.5 transition-all ${
                        filterMode === "INVALID"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-rose-600 hover:text-rose-800"
                      }`}
                    >
                      Có lỗi ({parsedResult.invalidCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm tên, SĐT trong danh sách..."
                    className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:bg-white focus:border-brand-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Chọn file khác
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-80 shadow-inner">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 font-extrabold text-slate-700 uppercase text-[10px] tracking-wider z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-12">STT</th>
                      <th className="px-3 py-2.5">Trạng thái</th>
                      <th className="px-3 py-2.5">Mã HV</th>
                      <th className="px-3 py-2.5">Họ và Tên (*)</th>
                      <th className="px-3 py-2.5">Năm sinh</th>
                      <th className="px-3 py-2.5">Giới tính</th>
                      <th className="px-3 py-2.5">Phụ huynh</th>
                      <th className="px-3 py-2.5">SĐT Phụ huynh (*)</th>
                      <th className="px-3 py-2.5">Trình độ</th>
                      <th className="px-3 py-2.5">Lớp phân bổ</th>
                      <th className="px-3 py-2.5">Học phí riêng</th>
                      <th className="px-3 py-2.5 text-center w-10">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-xs text-slate-500">
                          Không có dữ liệu phù hợp với bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => {
                        return (
                          <tr
                            key={r.index}
                            className={`hover:bg-slate-50 transition-colors ${
                              !r.isValid
                                ? "bg-rose-50/40"
                                : r.warnings.length > 0
                                ? "bg-amber-50/30"
                                : ""
                            }`}
                          >
                            <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-400">
                              {r.index}
                            </td>

                            {/* Badge Trạng thái */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              {!r.isValid ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>{r.errors[0] || "Lỗi"}</span>
                                </span>
                              ) : r.warnings.length > 0 ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                                  title={r.warnings.join(", ")}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{r.warnings[0]}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Hợp lệ</span>
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-500 whitespace-nowrap">
                              {r.code}
                            </td>

                            <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">
                              {r.fullName || <span className="text-rose-500 italic">Trống</span>}
                            </td>

                            <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                              {r.birthYear}
                            </td>

                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              {r.gender}
                            </td>

                            <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                              {r.parentName}
                            </td>

                            <td className="px-3 py-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {r.parentPhone || (
                                <span className="text-rose-500 italic">Trống</span>
                              )}
                            </td>

                            <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium">
                                {r.currentLevel}
                              </span>
                            </td>

                            {/* Lớp phân bổ */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <select
                                value={r.matchedClassId || "NONE"}
                                onChange={(e) => handleRowClassChange(r.index, e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-none focus:border-brand-primary"
                              >
                                <option value="NONE">Chưa xếp lớp</option>
                                {availableClasses.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                              {r.customFeePerSession
                                ? formatCurrencyVND(r.customFeePerSession)
                                : "Theo lớp"}
                            </td>

                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(r.index)}
                                title="Xóa dòng này khỏi danh sách nhập"
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Options & Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <input
                    id="skip-invalid"
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <label htmlFor="skip-invalid" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Bỏ qua các dòng lỗi và nhập các dòng hợp lệ ({parsedResult.validCount} học viên)
                  </label>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || (skipInvalid ? parsedResult.validCount === 0 : parsedResult.rows.length === 0)}
                    onClick={handleConfirmImport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Đang lưu vào hệ thống...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          Xác nhận nhập{" "}
                          {skipInvalid ? parsedResult.validCount : parsedResult.rows.length} học viên
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === "RESULT" && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 shadow-md">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Nhập Học Viên Thành Công!
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md">
                  Đã thêm thành công <strong>{importedCount}</strong> học sinh vào hệ thống dữ liệu CLB Cờ vua Kiện Tướng Tương Lai.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all active:scale-95"
                >
                  Hoàn Tất & Xem Danh Sách
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Nhập Thêm File Khác
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
