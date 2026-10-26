import * as XLSX from "xlsx";
import { StudentData, ClassroomData } from "@/lib/data-store";

export interface ParsedStudentRow {
  index: number;
  id: string;
  code: string;
  fullName: string;
  birthYear?: number;
  gender?: "Nam" | "Nữ" | "";
  parentName?: string;
  parentPhone: string;
  currentLevel?: string;
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
  const raw = String(rawPhone).trim();
  if (!raw) return "";

  // 1. Trích xuất các chữ số (bỏ các chữ cái như 'mẹ', 'bố', 'PH', v.v.)
  const digits = raw.replace(/\D/g, "");

  // Trường hợp có tiền tố quốc tế 84 hoặc 0084
  if (digits.startsWith("0084") && digits.length >= 12) {
    return "0" + digits.slice(4);
  }
  if (digits.startsWith("84") && digits.length === 11) {
    return "0" + digits.slice(2);
  }
  // Trường hợp chuẩn 10 chữ số bắt đầu bằng 0 (03, 05, 07, 08, 09)
  if (digits.length === 10 && digits.startsWith("0")) {
    return digits;
  }
  // Trường hợp 9 chữ số (Excel tự cắt mất số 0 ở đầu)
  if (digits.length === 9 && /^[35789]/.test(digits)) {
    return "0" + digits;
  }
  // Nếu có nhiều hơn 10 chữ số nhưng chứa cụm số điện thoại hợp lệ 10 số (03x, 05x, 07x, 08x, 09x)
  if (digits.length > 10) {
    const match = digits.match(/0[35789]\d{8}/);
    if (match) return match[0];
  }

  // 2. Fallback nếu không khớp dạng chữ số ở trên
  let phone = raw.replace(/[\s\.\-\(\)]/g, "");
  if (phone.startsWith("+84")) {
    phone = "0" + phone.slice(3);
  } else if (phone.startsWith("84") && phone.length >= 11) {
    phone = "0" + phone.slice(2);
  }
  if (phone.length === 9 && !phone.startsWith("0")) {
    phone = "0" + phone;
  }
  return phone;
}

/**
 * Tách nội dung clipboard thành các dòng, giữ nguyên 100% các ô/dòng trống ở giữa.
 * Chỉ cắt bỏ đúng 1 ký tự xuống dòng thừa ở cuối cùng do Excel/Google Sheets tự thêm vào.
 */
export function splitClipboardIntoLines(text: string): string[] {
  if (!text) return [];
  let raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (raw.endsWith("\n")) {
    raw = raw.slice(0, -1);
  }
  return raw.split("\n").map((line) => line.trim());
}


/**
 * Trích xuất năm sinh từ chuỗi / số / ngày tháng (để trống nếu không có)
 */
export function extractBirthYear(rawVal: any): number | undefined {
  if (rawVal === undefined || rawVal === null || String(rawVal).trim() === "") return undefined;

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

  // Nếu là số tuổi (VD: 4 đến 20)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 4 && num <= 20) {
    return new Date().getFullYear() - num;
  }

  return undefined;
}

/**
 * Chuẩn hóa giới tính (để trống nếu không có)
 */
export function normalizeGender(val: any): "Nam" | "Nữ" | "" {
  if (!val) return "";
  const str = String(val).toLowerCase().trim();
  if (str.includes("nữ") || str.includes("nu") || str === "f" || str.includes("female") || str.includes("gái")) {
    return "Nữ";
  }
  if (str.includes("nam") || str === "m" || str.includes("male") || str.includes("trai")) {
    return "Nam";
  }
  return "";
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
  const clean = String(val).replace(/[^0-9]/g, "");
  const num = parseInt(clean, 10);
  // Tránh nhận diện nhầm số điện thoại (10 chữ số) thành học phí
  if (!isNaN(num) && num >= 10000 && num <= 5000000) return num;
  return undefined;
}

/**
 * Tải file mẫu Excel (.xlsx) chuẩn bị sẵn cột và dữ liệu mẫu
 */
