"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  FolderArchive,
  Copy,
  Check,
  Eye,
  Sparkles,
  QrCode,
  CheckSquare,
  Square,
  AlertCircle,
  FileImage,
  Layers,
} from "lucide-react";
import {
  InvoiceCardData,
  batchExportInvoiceCardsAsZip,
  downloadInvoiceCardPng,
  copyInvoiceCardToClipboard,
  generateInvoiceCardCanvas,
} from "@/lib/invoice-card-generator";
import { formatCurrencyVND } from "@/lib/vietqr";
import confetti from "canvas-confetti";

interface BatchCardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  month: number;
  year: number;
  students: InvoiceCardData[];
}

export default function BatchCardExportModal({
  isOpen,
  onClose,
  className,
  month,
  year,
  students,
}: BatchCardExportModalProps) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>(() =>
    students.map((s) => s.studentCode)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({
    current: 0,
    total: 0,
    studentName: "",
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewingStudent, setPreviewingStudent] = useState<InvoiceCardData | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedCodes.length === students.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(students.map((s) => s.studentCode));
    }
  };

  const toggleStudent = (code: string) => {
    if (selectedCodes.includes(code)) {
      setSelectedCodes(selectedCodes.filter((c) => c !== code));
    } else {
      setSelectedCodes([...selectedCodes, code]);
    }
  };

  const targetStudents = students.filter((s) =>
    selectedCodes.includes(s.studentCode)
  );

  // Xuất file nén .ZIP toàn bộ thẻ PNG
  const handleExportZip = async () => {
    if (targetStudents.length === 0) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: targetStudents.length, studentName: "" });

    try {
      const safeClass = className.replace(/[^a-zA-Z0-9\-_]/g, "_");
      const zipName = `KTTLL_AnhTheHocPhi_${safeClass}_T${month}_${year}.zip`;

      await batchExportInvoiceCardsAsZip(
        targetStudents,
        zipName,
        (current, total, studentName) => {
          setExportProgress({ current, total, studentName });
        }
      );

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (err) {
      console.error("Lỗi xuất file zip:", err);
      alert("Đã xảy ra lỗi khi tạo file nén ảnh. Vui lòng thử lại!");
    } finally {
      setIsExporting(false);
    }
  };

  // Sao chép ảnh thẻ của 1 học viên vào clipboard để dán thẳng vào Zalo
  const handleCopyImage = async (st: InvoiceCardData) => {
    const success = await copyInvoiceCardToClipboard(st);
    if (success) {
      setCopiedCode(st.studentCode);
      setTimeout(() => setCopiedCode(null), 2500);
    } else {
      alert("Không thể sao chép ảnh vào clipboard. Bạn có thể bấm 'Tải PNG' để lưu ảnh!");
    }
  };

  // Xem trước ảnh to
  const handlePreviewFull = async (st: InvoiceCardData) => {
    setPreviewingStudent(st);
    try {
      const canvas = await generateInvoiceCardCanvas(st);
      setPreviewImageUrl(canvas.toDataURL("image/png"));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl border border-slate-200 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-brand-primary text-white shadow-xs">
              <FileImage className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                  Xuất Hàng Loạt Ảnh Thẻ Học Phí (PNG)
                </h3>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Chuẩn Sắc Nét 2X
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Lớp: <strong className="text-slate-800">{className}</strong> • Tháng {month}/{year} • {students.length} học viên
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar điều khiển xuất */}
        <div className="bg-slate-900 p-3.5 text-white border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-medium transition-all text-slate-200"
            >
              {selectedCodes.length === students.length ? (
                <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Square className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>
                {selectedCodes.length === students.length ? "Bỏ chọn tất cả" : "Chọn tất cả"} ({selectedCodes.length}/{students.length})
              </span>
            </button>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Định dạng ảnh: PNG Độ phân giải cao, đính kèm sẵn mã VietQR
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isExporting || targetStudents.length === 0}
              onClick={handleExportZip}
              className="flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              title="Tải 1 file nén .ZIP chứa toàn bộ ảnh PNG đã tạo"
            >
              <FolderArchive className="h-3.5 w-3.5" />
              <span>
                {isExporting ? "Đang xuất..." : `Tải Trọn Bộ File Nén (.ZIP) (${targetStudents.length} Ảnh)`}
              </span>
            </button>
          </div>
        </div>

        {/* Thanh tiến độ xuất ảnh (Progress Bar) */}
        {isExporting && (
          <div className="bg-emerald-950 p-3.5 border-b border-emerald-800 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-emerald-200 font-medium mb-1">
              <span>
                ⏳ Đang vẽ và xuất ảnh thẻ học phí: {exportProgress.studentName} ({exportProgress.current}/{exportProgress.total})
              </span>
              <span>
                {Math.round((exportProgress.current / exportProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-emerald-900/60 rounded h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-2 rounded transition-all duration-300"
                style={{
                  width: `${(exportProgress.current / exportProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Danh sách thẻ học viên */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-2.5 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {students.map((st) => {
              const isSelected = selectedCodes.includes(st.studentCode);
              const isCopied = copiedCode === st.studentCode;

              return (
                <div
                  key={st.studentCode}
                  className={`rounded border p-3 transition-all ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-50/25 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div
                      className="flex items-center gap-2 cursor-pointer min-w-0"
                      onClick={() => toggleStudent(st.studentCode)}
                    >
                      <button
                        type="button"
                        className="text-emerald-600 hover:text-emerald-700 mt-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {st.studentCode}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {st.studentName}
                          </h4>
                          {st.classList && st.classList.length > 1 && (
                            <span className="rounded bg-teal-100 text-teal-800 px-1.5 py-0.2 text-[9.5px] font-bold border border-teal-200">
                              Gộp {st.classList.length} lớp
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {st.presentCount} buổi thực học •{" "}
                          <strong className="text-emerald-700 font-bold">
                            {formatCurrencyVND(st.totalAmount)}
                          </strong>
                        </p>
                        {st.classList && st.classList.length > 1 && (
                          <p className="text-[10px] text-teal-700 font-medium truncate mt-0.5">
                            {st.classList.map((c) => `${c.className} (${c.presentCount}b)`).join(" + ")}
                          </p>
                        )}
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          Cú pháp: {st.transferContent}
                        </p>
                      </div>
                    </div>

                    {/* Actions cho từng học viên */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Xem trước */}
                      <button
                        type="button"
                        onClick={() => handlePreviewFull(st)}
                        className="flex h-7 w-7 items-center justify-center rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition-colors"
                        title="Xem ảnh thẻ phóng to"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Copy ảnh để dán vào Zalo */}
                      <button
                        type="button"
                        onClick={() => handleCopyImage(st)}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-all shadow-xs ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                        }`}
                        title="Sao chép ảnh thẻ trực tiếp vào Clipboard (nhấn Ctrl+V để dán vào chat Zalo)"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-white" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Chép</span>
                          </>
                        )}
                      </button>

                      {/* Tải PNG */}
                      <button
                        type="button"
                        onClick={() => downloadInvoiceCardPng(st)}
                        className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs font-semibold shadow-xs active:scale-95 transition-all"
                        title="Tải ảnh PNG thẻ học phí về máy"
                      >
                        <Download className="h-3 w-3" />
                        <span>PNG</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3 gap-2.5">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              Ảnh PNG xuất ra có kèm sẵn mã VietQR Napas 24/7 và thông tin học phí để HLV gửi riêng đến phụ huynh.
            </span>
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isExporting || targetStudents.length === 0}
              onClick={handleExportZip}
              className="flex items-center gap-1.5 rounded bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs active:scale-95 transition-all disabled:opacity-50"
            >
              <FolderArchive className="h-3.5 w-3.5" />
              <span>Tải File .ZIP ({targetStudents.length} ảnh)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded bg-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Modal Xem trước ảnh đầy đủ phóng to */}
      {previewingStudent && previewImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewingStudent(null)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-lg p-4 shadow-xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
              <h4 className="font-bold text-slate-900 text-sm">
                Ảnh Thẻ Học Phí: {previewingStudent.studentName} ({previewingStudent.studentCode})
              </h4>
              <button
                onClick={() => setPreviewingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto rounded border border-slate-100 shadow-xs">
              <img
                src={previewImageUrl}
                alt="Thẻ học phí"
                className="w-full h-auto object-contain rounded"
              />
            </div>

            <div className="w-full mt-2.5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleCopyImage(previewingStudent)}
                className="flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Sao Chép Ảnh</span>
              </button>

              <button
                type="button"
                onClick={() => downloadInvoiceCardPng(previewingStudent)}
                className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải File PNG</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
