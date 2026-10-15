import * as XLSX from "xlsx";
import { StudentData, ClassroomData } from "@/lib/data-store";

export interface ParsedStudentRow {
  index: number;
  id: string;
  code: string;
  fullName: string;
  birthYear: number;
  gender: "Nam" | "Nữ";
  parentName: string;
  parentPhone: string;
  currentLevel: string;
  customFeePerSession?: number;
  sheetClassName?: string;
  matchedClassId?: string;
  matchedClassName?: string;
  school?: string;
  address?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicatePhone?: boolean;
}

export interface ParseResult {
  rows: ParsedStudentRow[];
  total: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
}

/**
 * Chuẩn hóa chuỗi để so sánh tên cột (bỏ dấu, viết thường, bỏ ký tự đặc biệt)
 */
function normalizeHeader(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Chuẩn hóa số điện thoại
 */
export function normalizePhoneNumber(rawPhone: any): string {
  if (rawPhone === undefined || rawPhone === null) return "";
  let phone = String(rawPhone).trim();
  // Xóa các ký tự phân cách như . - dấu cách
  phone = phone.replace(/[\s\.\-\(\)]/g, "");
  // Chuyển +84 thành 0
  if (phone.startsWith("+84")) {
    phone = "0" + phone.slice(3);
  } else if (phone.startsWith("84") && phone.length >= 11) {
    phone = "0" + phone.slice(2);
  }
  return phone;
}

/**
 * Trích xuất năm sinh từ chuỗi / số / ngày tháng
 */
export function extractBirthYear(rawVal: any): number {
  if (!rawVal) return 2018; // Năm sinh mặc định phù hợp độ tuổi cờ vua

  // Nếu là số nguyên 4 chữ số (VD: 2017)
  if (typeof rawVal === "number" && rawVal >= 1990 && rawVal <= 2026) {
    return Math.round(rawVal);
  }

  const str = String(rawVal).trim();

  // Kiểm tra 4 số năm liên tiếp (19xx hoặc 20xx)
  const yearMatch = str.match(/(19\d{2}|20\d{2})/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }

  // Nếu là số tuổi (VD: 6, 7, 8, 9, 10, 11, 12)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 4 && num <= 20) {
    return new Date().getFullYear() - num;
  }

  return 2018;
}

/**
 * Chuẩn hóa giới tính
 */
export function normalizeGender(val: any): "Nam" | "Nữ" {
  if (!val) return "Nam";
  const str = String(val).toLowerCase().trim();
  if (str.includes("nữ") || str.includes("nu") || str === "f" || str.includes("female") || str.includes("gái")) {
    return "Nữ";
  }
  return "Nam";
}

/**
 * Chuẩn hóa trình độ cờ vua
 */
export function normalizeLevel(val: any): string {
  if (!val) return "Nhập môn";
  const str = String(val).toLowerCase().trim();
  if (str.includes("vỡ lòng") || str.includes("vo long")) return "Vỡ lòng";
  if (str.includes("cơ bản") || str.includes("co ban") || str.includes("căn bản")) return "Cơ bản";
  if (str.includes("nâng cao") || str.includes("nang cao")) return "Nâng cao";
  if (str.includes("đội tuyển") || str.includes("doi tuyen")) return "Đội tuyển";
  return "Nhập môn";
}

/**
 * Chuẩn hóa học phí
 */
export function normalizeFee(val: any): number | undefined {
  if (!val) return undefined;
  if (typeof val === "number" && val > 0) return Math.round(val);
  const clean = String(val).replace(/[^0-9]/g, "");
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num > 0) return num;
  return undefined;
}

/**
 * Tải file mẫu Excel (.xlsx) chuẩn bị sẵn cột và dữ liệu mẫu
 */
