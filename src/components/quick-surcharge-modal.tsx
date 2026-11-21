"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  BookOpen,
  Utensils,
  Tag,
  Plus,
  Trash2,
  Calendar,
  Receipt,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  dataStore,
  StudentData,
  ClassroomData,
  AttendanceSessionData,
  AttendanceRecordData,
  STANDARD_BOOKS,
  DEFAULT_LUNCH_FEE,
  BookItem,
  parseRecordBooks,
  serializeBooksToRecord,
} from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";

interface QuickSurchargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentData | null;
  month: number;
  year: number;
  availableClasses: ClassroomData[];
  initialClassId?: string;
  onSuccess: () => void;
}

type SurchargeTab = "BOOK" | "LUNCH" | "OTHER";

export default function QuickSurchargeModal({
  isOpen,
  onClose,
  student,
  month,
  year,
  availableClasses,
  initialClassId,
  onSuccess,
}: QuickSurchargeModalProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [useCustomDate, setUseCustomDate] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<SurchargeTab>("BOOK");
  const [books, setBooks] = useState<BookItem[]>([
    { title: STANDARD_BOOKS[0].title, price: STANDARD_BOOKS[0].price },
  ]);
  const [lunchFee, setLunchFee] = useState<number>(DEFAULT_LUNCH_FEE);
  const [otherTitle, setOtherTitle] = useState<string>("");
  const [otherPrice, setOtherPrice] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Khởi tạo classId khi mở modal
  useEffect(() => {
    if (!isOpen || !student) return;
    setFeedback(null);
    setErrorMsg(null);
    setActiveTab("BOOK");
    setBooks([{ title: STANDARD_BOOKS[0].title, price: STANDARD_BOOKS[0].price }]);
    setLunchFee(DEFAULT_LUNCH_FEE);
    setOtherTitle("");
    setOtherPrice(0);

    const defaultClsId =
      (initialClassId && availableClasses.some((c) => c.id === initialClassId)
        ? initialClassId
        : availableClasses[0]?.id) || "";
    setSelectedClassId(defaultClsId);
  }, [isOpen, student, initialClassId, availableClasses]);

  // Danh sách buổi học của lớp được chọn trong tháng/năm
  const monthSessions = useMemo(() => {
    if (!selectedClassId) return [];
    return dataStore.sessions
      .filter((s) => {
        if (s.classId !== selectedClassId) return false;
        const d = new Date(s.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedClassId, month, year, refreshTick, isOpen]);

  // Khởi tạo ngày mặc định khi đổi lớp hoặc tháng
  useEffect(() => {
    if (!isOpen) return;
    if (monthSessions.length > 0) {
      setSelectedDate(monthSessions[0].date);
      setUseCustomDate(false);
    } else {
      const pad = (n: number) => String(n).padStart(2, "0");
      const today = new Date();
      const defaultDay =
        today.getMonth() + 1 === month && today.getFullYear() === year
          ? pad(today.getDate())
          : "01";
      setSelectedDate(`${year}-${pad(month)}-${defaultDay}`);
      setUseCustomDate(true);
    }
  }, [selectedClassId, month, year, isOpen, monthSessions.length]);

  // Danh sách phụ phí hiện có của học sinh trong lớp & tháng này
  const existingSurcharges = useMemo(() => {
    if (!student || !selectedClassId) return [];
    const items: Array<{
      key: string;
      sessionId: string;
      date: string;
      type: SurchargeTab;
      bookIndex?: number;
      title: string;
      amount: number;
    }> = [];

    monthSessions.forEach((sess) => {
      const rec = sess.records.find((r) => r.studentId === student.id);
      if (!rec) return;

      const recBooks = parseRecordBooks(rec);
      recBooks.forEach((b, bIdx) => {
        if (b.price > 0) {
          items.push({
            key: `${sess.id}-book-${bIdx}`,
            sessionId: sess.id,
            date: sess.date,
            type: "BOOK",
            bookIndex: bIdx,
            title: b.title,
            amount: b.price,
          });
        }
      });

      if (rec.lunchFee && rec.lunchFee > 0) {
        items.push({
          key: `${sess.id}-lunch`,
          sessionId: sess.id,
          date: sess.date,
          type: "LUNCH",
          title: "Ăn trưa",
          amount: rec.lunchFee,
        });
      }

      if (rec.otherFeePrice && rec.otherFeePrice > 0) {
        items.push({
          key: `${sess.id}-other`,
          sessionId: sess.id,
          date: sess.date,
          type: "OTHER",
          title: rec.otherFeeTitle || "Phụ phí khác",
          amount: rec.otherFeePrice,
        });
      }
    });

    return items;
  }, [student, selectedClassId, monthSessions, refreshTick]);

  if (!isOpen || !student) return null;

  const syncSessionToDb = async (session: AttendanceSessionData) => {
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: session.classId,
          date: session.date,
          topic: session.topic || "Buổi học cờ vua",
          records: session.records,
        }),
      });
    } catch (err) {
      console.error("Lỗi đồng bộ phụ phí lên DB:", err);
    }
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setFeedback(null);

    if (!selectedClassId) {
      setErrorMsg("Vui lòng chọn lớp học.");
      return;
    }
    if (!selectedDate) {
      setErrorMsg("Vui lòng chọn ngày buổi học.");
      return;
    }

    if (activeTab === "BOOK") {
      const validBooks = books.filter((b) => Number(b.price) > 0);
      if (validBooks.length === 0) {
        setErrorMsg("Vui lòng nhập giá sách hợp lệ (> 0 đ).");
        return;
      }
    } else if (activeTab === "LUNCH") {
      if (!lunchFee || Number(lunchFee) <= 0) {
        setErrorMsg("Vui lòng nhập tiền ăn trưa hợp lệ (> 0 đ).");
        return;
      }
    } else if (activeTab === "OTHER") {
      if (!otherPrice || Number(otherPrice) <= 0) {
        setErrorMsg("Vui lòng nhập số tiền phụ phí hợp lệ (> 0 đ).");
        return;
      }
    }

    setIsSaving(true);
    try {
      let targetSession = dataStore.sessions.find(
        (s) => s.classId === selectedClassId && s.date === selectedDate
      );

      if (!targetSession) {
        targetSession = {
          id: `sess-${selectedClassId}-${selectedDate}`,
          classId: selectedClassId,
          date: selectedDate,
          topic: "Buổi học cờ vua",
          records: [],
        };
        dataStore.sessions.push(targetSession);
      }

      let rec: AttendanceRecordData | undefined = targetSession.records.find(
        (r) => r.studentId === student.id
      );

      if (!rec) {
        rec = {
          id: `rec-${Date.now()}-${student.id}`,
          sessionId: targetSession.id,
          studentId: student.id,
          status: "ABSENT",
          coachNote: "",
        };
        targetSession.records.push(rec);
      }

      if (activeTab === "BOOK") {
        const existingBooks = parseRecordBooks(rec);
        const newValidBooks = books
          .map((b) => ({
            title: (b.title || "").trim() || "Sách Cờ Vua Bài Tập",
            price: Number(b.price) || 0,
          }))
          .filter((b) => b.price > 0);
        const merged = [...existingBooks, ...newValidBooks];
        const serialized = serializeBooksToRecord(merged);
        rec.bookTitle = serialized.bookTitle;
        rec.bookPrice = serialized.bookPrice;
      } else if (activeTab === "LUNCH") {
        rec.lunchFee = (Number(rec.lunchFee) || 0) + Number(lunchFee);
      } else if (activeTab === "OTHER") {
        const cleanTitle = otherTitle.trim() || "Phụ phí khác";
        if (rec.otherFeePrice && rec.otherFeePrice > 0) {
          rec.otherFeeTitle = rec.otherFeeTitle
            ? `${rec.otherFeeTitle}, ${cleanTitle}`
            : cleanTitle;
          rec.otherFeePrice = Number(rec.otherFeePrice) + Number(otherPrice);
        } else {
          rec.otherFeeTitle = cleanTitle;
          rec.otherFeePrice = Number(otherPrice);
        }
      }

      dataStore.recalculateAllInvoices(month, year);
      dataStore.saveToLocalStorage();
      await syncSessionToDb(targetSession);

      setRefreshTick((t) => t + 1);
      onSuccess();
      setFeedback("Đã thêm phụ phí & cập nhật tổng kết học phí!");
      // Reset inputs
      setBooks([{ title: STANDARD_BOOKS[0].title, price: STANDARD_BOOKS[0].price }]);
      setOtherTitle("");
      setOtherPrice(0);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExisting = async (item: {
    sessionId: string;
    type: SurchargeTab;
    bookIndex?: number;
  }) => {
    const targetSession = dataStore.sessions.find((s) => s.id === item.sessionId);
    if (!targetSession) return;
    const rec = targetSession.records.find((r) => r.studentId === student.id);
    if (!rec) return;

    setIsSaving(true);
    try {
      if (item.type === "BOOK" && item.bookIndex !== undefined) {
        const currentBooks = parseRecordBooks(rec);
        const remaining = currentBooks.filter((_, i) => i !== item.bookIndex);
        const serialized = serializeBooksToRecord(remaining);
        rec.bookTitle = serialized.bookTitle;
        rec.bookPrice = serialized.bookPrice;
      } else if (item.type === "LUNCH") {
        delete rec.lunchFee;
      } else if (item.type === "OTHER") {
        delete rec.otherFeeTitle;
        delete rec.otherFeePrice;
      }

      dataStore.recalculateAllInvoices(month, year);
      dataStore.saveToLocalStorage();
      await syncSessionToDb(targetSession);

      setRefreshTick((t) => t + 1);
      onSuccess();
      setFeedback("Đã xóa khoản phụ phí.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Thêm Phụ Phí Nhanh — {student.fullName}
              </h3>
              <p className="text-[11px] text-slate-500">
                Mã HV: <span className="font-mono font-bold">{student.code}</span> • Tháng {month}/{year}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 space-y-4 text-xs">
          {/* Chọn lớp (nếu học sinh có nhiều lớp khả dụng) */}
          {availableClasses.length > 1 && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chọn lớp áp dụng phụ phí</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-primary focus:outline-none"
              >
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phụ phí đã ghi nhận trong tháng */}
          {existingSurcharges.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
              <p className="text-[11px] font-bold uppercase text-amber-900">
                Phụ phí đã có trong tháng {month}/{year} ({existingSurcharges.length} khoản)
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {existingSurcharges.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-amber-200/80"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-500">
                        Ngày {new Date(item.date).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-amber-800">
                        {formatCurrencyVND(item.amount)}
                      </span>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleDeleteExisting(item)}
                        title="Xóa khoản phụ phí này"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chọn buổi học / ngày phát sinh */}
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
              <Calendar className="h-3.5 w-3.5 text-brand-primary" />
              <span>Ngày / Buổi học phát sinh phụ phí</span>
            </label>
            {monthSessions.length > 0 && !useCustomDate ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value === "__CUSTOM__") {
                      setUseCustomDate(true);
                    } else {
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-primary focus:outline-none"
                >
                  {monthSessions.map((s) => (
                    <option key={s.id} value={s.date}>
                      {new Date(s.date).toLocaleDateString("vi-VN")} — {s.topic || "Buổi học"}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Chọn ngày khác...</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-primary focus:outline-none"
                />
                {monthSessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomDate(false);
                      setSelectedDate(monthSessions[0].date);
                    }}
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Chọn từ buổi học
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Chọn loại phụ phí */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Loại phụ phí mới</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("BOOK")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 font-bold transition-all ${
                  activeTab === "BOOK"
                    ? "border-amber-500 bg-amber-50 text-amber-900 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                <span>Phát sách</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("LUNCH")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 font-bold transition-all ${
                  activeTab === "LUNCH"
                    ? "border-orange-500 bg-orange-50 text-orange-900 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Utensils className="h-3.5 w-3.5 text-orange-600" />
                <span>Ăn trưa</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("OTHER")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 font-bold transition-all ${
                  activeTab === "OTHER"
                    ? "border-purple-500 bg-purple-50 text-purple-900 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Tag className="h-3.5 w-3.5 text-purple-600" />
                <span>Phụ phí khác</span>
              </button>
            </div>
          </div>

          {/* Form chi tiết theo loại */}
          {activeTab === "BOOK" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950">
                  Danh sách sách phát ({books.length} cuốn)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBooks((prev) => [
                      ...prev,
                      { title: STANDARD_BOOKS[0].title, price: STANDARD_BOOKS[0].price },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                >
                  <Plus className="h-3 w-3" />
                  <span>Thêm sách</span>
                </button>
              </div>

              <div className="space-y-2">
                {books.map((book, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <select
                      value={STANDARD_BOOKS.some((b) => b.title === book.title) ? book.title : "CUSTOM"}
                      onChange={(e) => {
                        if (e.target.value === "CUSTOM") {
                          setBooks((prev) =>
                            prev.map((b, i) => (i === idx ? { ...b, title: "" } : b))
                          );
                        } else {
                          const found = STANDARD_BOOKS.find((b) => b.title === e.target.value);
                          if (found) {
                            setBooks((prev) =>
                              prev.map((b, i) =>
                                i === idx ? { title: found.title, price: found.price } : b
                              )
                            );
                          }
                        }
                      }}
                      className="flex-1 min-w-[170px] rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-brand-primary focus:outline-none"
                    >
                      {STANDARD_BOOKS.map((b, sIdx) => (
                        <option key={sIdx} value={b.title}>
                          {b.title} ({b.price.toLocaleString("vi-VN")} đ)
                        </option>
                      ))}
                      <option value="CUSTOM">-- Sách khác (Tự nhập) --</option>
                    </select>

                    {!STANDARD_BOOKS.some((b) => b.title === book.title) && (
                      <input
                        type="text"
                        value={book.title}
                        onChange={(e) =>
                          setBooks((prev) =>
                            prev.map((b, i) => (i === idx ? { ...b, title: e.target.value } : b))
                          )
                        }
                        placeholder="Tên sách..."
                        className="flex-1 min-w-[140px] rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
                      />
                    )}

                    <div className="relative w-28">
                      <input
                        type="number"
                        step="5000"
                        min="0"
                        value={book.price}
                        onChange={(e) =>
                          setBooks((prev) =>
                            prev.map((b, i) =>
                              i === idx ? { ...b, price: Number(e.target.value) } : b
                            )
                          )
                        }
                        className="w-full rounded-lg border border-amber-300 bg-white py-1.5 pl-2.5 pr-5 text-xs font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                      />
                      <span className="pointer-events-none absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">
                        đ
                      </span>
                    </div>

                    {books.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setBooks((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Xóa cuốn sách này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "LUNCH" && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3 space-y-2">
              <label className="block font-bold text-orange-950">Tiền ăn trưa (VNĐ)</label>
              <div className="relative">
                <input
                  type="number"
                  step="5000"
                  min="0"
                  value={lunchFee}
                  onChange={(e) => setLunchFee(Number(e.target.value))}
                  className="w-full rounded-lg border border-orange-300 bg-white py-2 pl-3 pr-7 text-sm font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                />
                <span className="pointer-events-none absolute right-2.5 top-2.5 font-bold text-slate-400">
                  đ
                </span>
              </div>
            </div>
          )}

          {activeTab === "OTHER" && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3 space-y-2.5">
              <div>
                <label className="block font-bold text-purple-950 mb-1">
                  Tên khoản phụ phí
                </label>
                <input
                  type="text"
                  value={otherTitle}
                  onChange={(e) => setOtherTitle(e.target.value)}
                  placeholder="VD: Đồng phục CLB, Phí giải đấu, Bộ cờ..."
                  className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-purple-950 mb-1">Số tiền (VNĐ)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    value={otherPrice}
                    onChange={(e) => setOtherPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-purple-300 bg-white py-2 pl-3 pr-7 text-sm font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-2.5 font-bold text-slate-400">
                    đ
                  </span>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
              {errorMsg}
            </p>
          )}

          {feedback && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover disabled:opacity-60 transition-colors"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Lưu Phụ Phí</span>
          </button>
        </div>
      </div>
    </div>
  );
}
