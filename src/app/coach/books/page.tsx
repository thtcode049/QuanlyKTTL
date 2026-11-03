"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Calendar,
  Filter,
  Search,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  Coins,
  Sparkles,
  ShoppingBag,
  GraduationCap,
  ArrowRight,
  X,
  Check,
  AlertCircle,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import {
  dataStore,
  BookDistributionData,
  STANDARD_BOOKS,
  resolveCanonicalCoachId,
  getCoachClasses,
} from "@/lib/data-store";
import { formatCurrencyVND } from "@/lib/vietqr";
import confetti from "canvas-confetti";
import * as XLSX from "xlsx";

export default function CoachBooksPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentCoachId, setCurrentCoachId] = useState<string>("");
  const [month, setMonth] = useState<number>(10);
  const [year, setYear] = useState<number>(2026);
  const [activeTab, setActiveTab] = useState<"ALL" | "OUTSIDE" | "CLASS">("ALL");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Modal Thêm / Sửa sách lấy phát ngoài
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BookDistributionData | null>(null);
  const [formBookTitle, setFormBookTitle] = useState(STANDARD_BOOKS[0].title);
  const [formCustomTitle, setFormCustomTitle] = useState("");
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formUnitPrice, setFormUnitPrice] = useState<number>(STANDARD_BOOKS[0].price);
  const [formTakenDate, setFormTakenDate] = useState<string>("");
  const [formClassId, setFormClassId] = useState<string>("");
  const [formNote, setFormNote] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("kttll_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setCurrentUser(u);
        if (u.id) setCurrentCoachId(u.id);
      } catch (e) {}
    }
    dataStore.syncWithDatabase().then(() => setRefreshTrigger((v) => v + 1));
  }, []);

  const coachClasses = useMemo(() => {
    return getCoachClasses(currentCoachId, currentUser?.email);
  }, [currentCoachId, currentUser?.email, refreshTrigger]);

  const currentCoach = useMemo(() => {
    return (
      dataStore.users.find(
        (u) =>
          (currentCoachId && u.id === currentCoachId) ||
          (currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase())
      ) || dataStore.users.find((u) => u.role === "COACH")
    );
  }, [currentCoachId, currentUser?.email, refreshTrigger]);

  const bookRatePercent = currentCoach?.bookRatePercent ?? 30;

  // Lấy toàn bộ sách trong tháng/năm này: cả sách HLV lấy ngoài VÀ sách phát qua lớp học
  const allBooks = useMemo(() => {
    return dataStore.getAllBookDistributions(currentCoach?.id || currentCoachId, month, year);
  }, [currentCoach?.id, currentCoachId, month, year, refreshTrigger]);

  // Bộ lọc dữ liệu theo tab và từ khóa
  const filteredBooks = useMemo(() => {
    return allBooks.filter((item) => {
      // 1. Lọc theo tab
      if (activeTab === "OUTSIDE" && item.source !== "DIRECT_PURCHASE") return false;
      if (activeTab === "CLASS" && item.source !== "CLASS_ATTENDANCE") return false;

      // 2. Lọc theo lớp
      if (selectedClassFilter !== "ALL") {
        if (selectedClassFilter === "NONE" && item.classId) return false;
        if (selectedClassFilter !== "NONE" && item.classId !== selectedClassFilter) return false;
      }

      // 3. Lọc theo từ khóa tìm kiếm
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchTitle = item.bookTitle.toLowerCase().includes(kw);
        const matchNote = item.note?.toLowerCase().includes(kw) || false;
        const matchClass = item.className?.toLowerCase().includes(kw) || false;
        if (!matchTitle && !matchNote && !matchClass) return false;
      }

      return true;
    });
  }, [allBooks, activeTab, selectedClassFilter, searchKeyword]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const classBooks = allBooks.filter((b) => b.source === "CLASS_ATTENDANCE");
    const outsideBooks = allBooks.filter((b) => b.source === "DIRECT_PURCHASE");

    const classQuantity = classBooks.reduce((sum, b) => sum + (b.quantity || 1), 0);
    const classRevenue = classBooks.reduce((sum, b) => sum + b.totalPrice, 0);

    const outsideQuantity = outsideBooks.reduce((sum, b) => sum + (b.quantity || 1), 0);
    const outsideRevenue = outsideBooks.reduce((sum, b) => sum + b.totalPrice, 0);

    const totalQuantity = classQuantity + outsideQuantity;
    const totalRevenue = classRevenue + outsideRevenue;
    const totalCommission = Math.round(totalRevenue * (bookRatePercent / 100));

    return {
      classQuantity,
      classRevenue,
      outsideQuantity,
      outsideRevenue,
      totalQuantity,
      totalRevenue,
      totalCommission,
    };
  }, [allBooks, bookRatePercent]);

  // Mở modal tạo mới
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormBookTitle(STANDARD_BOOKS[0].title);
    setFormCustomTitle("");
    setFormQuantity(1);
    setFormUnitPrice(STANDARD_BOOKS[0].price);
    setFormTakenDate("");
    setFormClassId("");
    setFormNote("");
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (item: BookDistributionData) => {
    setEditingItem(item);
    const isStandard = STANDARD_BOOKS.some((b) => b.title === item.bookTitle);
    if (isStandard) {
      setFormBookTitle(item.bookTitle);
      setFormCustomTitle("");
    } else {
      setFormBookTitle("CUSTOM");
      setFormCustomTitle(item.bookTitle);
    }
    setFormQuantity(item.quantity || 1);
    setFormUnitPrice(item.unitPrice || 60000);
    setFormTakenDate(item.takenDate || "");
    setFormClassId(item.classId || "");
    setFormNote(item.note || "");
    setIsModalOpen(true);
  };

  // Lưu bản ghi sách lấy ngoài
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTitle = formBookTitle === "CUSTOM" ? formCustomTitle.trim() : formBookTitle;
    if (!finalTitle) {
      alert("Vui lòng nhập tên sách");
      return;
    }

    const qty = Number(formQuantity) > 0 ? Number(formQuantity) : 1;
    const unitPrice = Number(formUnitPrice) >= 0 ? Number(formUnitPrice) : 60000;
    const totalPrice = qty * unitPrice;
    const targetClass = coachClasses.find((c) => c.id === formClassId);

    const payload = {
      coachId: currentCoach?.id || currentCoachId || "user-coach-1",
      coachName: currentCoach?.name || "Huấn Luyện Viên",
      bookTitle: finalTitle,
      quantity: qty,
      unitPrice,
      totalPrice,
      takenDate: formTakenDate || undefined,
      classId: formClassId || undefined,
      className: targetClass?.name || undefined,
      note: formNote || undefined,
    };

    if (editingItem) {
      dataStore.updateBookDistribution(editingItem.id, payload);
      try {
        await fetch("/api/books", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingItem.id, ...payload }),
        });
      } catch (err) {}
    } else {
      dataStore.addBookDistribution({
        ...payload,
        source: "DIRECT_PURCHASE",
      });
      try {
        await fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {}
    }

    setRefreshTrigger((v) => v + 1);
    setIsModalOpen(false);

    try {
      confetti({ particleCount: 40, spread: 60 });
    } catch (e) {}
  };

  // Xóa bản ghi
  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa lượt lấy sách "${title}"?`)) return;
    dataStore.deleteBookDistribution(id);
    try {
      await fetch(`/api/books?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (e) {}
    setRefreshTrigger((v) => v + 1);
  };

  // Xuất Excel
  const handleExportExcel = () => {
    const rows = filteredBooks.map((b, idx) => [
      idx + 1,
      b.bookTitle,
      b.source === "DIRECT_PURCHASE" ? "HLV mua phát ngoài" : "Phát qua lớp học (Điểm danh)",
      b.quantity,
      b.unitPrice,
      b.totalPrice,
      b.takenDate || "Chưa ghi nhận",
      b.className || "Ngoài lớp",
      b.note || "",
    ]);

    const header = [
      ["CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTL)"],
      [`BÁO CÁO PHÁT SÁCH & PHÂN PHỐI SÁCH THÁNG ${month}/${year}`],
      [`Huấn luyện viên: ${currentCoach?.name || "Tất cả HLV"} • Tỷ lệ hoa hồng sách: ${bookRatePercent}%`],
      [],
      ["STT", "Tên Sách", "Nguồn Phát", "Số Lượng (Cuốn)", "Đơn Giá (VNĐ)", "Thành Tiền (VNĐ)", "Ngày Lấy / Ngày Học", "Lớp Học", "Ghi Chú"],
      ...rows,
      [],
      ["TỔNG CỘNG", "", "", stats.totalQuantity, "", stats.totalRevenue, "", "", `Hoa hồng HLV: ${stats.totalCommission} VNĐ`],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(header);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 30 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `PhatSach_T${month}_${year}`);
    XLSX.writeFile(workbook, `KTTL_BaoCao_PhatSach_T${month}_${year}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                Quản Lý & Phát Sách
              </h1>
              <p className="text-xs text-slate-500">
                Ghi nhận sách HLV mua phát ngoài & tự động tổng hợp sách phát tại các lớp học
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chọn Tháng/Năm */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="text-xs font-bold text-slate-700 outline-none cursor-pointer bg-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="text-xs font-bold text-slate-700 outline-none cursor-pointer bg-transparent"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nhập Lấy Sách Ngoài</span>
          </button>
        </div>
      </div>

      {/* Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {/* Tổng Sách */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Tổng sách tháng {month}</span>
            <BookOpen className="h-4 w-4 text-brand-primary" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.totalQuantity} cuốn</p>
          <span className="text-[11px] text-slate-400">Gồm cả sách lớp & ngoài</span>
        </div>

        {/* Sách Phát Tại Lớp */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase">Tại các lớp</span>
            <GraduationCap className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">{stats.classQuantity} cuốn</p>
          <span className="text-[11px] text-amber-700 font-medium">Tự động từ điểm danh</span>
        </div>

        {/* Sách HLV Mua / Lấy Ngoài */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase">HLV lấy ngoài</span>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-900">{stats.outsideQuantity} cuốn</p>
          <span className="text-[11px] text-blue-700 font-medium">HLV mua phát ngoài</span>
        </div>

        {/* Doanh Số Sách */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Doanh số sách</span>
            <FileSpreadsheet className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 text-xl font-black text-slate-900">{formatCurrencyVND(stats.totalRevenue)}</p>
          <span className="text-[11px] text-slate-400">Tổng giá trị bìa sách</span>
        </div>

        {/* Thu Nhập / Hoa Hồng Sách */}
        <div className="col-span-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 shadow-xs sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase">Thu nhập HLV (+{bookRatePercent}%)</span>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-black text-emerald-700">{formatCurrencyVND(stats.totalCommission)}</p>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-emerald-800 font-semibold">Cộng vào lương tháng</span>
            <Link href="/coach/payroll" className="flex items-center gap-0.5 text-brand-primary font-bold hover:underline">
              <span>Xem lương</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bộ Lọc & Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 p-3 bg-slate-50/60">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === "ALL"
                  ? "bg-brand-primary text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              Tất cả sách ({allBooks.length})
            </button>
            <button
              onClick={() => setActiveTab("OUTSIDE")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "OUTSIDE"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Sách HLV lấy ngoài ({stats.outsideQuantity})</span>
            </button>
            <button
              onClick={() => setActiveTab("CLASS")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "CLASS"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Phát qua lớp học ({stats.classQuantity})</span>
            </button>
          </div>

          {/* Ô Tìm Kiếm & Lọc Lớp */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:w-60">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tên sách, học viên, ghi chú..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-primary focus:outline-none"
              />
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-brand-primary"
            >
              <option value="ALL">Toàn bộ lớp</option>
              <option value="NONE">Ngoài lớp CLB</option>
              {coachClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Danh Sách Bảng Sách */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">STT</th>
                <th className="px-3.5 py-3">Tên Cuốn Sách</th>
                <th className="px-3.5 py-3">Nguồn Phát Sách</th>
                <th className="px-3.5 py-3 text-center">Số Lượng</th>
                <th className="px-3.5 py-3 text-right">Đơn Giá</th>
                <th className="px-3.5 py-3 text-right">Thành Tiền</th>
                <th className="px-3.5 py-3 text-center">Ngày Lấy / Ngày Học</th>
                <th className="px-3.5 py-3">Lớp Học</th>
                <th className="px-3.5 py-3">Ghi Chú / Chi Tiết</th>
                <th className="px-3.5 py-3 text-center w-24">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold">Chưa có bản ghi phát sách nào trong tháng {month}/{year}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bạn có thể bấm "+ Nhập Lấy Sách Ngoài" hoặc điểm danh phụ phí phát sách tại các lớp
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBooks.map((item, idx) => {
                  const isOutside = item.source === "DIRECT_PURCHASE";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3.5 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-3.5 py-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          <span>{item.bookTitle}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        {isOutside ? (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            <ShoppingBag className="h-3 w-3" />
                            HLV lấy phát ngoài
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <GraduationCap className="h-3 w-3" />
                            Phát tại lớp (Điểm danh)
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center font-bold text-slate-800">
                        {item.quantity} cuốn
                      </td>
                      <td className="px-3.5 py-3 text-right font-medium text-slate-600">
                        {formatCurrencyVND(item.unitPrice)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-black text-brand-primary">
                        {formatCurrencyVND(item.totalPrice)}
                      </td>
                      <td className="px-3.5 py-3 text-center font-mono text-[11px] text-slate-600">
                        {item.takenDate ? item.takenDate : <span className="text-slate-400 italic">Để trống</span>}
                      </td>
                      <td className="px-3.5 py-3 text-slate-700">
                        {item.className ? (
                          <span className="font-semibold text-slate-800">{item.className}</span>
                        ) : (
                          <span className="text-slate-400 italic">Ngoài lớp CLB</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-slate-500 max-w-xs truncate" title={item.note}>
                        {item.note || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {isOutside ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="rounded p-1 text-slate-400 hover:text-brand-primary hover:bg-slate-100 transition-colors"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBook(item.id, item.bookTitle)}
                              className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Xóa bản ghi"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Link
                            href={`/coach/attendance?classId=${item.classId || ""}&date=${item.takenDate || ""}`}
                            className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-bold text-brand-primary hover:bg-emerald-50 transition-colors"
                            title="Đến buổi học điểm danh"
                          >
                            <span>Xem ca</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Sách Lấy Phát Ngoài */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingItem ? "Sửa Lượt Lấy Sách Phát Ngoài" : "Ghi Nhận Lấy Sách Phát Ngoài (HLV Mua)"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="mt-4 space-y-3.5">
              {/* Chọn sách */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Sách <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formBookTitle}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormBookTitle(val);
                    if (val !== "CUSTOM") {
                      const found = STANDARD_BOOKS.find((b) => b.title === val);
                      if (found) setFormUnitPrice(found.price);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-brand-primary focus:outline-none"
                >
                  {STANDARD_BOOKS.map((b, idx) => (
                    <option key={idx} value={b.title}>
                      {b.title} (Giá bìa: {b.price.toLocaleString("vi-VN")} đ)
                    </option>
                  ))}
                  <option value="CUSTOM">-- Tên sách khác (Tự nhập) --</option>
                </select>

                {formBookTitle === "CUSTOM" && (
                  <input
                    type="text"
                    required
                    value={formCustomTitle}
                    onChange={(e) => setFormCustomTitle(e.target.value)}
                    placeholder="Nhập tên sách cờ vua..."
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none"
                  />
                )}
              </div>

              {/* Số lượng & Đơn giá */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Lượng (Cuốn) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đơn Giá (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    required
                    value={formUnitPrice}
                    onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Box Thành Tiền & Hoa Hồng */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <div>
                  <span className="text-xs font-bold text-emerald-800">Thành tiền:</span>
                  <p className="text-lg font-black text-brand-primary">
                    {formatCurrencyVND(formQuantity * formUnitPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-emerald-700 font-medium">Hoa hồng HLV (+{bookRatePercent}%):</span>
                  <p className="text-sm font-black text-emerald-700">
                    +{formatCurrencyVND(Math.round(formQuantity * formUnitPrice * (bookRatePercent / 100)))}
                  </p>
                </div>
              </div>

              {/* Ngày lấy (có thể để trống) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày Lấy Sách <span className="text-slate-400 font-normal">(có thể để trống)</span>
                </label>
                <input
                  type="date"
                  value={formTakenDate}
                  onChange={(e) => setFormTakenDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Lớp (có thể để trống) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lớp Liên Quan <span className="text-slate-400 font-normal">(có thể để trống)</span>
                </label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none"
                >
                  <option value="">-- Không chọn lớp (Phát ngoài CLB) --</option>
                  {coachClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú Nơi Phát / Mục Đích
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="VD: Phát cho trường tiểu học, học sinh tự học tại nhà..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover transition-all active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingItem ? "Lưu Thay Đổi" : "Ghi Nhận Sách"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

