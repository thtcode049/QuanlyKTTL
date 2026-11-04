"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Check,
  X,
  RotateCcw,
} from "lucide-react";

export interface ColumnFilterState {
  selectedValues: string[]; // empty means all selected
  searchText?: string;
}

interface ExcelColumnFilterProps {
  title: string;
  columnKey: string;
  align?: "left" | "center" | "right";
  distinctValues: { value: string; label: string; count?: number }[];
  currentFilter?: ColumnFilterState;
  onFilterChange: (columnKey: string, filter: ColumnFilterState | null) => void;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc";
  onSortChange: (columnKey: string, direction: "asc" | "desc" | null) => void;
  isNumericOrDate?: boolean;
}

export const ExcelColumnFilter: React.FC<ExcelColumnFilterProps> = ({
  title,
  columnKey,
  align = "left",
  distinctValues,
  currentFilter,
  onFilterChange,
  sortColumn,
  sortDirection,
  onSortChange,
  isNumericOrDate = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSorted = sortColumn === columnKey;
  const hasActiveFilter =
    currentFilter &&
    currentFilter.selectedValues.length > 0 &&
    currentFilter.selectedValues.length < distinctValues.length;

  // Selected values in local state while dropdown is open
  const allValues = useMemo(() => distinctValues.map((d) => d.value), [distinctValues]);
  const [tempSelected, setTempSelected] = useState<string[]>(
    currentFilter && currentFilter.selectedValues.length > 0
      ? currentFilter.selectedValues
      : allValues
  );

  // Sync tempSelected whenever currentFilter changes or dropdown opens
  useEffect(() => {
    if (currentFilter && currentFilter.selectedValues.length > 0) {
      setTempSelected(currentFilter.selectedValues);
    } else {
      setTempSelected(allValues);
    }
  }, [currentFilter, allValues, isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filter distinct values by search box inside popover
  const filteredDistinctValues = useMemo(() => {
    if (!searchQuery.trim()) return distinctValues;
    const q = searchQuery.toLowerCase().trim();
    return distinctValues.filter(
      (d) => d.label.toLowerCase().includes(q) || d.value.toLowerCase().includes(q)
    );
  }, [distinctValues, searchQuery]);

  const isAllChecked =
    filteredDistinctValues.length > 0 &&
    filteredDistinctValues.every((d) => tempSelected.includes(d.value));

  const handleToggleAll = () => {
    if (isAllChecked) {
      // Uncheck all visible
      const visibleVals = new Set(filteredDistinctValues.map((d) => d.value));
      setTempSelected((prev) => prev.filter((v) => !visibleVals.has(v)));
    } else {
      // Check all visible
      const newVals = new Set([...tempSelected, ...filteredDistinctValues.map((d) => d.value)]);
      setTempSelected(Array.from(newVals));
    }
  };

  const handleToggleItem = (val: string) => {
    setTempSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleApplyFilter = () => {
    if (tempSelected.length === allValues.length || tempSelected.length === 0) {
      onFilterChange(columnKey, null);
    } else {
      onFilterChange(columnKey, { selectedValues: tempSelected });
    }
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setTempSelected(allValues);
    onFilterChange(columnKey, null);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-flex items-center gap-1.5 select-none ${
        align === "right" ? "justify-end w-full" : align === "center" ? "justify-center w-full" : "justify-start"
      }`}
    >
      <span className="font-bold uppercase tracking-wider text-slate-600 text-[11px] whitespace-nowrap">
        {title}
      </span>

      {/* Trigger Button with Excel Funnel / Sort indicator */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center justify-center h-5 w-5 rounded transition-all cursor-pointer ${
          hasActiveFilter
            ? "bg-emerald-600 text-white shadow-xs"
            : isSorted
            ? "bg-emerald-100 text-emerald-800"
            : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
        }`}
        title={`Bộ lọc & Sắp xếp: ${title}`}
      >
        {isSorted ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3 stroke-[2.5]" />
          ) : (
            <ArrowDown className="h-3 w-3 stroke-[2.5]" />
          )
        ) : (
          <Filter className={`h-3 w-3 ${hasActiveFilter ? "fill-white stroke-white" : ""}`} />
        )}
      </button>

      {/* Excel-style Popover Menu */}
      {isOpen && (
        <div
          className={`absolute top-full z-50 mt-1.5 w-64 rounded-lg bg-white p-3 shadow-xl border border-slate-200 text-left normal-case tracking-normal animate-in fade-in-50 zoom-in-95 duration-100 ${
            align === "right" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="text-xs font-bold text-slate-800">Lọc cột: {title}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Sort Controls */}
          <div className="space-y-1 mb-2.5 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                onSortChange(columnKey, "asc");
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                isSorted && sortDirection === "asc"
                  ? "bg-emerald-50 text-emerald-800 font-bold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isNumericOrDate ? "Sắp xếp từ Bé đến Lớn (Tăng dần)" : "Sắp xếp A → Z (Tăng dần)"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onSortChange(columnKey, "desc");
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                isSorted && sortDirection === "desc"
                  ? "bg-emerald-50 text-emerald-800 font-bold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isNumericOrDate ? "Sắp xếp từ Lớn đến Bé (Giảm dần)" : "Sắp xếp Z → A (Giảm dần)"}</span>
            </button>
            {isSorted && (
              <button
                type="button"
                onClick={() => {
                  onSortChange(columnKey, null);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
              >
                <RotateCcw className="h-3 w-3 text-slate-400" />
                <span>Bỏ sắp xếp cột này</span>
              </button>
            )}
          </div>

          {/* Search box inside filter */}
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-2 h-3 w-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm giá trị..."
              className="w-full rounded border border-slate-200 bg-slate-50/50 py-1 pl-7 pr-2 text-xs focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Select All */}
          <div className="mb-1.5 flex items-center justify-between px-1 text-[11.5px]">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={handleToggleAll}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>(Chọn tất cả)</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {tempSelected.length}/{distinctValues.length}
            </span>
          </div>

          {/* Distinct Values List */}
          <div className="max-h-40 overflow-y-auto space-y-0.5 border border-slate-100 rounded bg-slate-50/30 p-1 divide-y divide-slate-100/50">
            {filteredDistinctValues.length === 0 ? (
              <div className="py-2 text-center text-[11px] text-slate-400">Không tìm thấy giá trị</div>
            ) : (
              filteredDistinctValues.map((d) => {
                const checked = tempSelected.includes(d.value);
                return (
                  <label
                    key={d.value}
                    className="flex items-center justify-between gap-1.5 px-1.5 py-1 text-xs hover:bg-emerald-50/60 rounded cursor-pointer"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleItem(d.value)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="truncate text-slate-700 text-[11.5px]" title={d.label}>
                        {d.label}
                      </span>
                    </div>
                    {d.count !== undefined && (
                      <span className="text-[10px] text-slate-400 font-mono">({d.count})</span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={handleClearFilter}
              className="rounded px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              Bỏ lọc
            </button>
            <button
              type="button"
              onClick={handleApplyFilter}
              className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelColumnFilter;
