import * as XLSX from "xlsx";

export interface InvoiceExportRow {
  stt: number;
  studentCode: string;
  fullName: string;
  birthYear: number;
  parentName: string;
  parentPhone: string;
  presentCount: number;
  feePerSession: number;
  totalAmount: number;
  statusText: string;
}

export function exportInvoicesToExcel(
  rows: InvoiceExportRow[],
  className: string,
  month: number,
  year: number
) {
  // Chuẩn bị dữ liệu bảng Excel
  const excelData = [
    ["CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTLL)"],
    [`BẢNG TỔNG KẾT HỌC PHÍ THÁNG ${month}/${year}`],
    [`Lớp học: ${className} | Quy tắc: Thực học - Thực trả (Nghỉ không tính phí)`],
    [],
    [
      "STT",
      "Mã Học Viên",
      "Họ và Tên",
      "Năm Sinh",
      "Phụ Huynh",
      "Số Điện Thoại",
      "Số Buổi Có Mặt",
      "Đơn Giá (VNĐ)",
      "Thành Tiền (VNĐ)",
      "Trạng Thái",
    ],
    ...rows.map((r) => [
      r.stt,
      r.studentCode,
      r.fullName,
      r.birthYear,
      r.parentName,
      r.parentPhone,
      r.presentCount,
      r.feePerSession,
      r.totalAmount,
      r.statusText,
    ]),
  ];

  // Tính tổng
  const totalAmount = rows.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalPresent = rows.reduce((sum, r) => sum + r.presentCount, 0);
  excelData.push([]);
  excelData.push([
    "TỔNG CỘNG",
    "",
    `${rows.length} Học viên`,
    "",
    "",
    "",
    `${totalPresent} Buổi`,
    "",
    totalAmount,
    "",
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã
    { wch: 25 }, // Họ tên
    { wch: 10 }, // Năm sinh
    { wch: 22 }, // Phụ huynh
    { wch: 15 }, // SĐT
    { wch: 18 }, // Số buổi
    { wch: 16 }, // Đơn giá
    { wch: 18 }, // Thành tiền
    { wch: 16 }, // Trạng thái
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `HocPhi_T${month}_${year}`);

  // Xuất file tải xuống ở client
  XLSX.writeFile(workbook, `KTTLL_HocPhi_${className.replace(/\s+/g, "_")}_T${month}_${year}.xlsx`);
}

export interface PayrollExportRow {
  stt: number;
  coachName: string;
  phone: string;
  branchName: string;
  totalSessions: number;
  baseRate: number;
  totalSalary: number;
}

export function exportPayrollToExcel(rows: PayrollExportRow[], month: number, year: number) {
  const excelData = [
    ["CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTLL)"],
    [`BẢNG THANH TOÁN THÙ LAO HUẤN LUYỆN VIÊN THÁNG ${month}/${year}`],
    ["Quy tắc: Thù lao = Số ca dạy thực tế trong tháng x Đơn giá ca dạy"],
    [],
    [
      "STT",
      "Họ và Tên HLV",
      "Số Điện Thoại",
      "Cơ Sở Phụ Trách",
      "Số Ca Dạy Thực Tế",
      "Đơn Giá / Ca (VNĐ)",
      "Tổng Thù Lao (VNĐ)",
    ],
    ...rows.map((r) => [
      r.stt,
      r.coachName,
      r.phone,
      r.branchName,
      r.totalSessions,
      r.baseRate,
      r.totalSalary,
    ]),
  ];

  const totalSalary = rows.reduce((sum, r) => sum + r.totalSalary, 0);
  const totalSessions = rows.reduce((sum, r) => sum + r.totalSessions, 0);
  excelData.push([]);
  excelData.push([
    "TỔNG CỘNG",
    `${rows.length} HLV`,
    "",
    "",
    totalSessions,
    "",
    totalSalary,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 16 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `ThuLaoHLV_T${month}_${year}`);
  XLSX.writeFile(workbook, `KTTLL_BangThuLao_HLV_T${month}_${year}.xlsx`);
}
