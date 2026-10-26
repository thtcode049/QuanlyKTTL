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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 ring-1 ring-slate-900/10 my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-slate-50 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25">
              <FileImage className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 sm:text-lg">
                  Xuất Hàng Loạt Ảnh Thẻ Học Phí (PNG)
                </h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
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
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar điều khiển xuất */}
        <div className="bg-slate-900 p-4 text-white border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold transition-all text-slate-200"
            >
              {selectedCodes.length === students.length ? (
                <CheckSquare className="h-4 w-4 text-emerald-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
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
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              title="Tải 1 file nén .ZIP chứa toàn bộ ảnh PNG đã tạo"
            >
              <FolderArchive className="h-4 w-4" />
              <span>
                {isExporting ? "Đang xuất..." : `Tải Trọn Bộ File Nén (.ZIP) (${targetStudents.length} Ảnh)`}
              </span>
            </button>
          </div>
        </div>

        {/* Thanh tiến độ xuất ảnh (Progress Bar) */}
        {isExporting && (
          <div className="bg-emerald-950 p-4 border-b border-emerald-800 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-emerald-200 font-bold mb-1.5">
              <span>
                ⏳ Đang vẽ và xuất ảnh thẻ học phí: {exportProgress.studentName} ({exportProgress.current}/{exportProgress.total})
              </span>
              <span>
                {Math.round((exportProgress.current / exportProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-emerald-900/60 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(exportProgress.current / exportProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Danh sách thẻ học viên */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {students.map((st) => {
              const isSelected = selectedCodes.includes(st.studentCode);
              const isCopied = copiedCode === st.studentCode;

              return (
                <div
                  key={st.studentCode}
                  className={`rounded-2xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-50/25 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer min-w-0"
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-500">
                            {st.studentCode}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {st.studentName}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {st.presentCount} buổi thực học •{" "}
                          <strong className="text-emerald-700 font-black">
                            {formatCurrencyVND(st.totalAmount)}
                          </strong>
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          Cú pháp: {st.transferContent}
                        </p>
                      </div>
                    </div>

                    {/* Actions cho từng học viên */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Xem trước */}
                      <button
                        type="button"
                        onClick={() => handlePreviewFull(st)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition-colors"
                        title="Xem ảnh thẻ phóng to"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Copy ảnh để dán vào Zalo */}
                      <button
                        type="button"
                        onClick={() => handleCopyImage(st)}
                        className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all shadow-xs ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                        }`}
                        title="Sao chép ảnh thẻ trực tiếp vào Clipboard (nhấn Ctrl+V để dán vào chat Zalo)"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-white" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Chép</span>
                          </>
                        )}
                      </button>

                      {/* Tải PNG */}
                      <button
                        type="button"
                        onClick={() => downloadInvoiceCardPng(st)}
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all"
                        title="Tải ảnh PNG thẻ học phí về máy"
                      >
                        <Download className="h-3.5 w-3.5" />
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
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3.5 gap-3">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Ảnh PNG xuất ra có kèm sẵn mã VietQR Napas 24/7 và thông tin học phí để HLV gửi riêng đến phụ huynh.
            </span>
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isExporting || targetStudents.length === 0}
              onClick={handleExportZip}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <FolderArchive className="h-4 w-4" />
              <span>Tải File .ZIP ({targetStudents.length} ảnh)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Modal Xem trước ảnh đầy đủ phóng to */}
      {previewingStudent && previewImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewingStudent(null)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                Ảnh Thẻ Học Phí: {previewingStudent.studentName} ({previewingStudent.studentCode})
              </h4>
              <button
                onClick={() => setPreviewingStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto rounded-2xl border border-slate-100 shadow-inner">
              <img
                src={previewImageUrl}
                alt="Thẻ học phí"
                className="w-full h-auto object-contain rounded-2xl"
              />
            </div>

            <div className="w-full mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleCopyImage(previewingStudent)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Sao Chép Ảnh</span>
              </button>

              <button
                type="button"
                onClick={() => downloadInvoiceCardPng(previewingStudent)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
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