export function downloadStudentImportTemplate(availableClasses: ClassroomData[] = []) {
  const headers = [
    "Họ và tên (*)",
    "Số điện thoại phụ huynh (*)",
    "Năm sinh",
    "Giới tính",
    "Lớp học",
    "Học phí riêng (VNĐ/buổi)",
    "Trường học",
    "Ghi chú",
  ];

  const sampleClassName1 = availableClasses[0]?.name || "Cờ vua Nhập Môn - K1";
  const sampleClassName2 = availableClasses[1]?.name || "Cờ vua Cơ Bản - K2";

  const rows = [
    [
      "Nguyễn Gia Huy",
      "0912345678",
      2017,
      "Nam",
      sampleClassName1,
      150000,
      "TH Thăng Long",
      "Rất tập trung và có tư duy logic tốt",
    ],
    [
      "Trần Phương Linh",
      "0987654321",
      2018,
      "Nữ",
      sampleClassName2,
      "",
      "TH Kim Đồng",
      "Điềm đạm, thích học tàn cuộc Xe",
    ],
    [
      "Phạm Hoàng Nam",
      "0903123456",
      "",
      "",
      sampleClassName1,
      180000,
      "TH Dịch Vọng A",
      "Năm sinh và giới tính có thể để trống",
    ],
  ];

  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Cài đặt độ rộng cột tối ưu
  worksheet["!cols"] = [
    { wch: 22 }, // Họ và tên
    { wch: 24 }, // SĐT PH
    { wch: 12 }, // Năm sinh
    { wch: 12 }, // Giới tính
    { wch: 24 }, // Lớp học
    { wch: 24 }, // Học phí riêng
    { wch: 20 }, // Trường học
    { wch: 30 }, // Ghi chú
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocVien");

  // Thêm sheet Hướng dẫn sử dụng
  const guideData = [
    ["HƯỚNG DẪN NHẬP DỮ LIỆU HỌC VIÊN CLB CỜ VUA KIỆN TƯỚNG TƯƠNG LAI (KTTLL)"],
    [],
    ["1. Hai cột bắt buộc tối thiểu: 'Họ và tên (*)' và 'Số điện thoại phụ huynh (*)'. Các cột khác có thể để trống."],
    ["2. Cột 'Năm sinh': Điền năm sinh 4 chữ số (VD: 2017). Có thể để trống nếu chưa có thông tin."],
    ["3. Cột 'Giới tính': Điền 'Nam' hoặc 'Nữ'. Có thể để trống."],
    ["4. Cột 'Học phí riêng (VNĐ/buổi)': Điền số tiền (VD: 150000). Nếu để trống sẽ tự áp dụng mức học phí chung của lớp học."],
    ["5. Cột 'Lớp học': Điền đúng tên lớp hoặc mã lớp. Có thể để trống để chọn lớp chung trên phần mềm."],
    ["6. Bạn có thể sao chép trực tiếp từng cột (Họ tên, SĐT) từ Google Sheets hoặc Excel rồi DÁN (Ctrl+V) vào ứng dụng."],
    [],
    ["DANH SÁCH LỚP HỌC HIỆN CÓ CỦA BẠN:"],
    ["STT", "Tên Lớp Học", "Trình Độ Của Lớp", "Học Phí Buổi (VNĐ)"],
    ...availableClasses.map((c, i) => [i + 1, c.name, c.level, c.feePerSession]),
  ];

  const guideSheet = XLSX.utils.aoa_to_sheet(guideData);
  guideSheet["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 18 }, { wch: 20 }];
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
    const parentName = String(rawParentName || "").trim();
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

    // Kiểm tra Số điện thoại phụ huynh (Không bắt buộc, nếu có thì kiểm tra định dạng)
    if (parentPhone && (parentPhone.length < 9 || parentPhone.length > 12)) {
      warnings.push("Số điện thoại có thể không chuẩn (thường từ 9 đến 11 chữ số)");
    }

    // Kiểm tra năm sinh
    if (birthYear && (birthYear < 2000 || birthYear > new Date().getFullYear())) {
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

export interface EditableStudentRow {
  id: string;
  fullName: string;
  parentPhone: string;
  birthYear: string;
  gender: "Nam" | "Nữ" | "";
  classId: string;
  customFee: string;
  school: string;
  address?: string;
  notes: string;
  parentName?: string;
  currentLevel?: string;
}

export function createEmptyStudentRow(defaultClassId: string = "NONE"): EditableStudentRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    fullName: "",
    parentPhone: "",
    birthYear: "",
    gender: "",
    classId: defaultClassId && defaultClassId !== "AUTO" ? defaultClassId : "NONE",
    customFee: "",
    school: "",
    address: "",
    notes: "",
  };
}

/**
 * Phân tích ma trận (Row/Col) thành danh sách các dòng chỉnh sửa trực tiếp trên web
 */
export function parseMatrixToEditableRows(
  matrix: any[][],
  defaultClassId: string = "NONE",
  availableClasses: ClassroomData[] = []
): EditableStudentRow[] {
  if (!matrix || matrix.length === 0) return [];

  // 1. Kiểm tra xem có dòng header không (tìm trong 5 dòng đầu)
  let headerRowIndex = -1;
  const colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(matrix.length, 5); r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    const testMap: Record<string, number> = {};
    row.forEach((cell, idx) => {
      const norm = normalizeHeader(String(cell));
      if (!norm) return;

      if (
        norm.includes("hovaten") ||
        norm.includes("hoten") ||
        norm.includes("tenhocvien") ||
        norm.includes("tenhocsinh") ||
        norm === "ten" ||
        norm === "fullname" ||
        norm === "name"
      ) {
        testMap["fullName"] = idx;
      } else if (
        norm.includes("sodienthoai") ||
        norm.includes("sdt") ||
        norm.includes("dienthoai") ||
        norm.includes("phone") ||
        norm.includes("tel") ||
        norm.includes("mobile")
      ) {
        testMap["parentPhone"] = idx;
      } else if (
        norm.includes("namsinh") ||
        norm.includes("ngaysinh") ||
        norm === "ns" ||
        norm.includes("birth") ||
        norm === "dob"
      ) {
        testMap["birthYear"] = idx;
      } else if (norm.includes("gioitinh") || norm === "gt" || norm.includes("gender") || norm === "sex") {
        testMap["gender"] = idx;
      } else if (norm.includes("hocphi") || norm.includes("dongia") || norm.includes("fee")) {
        testMap["customFee"] = idx;
      } else if (norm.includes("lophoc") || norm.includes("tenlop") || norm === "lop" || norm.includes("class")) {
        testMap["classId"] = idx;
      } else if (norm.includes("truong") || norm.includes("school")) {
        testMap["school"] = idx;
      } else if (norm.includes("diachi") || norm.includes("noio") || norm.includes("address")) {
        testMap["address"] = idx;
      } else if (norm.includes("ghichu") || norm.includes("notes") || norm.includes("note")) {
        testMap["notes"] = idx;
      }
    });

    if (testMap["fullName"] !== undefined || testMap["parentPhone"] !== undefined) {
      headerRowIndex = r;
      Object.assign(colMap, testMap);
      break;
    }
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const result: EditableStudentRow[] = [];

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.every((c) => c === undefined || c === null || String(c).trim() === "")) continue;

    let fullName = "";
    let parentPhone = "";
    let birthYear = "";
    let gender: "Nam" | "Nữ" | "" = "";
    let classId = defaultClassId !== "AUTO" && defaultClassId !== "NONE" ? defaultClassId : "NONE";
    let customFee = "";
    let school = "";
    let address = "";
    let notes = "";

    if (headerRowIndex >= 0) {
      fullName = colMap["fullName"] !== undefined ? String(row[colMap["fullName"]] || "").trim() : "";
      parentPhone = colMap["parentPhone"] !== undefined ? normalizePhoneNumber(row[colMap["parentPhone"]]) : "";
      
      const parsedYear = colMap["birthYear"] !== undefined ? extractBirthYear(row[colMap["birthYear"]]) : undefined;
      birthYear = parsedYear ? String(parsedYear) : "";
      
      gender = colMap["gender"] !== undefined ? normalizeGender(row[colMap["gender"]]) : "";
      customFee =
        colMap["customFee"] !== undefined && row[colMap["customFee"]]
          ? String(normalizeFee(row[colMap["customFee"]]) || "")
          : "";
      school = colMap["school"] !== undefined ? String(row[colMap["school"]] || "").trim() : "";
      address = colMap["address"] !== undefined ? String(row[colMap["address"]] || "").trim() : "";
      notes = colMap["notes"] !== undefined ? String(row[colMap["notes"]] || "").trim() : "";

      if (colMap["classId"] !== undefined && row[colMap["classId"]]) {
        const clsName = String(row[colMap["classId"]]).trim().toLowerCase();
        const found = availableClasses.find((c) => c.name.toLowerCase().includes(clsName) || c.id === clsName);
        if (found) classId = found.id;
      }
    } else {
      // Tự động nhận diện cột thông minh theo kiểu dữ liệu
      let startCol = 0;
      const firstVal = String(row[0] || "").trim();
      const secondVal = row.length > 1 ? String(row[1] || "").trim() : "";
      if (/^\d+$/.test(firstVal) && parseInt(firstVal, 10) <= 999 && /[a-zA-ZÀ-ỹ]/.test(secondVal)) {
        fullName = secondVal;
        startCol = 2;
      } else {
        fullName = firstVal;
        startCol = 1;
      }

      for (let c = startCol; c < row.length; c++) {
        const val = String(row[c] || "").trim();
        if (!val) continue;

        // Nếu là số điện thoại (9-11 chữ số)
        const cleanP = normalizePhoneNumber(val);
        if (!parentPhone && cleanP.length >= 9 && cleanP.length <= 11) {
          parentPhone = cleanP;
          continue;
        }

        // Nếu là năm sinh (4 chữ số 19xx hoặc 20xx)
        if (!birthYear && /^(19|20)\d{2}$/.test(val)) {
          birthYear = val;
          continue;
        }

        // Nếu là giới tính
        if (!gender && (val.toLowerCase() === "nam" || val.toLowerCase() === "nữ" || val.toLowerCase() === "nu")) {
          gender = normalizeGender(val);
          continue;
        }

        // Nếu là học phí riêng (số từ 10.000 đến 5.000.000)
        const fee = normalizeFee(val);
        if (!customFee && fee) {
          customFee = String(fee);
          continue;
        }

        // Nếu là tên lớp
        const foundCls = availableClasses.find((cls) => cls.name.toLowerCase().includes(val.toLowerCase()));
        if (foundCls && classId === "NONE") {
          classId = foundCls.id;
          continue;
        }

        // Fallback vào trường / ghi chú
        if (!school) {
          school = val;
        } else if (!notes) {
          notes = val;
        }
      }
    }

    result.push({
      id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      fullName,
      parentPhone,
      birthYear,
      gender,
      classId,
      customFee,
      school,
      address,
      notes,
    });
  }

  return result;
}

/**
 * Phân tích dữ liệu copy-paste từ Excel/Google Sheets trực tiếp thành các dòng trên bảng web
 */
export function parseClipboardToEditableRows(
  text: string,
  defaultClassId: string = "NONE",
  availableClasses: ClassroomData[] = []
): EditableStudentRow[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const hasTabs = lines.some((l) => l.includes("\t"));
  const delimiter = hasTabs ? "\t" : ",";

  const matrix = lines.map((line) => {
    if (delimiter === "\t") {
      return line.split("\t").map((c) => c.trim());
    } else {
      return line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
    }
  });

  return parseMatrixToEditableRows(matrix, defaultClassId, availableClasses);
}

/**
 * Đọc file Excel / CSV dạng ArrayBuffer và chuyển trực tiếp thành danh sách các dòng trên bảng web
 */
export function parseExcelBufferToEditableRows(
  buffer: ArrayBuffer,
  defaultClassId: string = "NONE",
  availableClasses: ClassroomData[] = []
): EditableStudentRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
  return parseMatrixToEditableRows(matrix, defaultClassId, availableClasses);
}