export function downloadStudentImportTemplate(availableClasses: ClassroomData[] = []) {
  const headers = [
    "Họ và tên (*)",
    "Năm sinh (*)",
    "Giới tính",
    "Tên phụ huynh",
    "Số điện thoại phụ huynh (*)",
    "Trình độ",
    "Học phí riêng (VNĐ/buổi)",
    "Lớp học",
    "Trường học",
    "Địa chỉ",
    "Ghi chú",
  ];

  const sampleClassName1 = availableClasses[0]?.name || "Cờ vua Nhập Môn - K1";
  const sampleClassName2 = availableClasses[1]?.name || "Cờ vua Cơ Bản - K2";

  const rows = [
    [
      "Nguyễn Gia Huy",
      2017,
      "Nam",
      "Nguyễn Văn Hùng",
      "0912345678",
      "Nhập môn",
      150000,
      sampleClassName1,
      "TH Thăng Long",
      "257 Bạch Mai, Hà Nội",
      "Rất tập trung và có tư duy logic tốt",
    ],
    [
      "Trần Phương Linh",
      2018,
      "Nữ",
      "Lê Thị Thu",
      "0987654321",
      "Cơ bản",
      "",
      sampleClassName2,
      "TH Kim Đồng",
      "111 Thái Hà, Đống Đa, Hà Nội",
      "Điềm đạm, thích học tàn cuộc Xe",
    ],
    [
      "Phạm Hoàng Nam",
      2016,
      "Nam",
      "Phạm Văn Tuấn",
      "0903123456",
      "Nâng cao",
      180000,
      sampleClassName1,
      "TH Dịch Vọng A",
      "106 Hoàng Quốc Việt, Cầu Giấy",
      "Đã có thành tích giải cấp Quận",
    ],
    [
      "Vũ Bảo An",
      2019,
      "Nam",
      "Vũ Minh Tâm",
      "0916611258",
      "Vỡ lòng",
      "",
      "",
      "Mầm non Hoa Sen",
      "Hoàng Mai, Hà Nội",
      "Làm quen mặt quân và quy tắc đi cờ",
    ],
  ];

  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Cài đặt độ rộng cột tối ưu
  worksheet["!cols"] = [
    { wch: 22 }, // Họ và tên
    { wch: 12 }, // Năm sinh
    { wch: 10 }, // Giới tính
    { wch: 20 }, // Tên PH
    { wch: 24 }, // SĐT PH
    { wch: 14 }, // Trình độ
    { wch: 24 }, // Học phí riêng
    { wch: 24 }, // Lớp học
    { wch: 20 }, // Trường học
    { wch: 26 }, // Địa chỉ
    { wch: 30 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocVien");

  // Thêm sheet Hướng dẫn sử dụng
  const guideData = [
    ["HƯỚNG DẪN NHẬP DỮ LIỆU HỌC VIÊN CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTLL)"],
    [],
    ["1. Các trường bắt buộc gồm: Họ và tên (*), Số điện thoại phụ huynh (*), Năm sinh (*)."],
    ["2. Cột 'Giới tính': Điền 'Nam' hoặc 'Nữ' (mặc định là Nam nếu để trống)."],
    ["3. Cột 'Năm sinh': Điền năm sinh 4 chữ số (VD: 2017) hoặc ngày sinh (VD: 15/08/2017). Hệ thống sẽ tự trích xuất năm sinh."],
    ["4. Cột 'Trình độ': Điền 'Vỡ lòng', 'Nhập môn', 'Cơ bản', 'Nâng cao' hoặc 'Đội tuyển' (mặc định là 'Nhập môn')."],
    ["5. Cột 'Học phí riêng (VNĐ/buổi)': Điền số tiền (VD: 150000). Nếu để trống sẽ tự áp dụng mức học phí chung của lớp học."],
    ["6. Cột 'Lớp học': Điền đúng tên lớp hoặc mã lớp. Nếu để trống, bạn có thể chọn lớp để ghi danh hàng loạt trên phần mềm."],
    ["7. Bạn có thể sao chép trực tiếp các cột từ Google Sheets hoặc Excel rồi DÁN (Ctrl+V) vào ứng dụng."],
    [],
    ["DANH SÁCH LỚP HỌC HIỆN CÓ CỦA BẠN:"],
    ["STT", "Tên Lớp Học", "Trình Độ", "Học Phí Buổi (VNĐ)"],
    ...availableClasses.map((c, i) => [i + 1, c.name, c.level, c.feePerSession]),
  ];

  const guideSheet = XLSX.utils.aoa_to_sheet(guideData);
  guideSheet["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, guideSheet, "HuongDan_LopHoc");

  XLSX.writeFile(workbook, "Mau_Nhap_Hoc_Vien_KTTLL.xlsx");
}

/**
 * Phân tích dữ liệu từ mảng 2 chiều (Row/Col)
 */
export function parseMatrixToStudents(
  matrix: any[][],
  defaultClassId: string = "",
  availableClasses: ClassroomData[] = [],
  existingStudents: StudentData[] = []
): ParseResult {
  if (!matrix || matrix.length < 2) {
    return { rows: [], total: 0, validCount: 0, invalidCount: 0, warningCount: 0 };
  }

  // 1. Tìm dòng header
  let headerRowIndex = 0;
  let colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(matrix.length, 5); r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    const testMap: Record<string, number> = {};
    row.forEach((cell, colIdx) => {
      const norm = normalizeHeader(String(cell));
      if (!norm) return;

      // Họ tên
      if (
        norm.includes("hovaten") ||
        norm.includes("hoten") ||
        norm.includes("tenhocvien") ||
        norm.includes("tenhocsinh") ||
        norm === "ten" ||
        norm === "fullname" ||
        norm === "name"
      ) {
        testMap["fullName"] = colIdx;
      }
      // Năm sinh
      else if (
        norm.includes("namsinh") ||
        norm.includes("sinhnan") ||
        norm.includes("ngaysinh") ||
        norm === "ns" ||
        norm === "dob" ||
        norm.includes("birth")
      ) {
        testMap["birthYear"] = colIdx;
      }
      // Giới tính
      else if (norm.includes("gioitinh") || norm === "gt" || norm.includes("gender") || norm === "sex") {
        testMap["gender"] = colIdx;
      }
      // Tên phụ huynh
      else if (
        norm.includes("tenphuhuynh") ||
        norm.includes("hotenphuhuynh") ||
        norm.includes("phuhuynh") ||
        norm.includes("tenph") ||
        norm === "ph" ||
        norm.includes("parentname")
      ) {
        testMap["parentName"] = colIdx;
      }
      // SĐT phụ huynh
      else if (
        norm.includes("sodienthoai") ||
        norm.includes("sdt") ||
        norm.includes("dienthoai") ||
        norm.includes("phone") ||
        norm.includes("tel") ||
        norm.includes("mobile")
      ) {
        testMap["parentPhone"] = colIdx;
      }
      // Trình độ
      else if (norm.includes("trinhdo") || norm.includes("capdo") || norm.includes("level")) {
        testMap["currentLevel"] = colIdx;
      }
      // Học phí riêng
      else if (
        norm.includes("hocphirieng") ||
        norm.includes("hocphi") ||
        norm.includes("dongiarieng") ||
        norm.includes("dongia") ||
        norm.includes("fee")
      ) {
        testMap["customFeePerSession"] = colIdx;
      }
      // Lớp học
      else if (norm.includes("lophoc") || norm.includes("tenlop") || norm === "lop" || norm.includes("class")) {
        testMap["className"] = colIdx;
      }
      // Trường học
      else if (norm.includes("truonghoc") || norm.includes("truong") || norm.includes("school")) {
        testMap["school"] = colIdx;
      }
      // Địa chỉ
      else if (norm.includes("diachi") || norm.includes("noio") || norm.includes("address")) {
        testMap["address"] = colIdx;
      }
      // Ghi chú
      else if (norm.includes("ghichu") || norm.includes("luuy") || norm.includes("notes") || norm.includes("note")) {
        testMap["notes"] = colIdx;
      }
      // Mã học viên
      else if (norm.includes("mahocvien") || norm.includes("mahv") || norm.includes("mahs") || norm === "code") {
        testMap["code"] = colIdx;
      }
    });

    // Nếu tìm thấy ít nhất Họ tên hoặc SĐT ở dòng này -> đây là dòng header
    if (testMap["fullName"] !== undefined || testMap["parentPhone"] !== undefined) {
      headerRowIndex = r;
      colMap = testMap;
      break;
    }
  }

  // Nếu không nhận diện được tên cột qua header, fallback gán theo thứ tự mặc định của file mẫu
  if (colMap["fullName"] === undefined) {
    colMap = {
      fullName: 0,
      birthYear: 1,
      gender: 2,
      parentName: 3,
      parentPhone: 4,
      currentLevel: 5,
      customFeePerSession: 6,
      className: 7,
      school: 8,
      address: 9,
      notes: 10,
    };
  }

  const existingPhoneSet = new Set(
    existingStudents.map((s) => normalizePhoneNumber(s.parentPhone)).filter((p) => p.length >= 8)
  );

  const existingCodes = existingStudents.map((s) => s.code).filter(Boolean);
  let nextCodeNum = existingStudents.length + 1;

  const parsedRows: ParsedStudentRow[] = [];

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    // Kiểm tra dòng trống
    const hasAnyContent = row.some((c) => c !== undefined && c !== null && String(c).trim() !== "");
    if (!hasAnyContent) continue;

    const rawFullName = colMap["fullName"] !== undefined ? row[colMap["fullName"]] : "";
    const rawBirthYear = colMap["birthYear"] !== undefined ? row[colMap["birthYear"]] : "";
    const rawGender = colMap["gender"] !== undefined ? row[colMap["gender"]] : "";
    const rawParentName = colMap["parentName"] !== undefined ? row[colMap["parentName"]] : "";
    const rawParentPhone = colMap["parentPhone"] !== undefined ? row[colMap["parentPhone"]] : "";
    const rawLevel = colMap["currentLevel"] !== undefined ? row[colMap["currentLevel"]] : "";
    const rawFee = colMap["customFeePerSession"] !== undefined ? row[colMap["customFeePerSession"]] : "";
    const rawClass = colMap["className"] !== undefined ? row[colMap["className"]] : "";
    const rawSchool = colMap["school"] !== undefined ? row[colMap["school"]] : "";
    const rawAddress = colMap["address"] !== undefined ? row[colMap["address"]] : "";
    const rawNotes = colMap["notes"] !== undefined ? row[colMap["notes"]] : "";
    const rawCode = colMap["code"] !== undefined ? row[colMap["code"]] : "";

    const fullName = String(rawFullName || "").trim();
    const parentPhone = normalizePhoneNumber(rawParentPhone);
    const birthYear = extractBirthYear(rawBirthYear);
    const gender = normalizeGender(rawGender);
    const parentName = String(rawParentName || "").trim() || (fullName ? `Phụ huynh ${fullName}` : "Phụ huynh");
    const currentLevel = normalizeLevel(rawLevel);
    const customFeePerSession = normalizeFee(rawFee);
    const school = String(rawSchool || "").trim() || undefined;
    const address = String(rawAddress || "").trim() || undefined;
    const notes = String(rawNotes || "").trim() || undefined;

    let code = String(rawCode || "").trim();
    if (!code) {
      code = `HS${nextCodeNum.toString().padStart(3, "0")}`;
      nextCodeNum += 1;
    }

    // Ghép lớp học
    const sheetClassName = String(rawClass || "").trim();
    let matchedClassId: string | undefined = undefined;
    let matchedClassName: string | undefined = undefined;

    if (sheetClassName) {
      const found = availableClasses.find(
        (c) =>
          c.name.toLowerCase().includes(sheetClassName.toLowerCase()) ||
          sheetClassName.toLowerCase().includes(c.name.toLowerCase()) ||
          c.id === sheetClassName
      );
      if (found) {
        matchedClassId = found.id;
        matchedClassName = found.name;
      }
    }

    // Nếu không khớp từ sheet thì dùng defaultClassId
    if (!matchedClassId && defaultClassId && defaultClassId !== "NONE" && defaultClassId !== "AUTO") {
      const foundDefault = availableClasses.find((c) => c.id === defaultClassId);
      if (foundDefault) {
        matchedClassId = foundDefault.id;
        matchedClassName = foundDefault.name;
      }
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Kiểm tra bắt buộc: Họ tên
    if (!fullName) {
      errors.push("Thiếu Họ và tên học viên");
    } else if (fullName.length < 2) {
      errors.push("Họ và tên quá ngắn");
    }

    // Kiểm tra bắt buộc: Số điện thoại phụ huynh
    if (!parentPhone) {
      errors.push("Thiếu Số điện thoại phụ huynh");
    } else if (parentPhone.length < 9 || parentPhone.length > 12) {
      errors.push("Số điện thoại không hợp lệ (cần từ 9 đến 11 chữ số)");
    }

    // Kiểm tra năm sinh
    if (birthYear < 2000 || birthYear > new Date().getFullYear()) {
      warnings.push(`Năm sinh ${birthYear} có thể bất thường`);
    }

    // Kiểm tra trùng SĐT trong hệ thống
    const isDuplicatePhone = parentPhone.length >= 8 && existingPhoneSet.has(parentPhone);
    if (isDuplicatePhone) {
      warnings.push("Số điện thoại này đã có học viên trong hệ thống");
    }

    const isValid = errors.length === 0;

    parsedRows.push({
      index: parsedRows.length + 1,
      id: `std-bulk-${Date.now()}-${parsedRows.length + 1}`,
      code,
      fullName,
      birthYear,
      gender,
      parentName,
      parentPhone,
      currentLevel,
      customFeePerSession,
      sheetClassName: sheetClassName || undefined,
      matchedClassId,
      matchedClassName,
      school,
      address,
      notes,
      isValid,
      errors,
      warnings,
      isDuplicatePhone,
    });
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const warningCount = parsedRows.filter((r) => r.warnings.length > 0).length;

  return {
    rows: parsedRows,
    total: parsedRows.length,
    validCount,
    invalidCount,
    warningCount,
  };
}

/**
 * Đọc file Excel / CSV dạng ArrayBuffer
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer,
  defaultClassId: string = "",
  availableClasses: ClassroomData[] = [],
  existingStudents: StudentData[] = []
): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  return parseMatrixToStudents(matrix, defaultClassId, availableClasses, existingStudents);
}

/**
 * Đọc chuỗi văn bản copy-paste từ Google Sheets / Excel (TSV hoặc CSV)
 */
export function parsePastedText(
  text: string,
  defaultClassId: string = "",
  availableClasses: ClassroomData[] = [],
  existingStudents: StudentData[] = []
): ParseResult {
  if (!text || !text.trim()) {
    return { rows: [], total: 0, validCount: 0, invalidCount: 0, warningCount: 0 };
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { rows: [], total: 0, validCount: 0, invalidCount: 0, warningCount: 0 };
  }

  // Tự động nhận diện phân cách: Tab (\t) từ Excel/Sheets hoặc Phẩy (,)
  const hasTabs = lines.some((l) => l.includes("\t"));
  const delimiter = hasTabs ? "\t" : ",";

  const matrix = lines.map((line) => {
    if (delimiter === "\t") {
      return line.split("\t").map((c) => c.trim());
    } else {
      // Đơn giản hóa split CSV
      return line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
    }
  });

  return parseMatrixToStudents(matrix, defaultClassId, availableClasses, existingStudents);
}
