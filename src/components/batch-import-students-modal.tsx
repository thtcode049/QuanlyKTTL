"use client";

import React, { useState, useRef, useId, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Users,
  Sparkles,
  ClipboardPaste,
  Plus,
  Upload,
  RotateCcw,
  Check,
  ArrowLeft,
  UserCheck,
  UserPlus,
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
  splitClipboardIntoLines,
} from "@/lib/student-import";
import { formatCurrencyVND } from "@/lib/vietqr";

interface BatchImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableClasses: ClassroomData[];
  initialClassId?: string;
  onImportSuccess?: (count: number) => void;
}

interface DuplicateResolution {
  rowIndex: number;
  row: EditableStudentRow;
  matchedStudent: StudentData;
  matchType: "NAME" | "PHONE" | "BOTH";
  action: "USE_EXISTING" | "CREATE_NEW";
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
  const [step, setStep] = useState<"TABLE" | "DUPLICATES" | "RESULT">("TABLE");
  const [targetClassId, setTargetClassId] = useState<string>(initialClassId || "AUTO");
  const [rows, setRows] = useState<EditableStudentRow[]>(() => initDefaultRows(initialClassId));
  const [duplicateResolutions, setDuplicateResolutions] = useState<DuplicateResolution[]>([]);
  const [pendingValidRows, setPendingValidRows] = useState<EditableStudentRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [manualPasteTargetField, setManualPasteTargetField] = useState<
    "ALL" | keyof EditableStudentRow
  >("ALL");
  const [manualPasteText, setManualPasteText] = useState("");

  // Cập nhật khi mở modal hoặc đổi initialClassId
  useEffect(() => {
    if (isOpen) {
      setStep("TABLE");
      setRows(initDefaultRows(initialClassId));
      setTargetClassId(initialClassId || "AUTO");
      setToastMessage("");
      setDuplicateResolutions([]);
      setPendingValidRows([]);
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

  // Dán dọc một cột bắt đầu từ dòng rowIndex
  const applyColumnLinesToRows = (
    field: keyof EditableStudentRow,
    rawLines: string[],
    startRowIndex: number = 0
  ) => {
    if (rawLines.length === 0) return;

    // Lọc tiêu đề nếu người dùng copy cả ô tiêu đề Excel
    let processedLines = [...rawLines];
    const firstLower = processedLines[0].toLowerCase();
    if (
      field === "fullName" &&
      /^(họ\s*(và\s*)?tên|họ\s*tên|tên\s*học\s*viên|tên\s*học\s*sinh|tên|full\s*name|name)$/i.test(
        firstLower
      )
    ) {
      processedLines.shift();
    } else if (
      field === "parentPhone" &&
      /^(số\s*điện\s*thoại|sđt|điện\s*thoại|sđt\s*phụ\s*huynh|phone|mobile|tel)$/i.test(firstLower)
    ) {
      processedLines.shift();
    } else if (
      field === "birthYear" &&
      /^(năm\s*sinh|ngày\s*sinh|ns|dob|birth)$/i.test(firstLower)
    ) {
      processedLines.shift();
    }

    if (processedLines.length === 0) return;

    setRows((prev) => {
      const updated = [...prev];
      const defaultCls = targetClassId && targetClassId !== "AUTO" ? targetClassId : "NONE";

      // Mở rộng thêm dòng nếu thiếu
      while (updated.length < startRowIndex + processedLines.length) {
        updated.push(createEmptyStudentRow(defaultCls));
      }

      processedLines.forEach((val, i) => {
        const targetIdx = startRowIndex + i;
        let finalVal = val;
        if (field === "parentPhone") {
          finalVal = normalizePhoneNumber(val);
        } else if (field === "birthYear") {
          const by = extractBirthYear(val);
          finalVal = by ? String(by) : "";
        } else if (field === "customFee") {
          const fee = normalizeFee(val);
          finalVal = fee ? String(fee) : "";
        }

        updated[targetIdx] = {
          ...updated[targetIdx],
          [field]: finalVal,
        };
      });

      return updated;
    });

    const fieldLabels: Record<string, string> = {
      fullName: "Họ và tên",
      parentPhone: "SĐT phụ huynh",
      birthYear: "Năm sinh",
      gender: "Giới tính",
      school: "Trường học",
      customFee: "Học phí riêng",
      notes: "Ghi chú",
    };
    notify(
      `✨ Đã dán ${processedLines.length} dòng vào cột "${fieldLabels[String(field)] || String(field)}"!`
    );
  };

  // Dán ma trận nhiều cột bắt đầu từ (startRowIndex, startField)
  const applyMatrixPasteStartingAt = (
    text: string,
    startRowIndex: number,
    startField: keyof EditableStudentRow
  ) => {
    const lines = splitClipboardIntoLines(text);
    if (lines.length === 0) return;

    const colOrder: (keyof EditableStudentRow)[] = [
      "fullName",
      "parentPhone",
      "birthYear",
      "gender",
      "classId",
      "customFee",
      "school",
      "notes",
    ];

    let startColIdx = colOrder.indexOf(startField);
    if (startColIdx === -1) startColIdx = 0;

    setRows((prev) => {
      const updated = [...prev];
      const defaultCls = targetClassId && targetClassId !== "AUTO" ? targetClassId : "NONE";

      while (updated.length < startRowIndex + lines.length) {
        updated.push(createEmptyStudentRow(defaultCls));
      }

      lines.forEach((line, rIdx) => {
        const cells = line.split("\t");
        const targetRow = startRowIndex + rIdx;

        cells.forEach((cellVal, cIdx) => {
          const fieldIdx = startColIdx + cIdx;
          if (fieldIdx < colOrder.length) {
            const f = colOrder[fieldIdx];
            const raw = cellVal.trim();
            let finalVal: any = raw;
            if (f === "parentPhone") {
              finalVal = normalizePhoneNumber(raw);
            } else if (f === "birthYear") {
              const by = extractBirthYear(raw);
              finalVal = by ? String(by) : "";
            } else if (f === "customFee") {
              const fee = normalizeFee(raw);
              finalVal = fee ? String(fee) : "";
            }
            updated[targetRow] = {
              ...updated[targetRow],
              [f]: finalVal,
            };
          }
        });
      });

      return updated;
    });

    notify(`✨ Đã dán ${lines.length} dòng dữ liệu vào bảng!`);
  };

  // Bắt sự kiện Paste trên từng ô (cell)
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    field: keyof EditableStudentRow
  ) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    // Nếu chỉ là chuỗi ngắn không có xuống dòng hay tab -> để trình duyệt paste bình thường vào ô đó
    if (!text.includes("\n") && !text.includes("\r") && !text.includes("\t")) {
      return;
    }

    e.preventDefault();

    if (text.includes("\t")) {
      // Dán ma trận nhiều cột
      applyMatrixPasteStartingAt(text, rowIndex, field);
    } else {
      // Dán 1 cột dọc nhiều dòng (giữ nguyên 100% dòng trống)
      const lines = splitClipboardIntoLines(text);
      applyColumnLinesToRows(field, lines, rowIndex);
    }
  };

  // Nút Dán nhanh theo Cột ở Header (Họ tên, SĐT, ...)
  const handlePasteColumn = async (field: keyof EditableStudentRow) => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const lines = splitClipboardIntoLines(text);
          if (lines.length > 0) {
            applyColumnLinesToRows(field, lines, 0);
            return;
          }
        }
      }
      setManualPasteTargetField(field);
      setShowPasteModal(true);
    } catch (err) {
      setManualPasteTargetField(field);
      setShowPasteModal(true);
    }
  };

  // Thêm dữ liệu từ chuỗi dán toàn bộ bảng (Clipboard TSV / CSV)
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
    // Nếu sự kiện xuất phát từ ô input/select con thì ô con đã xử lý
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") {
      return;
    }

    const text = e.clipboardData.getData("text");
    if (text && (text.includes("\n") || text.includes("\t"))) {
      e.preventDefault();
      applyPastedTextToRows(text);
    }
  };

  // Xử lý nút "Dán từ Clipboard" chính
  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          applyPastedTextToRows(text);
          return;
        }
      }
      setManualPasteTargetField("ALL");
      setShowPasteModal(true);
    } catch (err) {
      setManualPasteTargetField("ALL");
      setShowPasteModal(true);
    }
  };

  // Xử lý dán qua Modal thủ công
  const handleApplyManualPaste = () => {
    if (!manualPasteText) return;

    if (manualPasteTargetField === "ALL") {
      applyPastedTextToRows(manualPasteText);
    } else {
      const lines = splitClipboardIntoLines(manualPasteText);
      applyColumnLinesToRows(manualPasteTargetField, lines, 0);
    }

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

  // Tính toán trạng thái các dòng (Số điện thoại phụ huynh KHÔNG bắt buộc)
  const rowStatuses = rows.map((r) => {
    const name = r.fullName.trim();
    const phone = normalizePhoneNumber(r.parentPhone);
    const isBlank = !name && !r.parentPhone.trim() && !r.school.trim() && !r.notes.trim();
    const hasName = name.length >= 2;
    const isPhoneValid = !r.parentPhone.trim() || (phone.length >= 9 && phone.length <= 11);
    const isValid = hasName && isPhoneValid;

    let issue = "";
    if (!isBlank) {
      if (!hasName) issue = "Thiếu Họ và tên";
      else if (!isPhoneValid) issue = "SĐT PH chưa đúng 9-11 số";
    }

    return { isValid, isBlank, issue };
  });

  const validRowsCount = rowStatuses.filter((s) => s.isValid).length;
  const blankRowsCount = rowStatuses.filter((s) => s.isBlank).length;
  const issueRowsCount = rowStatuses.filter((s) => !s.isValid && !s.isBlank).length;

  // Xác nhận lưu vào hệ thống: kiểm tra trùng lặp trước khi lưu
  const handleSaveStudents = async () => {
    const validRows = rows.filter((r) => {
      const name = r.fullName.trim();
      const phone = normalizePhoneNumber(r.parentPhone);
      const isPhoneValid = !r.parentPhone.trim() || (phone.length >= 9 && phone.length <= 11);
      return name.length >= 2 && isPhoneValid;
    });

    if (validRows.length === 0) {
      alert(
        "Chưa có học viên nào hợp lệ để lưu!\nVui lòng nhập ít nhất Họ và tên học sinh (từ 2 ký tự trở lên)."
      );
      return;
    }

    // Kiểm tra xem có học viên nào trùng tên hoặc trùng liên hệ (SĐT) với học viên trong hệ thống không
    const duplicates: DuplicateResolution[] = [];
    validRows.forEach((r, idx) => {
      const cleanName = r.fullName.trim().toLowerCase();
      const cleanPhone = normalizePhoneNumber(r.parentPhone);

      const match = dataStore.students.find((s) => {
        const sName = s.fullName.trim().toLowerCase();
        const sPhone = normalizePhoneNumber(s.parentPhone);
        const nameMatch = sName === cleanName;
        const phoneMatch = cleanPhone.length >= 8 && sPhone.length >= 8 && sPhone === cleanPhone;
        return nameMatch || phoneMatch;
      });

      if (match) {
        const sName = match.fullName.trim().toLowerCase();
        const sPhone = normalizePhoneNumber(match.parentPhone);
        const nameMatch = sName === cleanName;
        const phoneMatch = cleanPhone.length >= 8 && sPhone.length >= 8 && sPhone === cleanPhone;
        const matchType: "BOTH" | "NAME" | "PHONE" =
          nameMatch && phoneMatch ? "BOTH" : nameMatch ? "NAME" : "PHONE";

        duplicates.push({
          rowIndex: idx,
          row: r,
          matchedStudent: match,
          matchType,
          action: "USE_EXISTING", // Mặc định: Lấy từ danh sách cũ (gán vào lớp này)
        });
      }
    });

    if (duplicates.length > 0) {
      setDuplicateResolutions(duplicates);
      setPendingValidRows(validRows);
      setStep("DUPLICATES");
      return;
    }

    // Nếu không trùng, tiến hành lưu trực tiếp
    await executeSave(validRows, []);
  };

  // Thực hiện lưu cuối cùng sau khi đã xử lý xác nhận trùng lặp
  const executeSave = async (
    validRows: EditableStudentRow[],
    resolutions: DuplicateResolution[]
  ) => {
    setIsSubmitting(true);
    try {
      let nextCodeNum = dataStore.students.length + 1;
      const resolutionMap = new Map<number, DuplicateResolution>();
      resolutions.forEach((res) => {
        resolutionMap.set(res.rowIndex, res);
      });

      let updatedExistingCount = 0;
      const newStudentsToSave: StudentData[] = [];

      for (let i = 0; i < validRows.length; i++) {
        const r = validRows[i];
        const res = resolutionMap.get(i);

        const targetClass =
          r.classId && r.classId !== "NONE" && r.classId !== "AUTO"
            ? r.classId
            : targetClassId && targetClassId !== "AUTO" && targetClassId !== "NONE"
            ? targetClassId
            : undefined;

        if (res && res.action === "USE_EXISTING") {
          // Lấy từ danh sách cũ: cập nhật học sinh sẵn có và gán thêm lớp học này
          const existing = res.matchedStudent;
          if (targetClass && !existing.classIds.includes(targetClass)) {
            existing.classIds = [...existing.classIds, targetClass];
          }
          if (r.customFee) {
            existing.customFeePerSession = normalizeFee(r.customFee);
          }
          if (!existing.parentPhone && r.parentPhone.trim()) {
            existing.parentPhone = normalizePhoneNumber(r.parentPhone);
          }
          if (!existing.birthYear && r.birthYear) {
            existing.birthYear = extractBirthYear(r.birthYear);
          }
          if (r.school?.trim() && !existing.school) {
            existing.school = r.school.trim();
          }
          dataStore.updateStudent(existing.id, existing);
          updatedExistingCount++;
        } else {
          // Thêm học viên mới
          const classIds: string[] = targetClass ? [targetClass] : [];
          let classLevel = "";
          if (classIds.length > 0) {
            const foundCls = availableClasses.find((c) => c.id === classIds[0]);
            if (foundCls) classLevel = foundCls.level;
          }

          const birthYear = extractBirthYear(r.birthYear);
          const fee = normalizeFee(r.customFee);
          const phone = normalizePhoneNumber(r.parentPhone);
          const name = r.fullName.trim();

          newStudentsToSave.push({
            id: `std-bulk-${Date.now()}-${i + 1}-${Math.random().toString(36).substring(2, 6)}`,
            code: `HS${(nextCodeNum++).toString().padStart(3, "0")}`,
            fullName: name,
            birthYear,
            gender: (r.gender as "Nam" | "Nữ") || undefined,
            parentName: "",
            parentPhone: phone,
            currentLevel: classLevel || undefined,
            classIds,
            customFeePerSession: fee,
            school: r.school.trim() || undefined,
            address: r.address?.trim() || undefined,
            notes: r.notes.trim() || undefined,
            status: "ACTIVE",
          });
        }
      }

      if (newStudentsToSave.length > 0) {
        await dataStore.addStudentsBatch(
          newStudentsToSave,
          targetClassId === "AUTO" || targetClassId === "NONE" ? undefined : targetClassId
        );
      }

      dataStore.saveToLocalStorage();
      setImportedCount(newStudentsToSave.length + updatedExistingCount);
      setStep("RESULT");

      try {
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      if (onImportSuccess) {
        onImportSuccess(newStudentsToSave.length + updatedExistingCount);
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
                  Dán từng cột hoặc cả bảng linh hoạt
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">
                Điền hoặc copy từ Excel dán từng cột (bấm nút{" "}
                <span className="font-bold text-emerald-700">Dán cột</span> ở đầu mỗi cột hoặc{" "}
                <span className="font-bold text-slate-700">Ctrl+V</span> vào ô đầu tiên). Các cột
                năm sinh, giới tính nếu không có thì để trống.
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
        <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5 space-y-3">
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
                    <span>Dán toàn bảng (Ctrl + V)</span>
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
              <div className="flex items-center justify-between rounded-xl bg-amber-50/80 px-3.5 py-2 border border-amber-200 text-[11px] text-amber-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Dán linh hoạt theo từng cột:</strong> Bạn có thể copy riêng cột Họ tên
                    trong Excel rồi bấm nút{" "}
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded">
                      📋 Dán cột
                    </span>{" "}
                    ở cột Họ và tên, sau đó copy cột SĐT phụ huynh rồi bấm{" "}
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded">
                      📋 Dán cột
                    </span>{" "}
                    ở cột SĐT! Hoặc chọn ô đầu tiên và bấm <strong>Ctrl+V</strong> để điền dọc
                    xuống. Các cột năm sinh, giới tính nếu không có sẽ tự động để trống.
                  </span>
                </div>
              </div>

              {/* Spreadsheet Grid Table */}
              <div
                ref={tableContainerRef}
                className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-inner max-h-[56vh]"
              >
                <table className="w-full border-collapse text-left text-xs min-w-[1100px]">
                  <thead className="sticky top-0 z-20 bg-slate-100 font-extrabold text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-300">
                    <tr>
                      <th className="px-2 py-2.5 text-center w-12 bg-slate-100">#</th>
                      {/* Cột 1: Họ và tên (*) với nút Dán cột */}
                      <th className="px-3 py-2 w-64 bg-slate-100">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-emerald-700 font-extrabold">Họ và tên (*)</span>
                          <button
                            type="button"
                            onClick={() => handlePasteColumn("fullName")}
                            title="Dán danh sách Họ và tên từ Clipboard vào cột này"
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 px-1.5 py-0.5 text-[9px] font-bold text-white transition-all shadow-xs cursor-pointer"
                          >
                            <ClipboardPaste className="h-3 w-3" />
                            <span>Dán cột</span>
                          </button>
                        </div>
                      </th>
                      {/* Cột 2: SĐT Phụ huynh (tùy chọn) với nút Dán cột */}
                      <th className="px-3 py-2 w-56 bg-slate-100">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-slate-700 font-extrabold">
                            SĐT Phụ huynh (tùy chọn)
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePasteColumn("parentPhone")}
                            title="Dán danh sách Số điện thoại từ Clipboard vào cột này"
                            className="inline-flex items-center gap-1 rounded bg-slate-600 hover:bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold text-white transition-all shadow-xs cursor-pointer"
                          >
                            <ClipboardPaste className="h-3 w-3" />
                            <span>Dán cột</span>
                          </button>
                        </div>
                      </th>
                      {/* Cột 3: Năm sinh (cho phép để trống) */}
                      <th className="px-2 py-2.5 w-24 bg-slate-100 text-center">Năm sinh</th>
                      {/* Cột 4: Giới tính (cho phép để trống) */}
                      <th className="px-2 py-2.5 w-28 bg-slate-100">Giới tính</th>
                      {/* Cột 5: Lớp học */}
                      <th className="px-3 py-2.5 w-56 bg-slate-100">Lớp học</th>
                      {/* Cột 6: Học phí riêng */}
                      <th className="px-2 py-2.5 w-32 bg-slate-100 text-right">Học phí riêng (VNĐ)</th>
                      {/* Cột 7: Trường học */}
                      <th className="px-3 py-2.5 w-40 bg-slate-100">Trường học</th>
                      {/* Cột 8: Ghi chú */}
                      <th className="px-3 py-2.5 min-w-[180px] bg-slate-100">Ghi chú</th>
                      {/* Xóa dòng */}
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
                              onPaste={(e) => handleCellPaste(e, idx, "fullName")}
                              placeholder="VD: Nguyễn Gia Huy"
                              className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none transition-all ${
                                !row.fullName.trim() && !isRowBlank
                                  ? "border border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500"
                                  : "border border-slate-200 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                              }`}
                            />
                          </td>

                          {/* SĐT phụ huynh (Không bắt buộc) */}
                          <td className="px-2 py-1.5">
                            {(() => {
                              const cleanPhone = normalizePhoneNumber(row.parentPhone);
                              const hasPhoneError =
                                row.parentPhone.trim().length > 0 &&
                                (cleanPhone.length < 9 || cleanPhone.length > 11);
                              return (
                                <input
                                  type="text"
                                  value={row.parentPhone}
                                  onChange={(e) =>
                                    handleCellChange(row.id, "parentPhone", e.target.value)
                                  }
                                  onPaste={(e) => handleCellPaste(e, idx, "parentPhone")}
                                  placeholder="0912... (tùy chọn)"
                                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none transition-all ${
                                    hasPhoneError
                                      ? "border border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500"
                                      : "border border-slate-200 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                                  }`}
                                />
                              );
                            })()}
                          </td>

                          {/* Năm sinh (để trống được) */}
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={row.birthYear}
                              onChange={(e) => handleCellChange(row.id, "birthYear", e.target.value)}
                              onPaste={(e) => handleCellPaste(e, idx, "birthYear")}
                              placeholder="Trống"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono text-slate-800 text-center focus:border-emerald-600 focus:outline-none placeholder:text-slate-300"
                            />
                          </td>

                          {/* Giới tính (để trống được) */}
                          <td className="px-2 py-1.5">
                            <select
                              value={row.gender}
                              onChange={(e) =>
                                handleCellChange(row.id, "gender", e.target.value as "Nam" | "Nữ" | "")
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
                            >
                              <option value="">-- Để trống --</option>
                              <option value="Nam">Nam</option>
                              <option value="Nữ">Nữ</option>
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
                                  {c.name} ({c.level})
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
                              onPaste={(e) => handleCellPaste(e, idx, "customFee")}
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
                              onPaste={(e) => handleCellPaste(e, idx, "school")}
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
                              onPaste={(e) => handleCellPaste(e, idx, "notes")}
                              placeholder="Ghi chú thêm..."
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                            />
                          </td>

                          {/* Nút xóa dòng */}
                          <td className="px-2 py-1.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
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
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || validRowsCount === 0}
                    onClick={handleSaveStudents}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
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

          {/* STEP: DUPLICATES CONFIRMATION */}
          {step === "DUPLICATES" && (
            <div className="flex-1 overflow-hidden flex flex-col space-y-4 animate-fade-in">
              {/* Banner cảnh báo trùng */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-extrabold text-amber-900">
                      Phát hiện {duplicateResolutions.length} học viên có thông tin trùng khớp với hệ thống
                    </h4>
                    <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                      Các học viên dưới đây trùng <strong>Họ tên</strong> hoặc <strong>Số điện thoại</strong> với học viên đã có trong danh sách CLB.
                      Vui lòng chọn <strong>Lấy từ danh sách cũ</strong> (gán học viên cũ vào lớp học này) hoặc <strong>Thêm học viên mới</strong> (tạo hồ sơ mới riêng biệt):
                    </p>

                    {/* Quick batch toggle buttons */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60">
                      <span className="text-[11px] font-bold text-amber-900">Chọn nhanh cho tất cả:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateResolutions((prev) =>
                            prev.map((item) => ({ ...item, action: "USE_EXISTING" }))
                          );
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Tất cả: Lấy từ danh sách cũ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateResolutions((prev) =>
                            prev.map((item) => ({ ...item, action: "CREATE_NEW" }))
                          );
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Tất cả: Thêm học viên mới</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable List of Duplicate Cards */}
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-3 max-h-[50vh]">
                {duplicateResolutions.map((item, idx) => {
                  const targetClsId =
                    item.row.classId && item.row.classId !== "NONE" && item.row.classId !== "AUTO"
                      ? item.row.classId
                      : targetClassId && targetClassId !== "AUTO" && targetClassId !== "NONE"
                      ? targetClassId
                      : "";
                  const targetClassName =
                    availableClasses.find((c) => c.id === targetClsId)?.name || "(Chưa chọn lớp)";
                  const existingClassNames = item.matchedStudent.classIds
                    .map((cid) => availableClasses.find((c) => c.id === cid)?.name || cid)
                    .filter(Boolean);

                  return (
                    <div
                      key={item.rowIndex}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {item.row.fullName}
                          </span>
                        </div>

                        {/* Match Reason Badge */}
                        <div>
                          {item.matchType === "BOTH" ? (
                            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800">
                              ⚠️ Trùng cả Họ tên & Số điện thoại
                            </span>
                          ) : item.matchType === "NAME" ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                              👤 Trùng Họ và tên
                            </span>
                          ) : (
                            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-800">
                              📞 Trùng Số điện thoại phụ huynh
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Side by side comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Cột 1: Thông tin nhập từ sheet */}
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-1.5">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <FileSpreadsheet className="h-3 w-3" />
                            <span>Thông tin nhập từ Sheet:</span>
                          </div>
                          <div className="font-bold text-slate-800 text-sm">{item.row.fullName}</div>
                          <div className="text-slate-600">
                            SĐT phụ huynh:{" "}
                            <span className="font-mono font-semibold text-slate-800">
                              {item.row.parentPhone || "(Chưa nhập)"}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Năm sinh:{" "}
                            <span className="font-semibold text-slate-800">
                              {item.row.birthYear || "—"}
                            </span>{" "}
                            • Giới tính:{" "}
                            <span className="font-semibold text-slate-800">
                              {item.row.gender || "—"}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Lớp muốn thêm vào:{" "}
                            <span className="font-bold text-emerald-700">{targetClassName}</span>
                          </div>
                        </div>

                        {/* Cột 2: Học viên trùng khớp có sẵn trong hệ thống */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>Học viên trùng trong hệ thống:</span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm">
                            {item.matchedStudent.fullName}{" "}
                            <span className="font-mono text-xs font-normal text-slate-500">
                              ({item.matchedStudent.code})
                            </span>
                          </div>
                          <div className="text-slate-600">
                            SĐT hiện tại:{" "}
                            <span className="font-mono font-semibold text-slate-800">
                              {item.matchedStudent.parentPhone || "(Chưa có SĐT)"}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Năm sinh:{" "}
                            <span className="font-semibold text-slate-800">
                              {item.matchedStudent.birthYear || "—"}
                            </span>{" "}
                            • Trình độ:{" "}
                            <span className="font-semibold text-slate-800">
                              {item.matchedStudent.currentLevel || "—"}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Các lớp đang học:{" "}
                            <span className="font-semibold text-slate-800">
                              {existingClassNames.join(", ") || "(Chưa xếp lớp)"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action selector */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDuplicateResolutions((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, action: "USE_EXISTING" } : p
                              )
                            );
                          }}
                          className={`flex-1 rounded-xl p-2.5 text-left transition-all border cursor-pointer ${
                            item.action === "USE_EXISTING"
                              ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20 shadow-xs"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                item.action === "USE_EXISTING"
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-300"
                              }`}
                            >
                              {item.action === "USE_EXISTING" && <Check className="h-3 w-3" />}
                            </div>
                            <span className="font-bold text-xs">
                              Lấy từ danh sách cũ (Gán vào lớp này)
                            </span>
                          </div>
                          <p className="mt-1 ml-6 text-[11px] text-slate-500 leading-tight">
                            Giữ nguyên mã {item.matchedStudent.code}, bổ sung học viên vào lớp mới và kế thừa toàn bộ lịch sử điểm danh.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDuplicateResolutions((prev) =>
                              prev.map((p, i) =>
                                i === idx ? { ...p, action: "CREATE_NEW" } : p
                              )
                            );
                          }}
                          className={`flex-1 rounded-xl p-2.5 text-left transition-all border cursor-pointer ${
                            item.action === "CREATE_NEW"
                              ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20 shadow-xs"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                item.action === "CREATE_NEW"
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300"
                              }`}
                            >
                              {item.action === "CREATE_NEW" && <Check className="h-3 w-3" />}
                            </div>
                            <span className="font-bold text-xs">
                              Thêm học viên mới (Tạo hồ sơ mới)
                            </span>
                          </div>
                          <p className="mt-1 ml-6 text-[11px] text-slate-500 leading-tight">
                            Tạo một hồ sơ học viên độc lập hoàn toàn với mã học sinh mới.
                          </p>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setStep("TABLE")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Quay lại chỉnh sửa bảng</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeSave(pendingValidRows, duplicateResolutions)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Đang lưu học viên...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Xác Nhận & Hoàn Tất Lưu ({pendingValidRows.length} Học Viên)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                >
                  Hoàn Tất & Xem Danh Sách
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("TABLE");
                    setRows(initDefaultRows(targetClassId));
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
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
                <span>
                  {manualPasteTargetField === "fullName"
                    ? "Dán cột Họ và tên học sinh"
                    : manualPasteTargetField === "parentPhone"
                    ? "Dán cột Số điện thoại phụ huynh"
                    : "Dán dữ liệu từ Excel / Google Sheets"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {manualPasteTargetField !== "ALL" ? (
                <>
                  Dán (<strong>Ctrl + V</strong>) danh sách dữ liệu cho cột này vào khung dưới đây
                  (mỗi học sinh một dòng):
                </>
              ) : (
                <>
                  Nhấn <strong>Ctrl + V</strong> vào khung bên dưới rồi bấm{" "}
                  <strong>Nhập Vào Bảng</strong>:
                </>
              )}
            </p>
            <textarea
              rows={8}
              value={manualPasteText}
              onChange={(e) => setManualPasteText(e.target.value)}
              placeholder={
                manualPasteTargetField === "fullName"
                  ? "Nguyễn Gia Huy\nTrần Phương Linh\nĐào Lê Nguyên Đức"
                  : manualPasteTargetField === "parentPhone"
                  ? "0912345678\n0987654321\n0901234567"
                  : "Nguyễn Gia Huy\t0912345678\t2017\tNam\nTrần Phương Linh\t0987654321\t2018\tNữ"
              }
              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono focus:border-emerald-600 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!manualPasteText.trim()}
                onClick={handleApplyManualPaste}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
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
