/**
 * In-memory / persistent Mock Data Store cho CLB Cờ vua Kiện Tướng Tương Lai
 * Tự động cung cấp dữ liệu tức thì cho giao diện và API khi chưa gắn Supabase URL,
 * đồng thời giữ trạng thái điểm danh, tạo lớp, gửi học phí trong phiên làm việc.
 */

export interface BranchData {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'ADMIN' | 'COACH';
  branchId?: string;
  baseRate: number; // 200.000đ/ca
  title?: string;
  experience?: string; // Số năm kinh nghiệm / Thành tích
  bio?: string; // Giới thiệu / triết lý dạy
  bankAccount?: string; // STK nhận thù lao
  bankName?: string; // Tên ngân hàng
  accountHolder?: string; // Chủ tài khoản
  elo?: number; // Hệ số Elo cờ vua của HLV
  fideId?: string; // FIDE ID
  avatar?: string; // Ảnh chân dung
  createdAt?: string;
  hasAdminAccess?: boolean; // Cho phép HLV truy cập trang Quản trị (Admin) khi được Admin cấp quyền
}

export interface ClassroomData {
  id: string;
  name: string;
  level: string; // Nhập môn, Cơ bản, Nâng cao, Đội tuyển, hoặc Tùy chỉnh
  feePerSession: number;
  schedule: string;
  branchId: string;
  coachId: string;
  isActive: boolean;
  shareWithAdmin?: boolean; // false = Lớp riêng của HLV (không chia sẻ quyền quản lý & xem với admin)
}

export interface StudentData {
  id: string;
  code: string; // VD: HS001
  fullName: string;
  birthYear: number;
  gender?: 'Nam' | 'Nữ';
  parentName: string;
  parentPhone: string;
  currentLevel: string;
  eloRating?: number; // Đã loại bỏ khỏi UI/hệ thống đánh giá
  notes?: string;
  classIds: string[];
  customFeePerSession?: number; // Đơn giá học phí riêng theo từng học viên (ưu đãi, học bổng hoặc kèm riêng)
  avatar?: string; // Ảnh profile học viên (base64 hoặc URL)
  address?: string; // Địa chỉ nhà
  school?: string; // Trường học
  joinDate?: string; // Ngày nhập học (YYYY-MM-DD)
  status?: 'ACTIVE' | 'PAUSED' | 'DROPPED'; // Trạng thái học tập
}

export interface AttendanceRecordData {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT';
  coachNote?: string;
  bookTitle?: string; // Tên sách được phát cho học viên
  bookPrice?: number; // Giá bìa sách (VNĐ)
}

export interface AttendanceSessionData {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  topic: string;
  records: AttendanceRecordData[];
}

export interface MonthlyInvoiceData {
  id: string;
  invoiceCode: string;
  classId: string;
  studentId: string;
  month: number;
  year: number;
  presentCount: number;
  feePerSession: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID';
  zaloSentAt?: string;
  vietQrUrl?: string;
  createdAt: string;
}

export interface StudentEvaluationData {
  id: string;
  studentId: string;
  month: number;
  year: number;
  opening: number; // 1 - 5 sao
  tactics: number;
  calculation: number;
  endgame: number;
  generalNote?: string;
}

export interface BankConfig {
  bankId: string;
  bankAccount: string;
  bankName: string;
  accountHolder: string;
  qrTemplate?: 'compact2' | 'compact' | 'qr_only' | 'print';
  customQrImage?: string; // Ảnh mã QR tùy chỉnh tải lên (Base64)
  useCustomQr?: boolean; // Tùy chọn ưu tiên ảnh QR tải lên
}

export interface ZaloConfig {
  titleTemplate: string;
  bodyTemplate: string;
  footerNote: string;
  appId?: string;
  secretKey?: string;
  oaId?: string;
}

// Khởi tạo cơ sở dữ liệu mẫu ban đầu theo đúng chuẩn web kientuongtuonglai.com
export const initialBranches: BranchData[] = [
  {
    id: "branch-1",
    name: "Cơ sở 1 – Phố Bạch Mai, Phường Bạch Mai",
    address: "Số 257 Bạch Mai, Phường Bạch Mai, TP Hà Nội (Ngã tư Bạch Mai – Lê Thanh Nghị – Thanh Nhàn)",
    phone: "0968.543.141",
  },
  {
    id: "branch-2",
    name: "Cơ sở 2 – Phố Thái Hà, Phường Đống Đa",
    address: "Số 111 ngõ 98 Thái Hà, Phường Trung Liệt, Quận Đống Đa, TP Hà Nội",
    phone: "0968.543.141",
  },
  {
    id: "branch-3",
    name: "Cơ sở 3 – Phố Hoàng Quốc Việt, Phường Cầu Giấy",
    address: "Số 1 ngách 42, ngõ 106 Hoàng Quốc Việt, Quận Cầu Giấy, TP Hà Nội",
    phone: "0983.585.499",
  },
  {
    id: "branch-4",
    name: "Cơ sở 4 – Phố Trương Định – Hoàng Mai",
    address: "Tầng 2, Tòa CT2B (lối lên sảnh văn phòng dịch vụ), KĐT Nam Đô, 609 Trương Định, Hoàng Mai, Hà Nội",
    phone: "0916.611.258",
  },
  {
    id: "branch-5",
    name: "Cơ sở 5 – Phố Láng Hạ, Phường Đống Đa",
    address: "Nhà 101B ngõ 111 Láng Hạ, Phường Láng Hạ, Quận Đống Đa, TP Hà Nội",
    phone: "0342.666.688",
  },
  {
    id: "branch-6",
    name: "Cơ sở 6 – Phố Quang Trung, Phường Hà Đông",
    address: "Liền kề 07 Lô 4, KĐT Nam La Khê, 368B Quang Trung, Quận Hà Đông, TP Hà Nội",
    phone: "0968.543.141",
  },
  {
    id: "branch-7",
    name: "Cơ sở 7 – KĐT GAMUDA, Phường Hoàng Mai",
    address: "Tầng 4, Số 10 đường 2.2, Gamuda Gardens, Phường Trần Phú, Quận Hoàng Mai, TP Hà Nội",
    phone: "0869.310.200",
  },
  {
    id: "branch-8",
    name: "Cơ sở 8 – Phố Nguyễn Tuân, Phường Thanh Xuân",
    address: "Liền kề 03-32 KĐT số 90 Nguyễn Tuân, Phường Thanh Xuân Trung, Quận Thanh Xuân, TP Hà Nội",
    phone: "0968.543.141",
  },
];

export const initialUsers: UserData[] = [
  {
    id: "user-admin",
    name: "Ban Chủ Nhiệm CLB",
    email: "admin@kttll.vn",
    phone: "0904.555.666",
    role: "ADMIN",
    baseRate: 0,
    title: "Chủ nhiệm CLB",
    hasAdminAccess: true,
  },
  {
    id: "user-coach-1",
    name: "GM Bùi Vinh",
    email: "hlv1@kttll.vn",
    phone: "0912.345.678",
    role: "COACH",
    branchId: "branch-1",
    baseRate: 250000,
    title: "Đại Kiện Tướng Quốc Tế",
    hasAdminAccess: true,
  },
  {
    id: "user-coach-2",
    name: "HLV Trần Huyền Trang",
    email: "hlv2@kttll.vn",
    phone: "0833.599.495",
    role: "COACH",
    branchId: "branch-3",
    baseRate: 200000,
    title: "HLV Quốc gia",
    hasAdminAccess: true,
  },
];

export const initialClasses: ClassroomData[] = [
  {
    id: "class-1",
    name: "Cờ vua Nhập Môn - K01",
    level: "Nhập môn",
    feePerSession: 150000,
    schedule: "Thứ 3 & Thứ 6 (18:00 - 19:30)",
    branchId: "branch-1",
    coachId: "user-coach-1",
    isActive: true,
    shareWithAdmin: true,
  },
  {
    id: "class-2",
    name: "Cờ vua Nhập Môn - K02",
    level: "Nhập môn",
    feePerSession: 160000,
    schedule: "Thứ 2 & Thứ 5 (18:00 - 19:30)",
    branchId: "branch-2",
    coachId: "user-coach-1",
    isActive: true,
    shareWithAdmin: true,
  },
  {
    id: "class-3",
    name: "Cờ vua Nâng Cao - N01",
    level: "Nâng cao",
    feePerSession: 200000,
    schedule: "Thứ 7 & CN (08:30 - 10:00)",
    branchId: "branch-3",
    coachId: "user-coach-2",
    isActive: true,
    shareWithAdmin: true,
  },
  {
    id: "class-4",
    name: "Đội tuyển Kỳ Thủ Nhí - DT01",
    level: "Đội tuyển",
    feePerSession: 250000,
    schedule: "Thứ 7 & CN (15:00 - 17:00)",
    branchId: "branch-4",
    coachId: "user-coach-1",
    isActive: true,
    shareWithAdmin: true,
  },
  {
    id: "class-5",
    name: "Cờ vua Cơ Bản - K05",
    level: "Cơ bản",
    feePerSession: 160000,
    schedule: "Thứ 4 & Thứ 7 (18:00 - 19:30)",
    branchId: "branch-5",
    coachId: "user-coach-1",
    isActive: true,
    shareWithAdmin: true,
  },
  {
    id: "class-6",
    name: "Cờ vua Nâng Cao - K06",
    level: "Nâng cao",
    feePerSession: 180000,
    schedule: "Thứ 3 & Thứ 6 (19:30 - 21:00)",
    branchId: "branch-6",
    coachId: "user-coach-2",
    isActive: true,
    shareWithAdmin: true,
  },
  {
    id: "class-7",
    name: "Cờ vua Cơ Bản - K07 (Lớp riêng)",
    level: "Cơ bản",
    feePerSession: 150000,
    schedule: "Thứ 7 & Chủ Nhật (09:00 - 10:30)",
    branchId: "branch-7",
    coachId: "user-coach-1",
    isActive: true,
    shareWithAdmin: false, // Lớp riêng của HLV (không chia sẻ quyền quản lý & xem với admin)
  },
  {
    id: "class-8",
    name: "Cờ vua Thi Đấu - TD08",
    level: "Nâng cao",
    feePerSession: 180000,
    schedule: "Thứ 4 & Thứ 7 (19:00 - 20:30)",
    branchId: "branch-8",
    coachId: "user-coach-2",
    isActive: true,
    shareWithAdmin: true,
  },
];

export const initialStudents: StudentData[] = [
  // Lớp 1 (Nhập môn - K01, Bạch Mai) - 7 học viên
  { id: "std-1", code: "HS001", fullName: "Nguyễn Minh Khang", birthYear: 2018, parentName: "Nguyễn Hoàng Nam", parentPhone: "0912111222", currentLevel: "Nhập môn", notes: "Nắm luật nhanh, rất tập trung", classIds: ["class-1"] },
  { id: "std-2", code: "HS002", fullName: "Trần Bảo An", birthYear: 2019, parentName: "Lê Thị Thu", parentPhone: "0983222333", currentLevel: "Nhập môn", notes: "Thích ăn quân Xe, vui vẻ", classIds: ["class-1"] },
  { id: "std-3", code: "HS003", fullName: "Lê Hoàng Phúc", birthYear: 2018, parentName: "Lê Văn Hùng", parentPhone: "0904333444", currentLevel: "Nhập môn", notes: "Biết phong Cấp Tốt tốt", classIds: ["class-1"], customFeePerSession: 120000 },
  { id: "std-4", code: "HS004", fullName: "Phạm Gia Huy", birthYear: 2017, parentName: "Phạm Quốc Tuấn", parentPhone: "0975444555", currentLevel: "Nhập môn", notes: "Học đều đặn", classIds: ["class-1"] },
  { id: "std-5", code: "HS005", fullName: "Vũ Tuệ Lâm", birthYear: 2018, parentName: "Nguyễn Hương Giang", parentPhone: "0966555666", currentLevel: "Nhập môn", notes: "Tư duy không gian tốt", classIds: ["class-1"] },
  { id: "std-6", code: "HS006", fullName: "Đỗ Đăng Khoa", birthYear: 2019, parentName: "Đỗ Xuân Bách", parentPhone: "0918666777", currentLevel: "Nhập môn", notes: "Mới vào học đầu tháng", classIds: ["class-1"] },
  { id: "std-7", code: "HS007", fullName: "Bùi Ngọc Hân", birthYear: 2018, parentName: "Bùi Đình Trọng", parentPhone: "0949777888", currentLevel: "Nhập môn", notes: "Ngoan ngoãn, hòa đồng", classIds: ["class-1"] },

  // Lớp 2 (Nhập môn - K02, Thái Hà) - 6 học viên
  { id: "std-8", code: "HS008", fullName: "Hoàng Đức Anh", birthYear: 2017, parentName: "Hoàng Văn Tuấn", parentPhone: "0982888999", currentLevel: "Nhập môn", notes: "Biết bẫy mở cờ", classIds: ["class-2"] },
  { id: "std-9", code: "HS009", fullName: "Đặng Quỳnh Chi", birthYear: 2017, parentName: "Trần Mai Phương", parentPhone: "0933999000", currentLevel: "Nhập môn", notes: "Phản xạ nhanh", classIds: ["class-2"] },
  { id: "std-10", code: "HS010", fullName: "Ngô Nhật Minh", birthYear: 2016, parentName: "Ngô Quang Huy", parentPhone: "0915123456", currentLevel: "Nhập môn", notes: "Nắm chắc các đòn phối hợp", classIds: ["class-2"] },
  { id: "std-11", code: "HS011", fullName: "Lý Khánh An", birthYear: 2017, parentName: "Lý Văn Toàn", parentPhone: "0978234567", currentLevel: "Nhập môn", notes: "Chăm chỉ làm bài tập", classIds: ["class-2"] },
  { id: "std-12", code: "HS012", fullName: "Trương Hải Đăng", birthYear: 2016, parentName: "Trương Quốc Đạt", parentPhone: "0909345678", currentLevel: "Nhập môn", notes: "Chiến thuật chĩa đôi rất sắc", classIds: ["class-2"] },
  { id: "std-13", code: "HS013", fullName: "Phan Thảo My", birthYear: 2018, parentName: "Phan Văn Quân", parentPhone: "0967456789", currentLevel: "Nhập môn", notes: "Rất say mê cờ vua", classIds: ["class-2"] },

  // Lớp 3 (Nâng cao - N01, Hoàng Quốc Việt) - 6 học viên
  { id: "std-14", code: "HS014", fullName: "Vũ Gia Bảo", birthYear: 2015, parentName: "Vũ Đình Khiêm", parentPhone: "0981567890", currentLevel: "Nâng cao", notes: "Đạt giải nhì cấp trường", classIds: ["class-3"] },
  { id: "std-15", code: "HS015", fullName: "Lê Minh Triết", birthYear: 2015, parentName: "Lê Hải Bình", parentPhone: "0913678901", currentLevel: "Nâng cao", notes: "Khai cuộc Italia xuất sắc", classIds: ["class-3"] },
  { id: "std-16", code: "HS016", fullName: "Nguyễn Phương Linh", birthYear: 2016, parentName: "Nguyễn Thanh Tùng", parentPhone: "0934789012", currentLevel: "Nâng cao", notes: "Tàn cuộc chắc chắn", classIds: ["class-3"] },
  { id: "std-17", code: "HS017", fullName: "Phạm Quang Dũng", birthYear: 2015, parentName: "Phạm Quốc Hùng", parentPhone: "0972890123", currentLevel: "Nâng cao", notes: "Có nhãn quan chiến lược tốt", classIds: ["class-3"] },
  { id: "std-18", code: "HS018", fullName: "Đinh Thái Sơn", birthYear: 2014, parentName: "Đinh Văn Long", parentPhone: "0903901234", currentLevel: "Nâng cao", notes: "Lực cờ tấn công mạnh", classIds: ["class-3"] },
  { id: "std-19", code: "HS019", fullName: "Trần Mai Anh", birthYear: 2016, parentName: "Trần Đình Khang", parentPhone: "0968012345", currentLevel: "Nâng cao", notes: "Tính toán biến sâu", classIds: ["class-3"] },

  // Lớp 4 (Đội tuyển - DT01, Trương Định) - 6 học viên
  { id: "std-20", code: "HS020", fullName: "Bùi Quốc Anh", birthYear: 2014, parentName: "Bùi Thế Huynh", parentPhone: "0919123888", currentLevel: "Đội tuyển", notes: "Chuẩn bị thi đấu giải Hà Nội mở rộng", classIds: ["class-4"] },
  { id: "std-21", code: "HS021", fullName: "Nguyễn Khánh Nam", birthYear: 2013, parentName: "Nguyễn Minh Đức", parentPhone: "0985234999", currentLevel: "Đội tuyển", notes: "Huy chương vàng cấp quận", classIds: ["class-4"] },
  { id: "std-22", code: "HS022", fullName: "Lê Tuấn Kiệt", birthYear: 2014, parentName: "Lê Văn Hùng", parentPhone: "0936345000", currentLevel: "Đội tuyển", notes: "Khai cuộc Sicilian lão luyện", classIds: ["class-4"] },
  { id: "std-23", code: "HS023", fullName: "Hoàng Thảo Nguyên", birthYear: 2015, parentName: "Hoàng Minh Tâm", parentPhone: "0974456111", currentLevel: "Đội tuyển", notes: "Tính nước chiếu hết rất nhạy bén", classIds: ["class-4"] },
  { id: "std-24", code: "HS024", fullName: "Trần Đức Minh", birthYear: 2013, parentName: "Trần Văn Toàn", parentPhone: "0907567222", currentLevel: "Đội tuyển", notes: "Đạt chuẩn Kiện tướng tương lai", classIds: ["class-4"], customFeePerSession: 200000 },
  { id: "std-25", code: "HS025", fullName: "Võ Minh Khôi", birthYear: 2014, parentName: "Võ Đình Trọng", parentPhone: "0962678333", currentLevel: "Đội tuyển", notes: "Tập trung cao độ, thi đấu bản lĩnh", classIds: ["class-4"] },

  // Lớp 5 (Cơ sở 5 – Láng Hạ) - 4 học viên
  { id: "std-26", code: "HS026", fullName: "Nguyễn Gia Khiêm", birthYear: 2017, parentName: "Nguyễn Văn Hưng", parentPhone: "0915667788", currentLevel: "Nhập môn", notes: "Học rất chăm chỉ", classIds: ["class-5"] },
  { id: "std-27", code: "HS027", fullName: "Trần Hà My", birthYear: 2018, parentName: "Trần Văn Cường", parentPhone: "0982334455", currentLevel: "Nhập môn", notes: "Nắm chắc luật chơi", classIds: ["class-5"] },
  { id: "std-28", code: "HS028", fullName: "Lê Minh Quân", birthYear: 2017, parentName: "Lê Tuấn Hùng", parentPhone: "0903445566", currentLevel: "Nhập môn", notes: "Thích học đòn phối hợp", classIds: ["class-5"] },
  { id: "std-29", code: "HS029", fullName: "Vũ Đăng Khôi", birthYear: 2016, parentName: "Vũ Đình Nam", parentPhone: "0976556677", currentLevel: "Nhập môn", notes: "Phản xạ nhanh", classIds: ["class-5"] },

  // Lớp 6 (Cơ sở 6 – Quang Trung, Hà Đông) - 4 học viên
  { id: "std-30", code: "HS030", fullName: "Bùi Tuấn Kiệt", birthYear: 2015, parentName: "Bùi Văn Thành", parentPhone: "0912889900", currentLevel: "Nâng cao", notes: "Đánh cờ chắc chắn", classIds: ["class-6"] },
  { id: "std-31", code: "HS031", fullName: "Đỗ Phương Thảo", birthYear: 2016, parentName: "Đỗ Minh Đức", parentPhone: "0983112244", currentLevel: "Nâng cao", notes: "Tập trung cao", classIds: ["class-6"] },
  { id: "std-32", code: "HS032", fullName: "Hoàng Gia Hưng", birthYear: 2015, parentName: "Hoàng Văn Nam", parentPhone: "0904223355", currentLevel: "Nâng cao", notes: "Lực cờ tốt", classIds: ["class-6"] },
  { id: "std-33", code: "HS033", fullName: "Phạm Ngọc Diệp", birthYear: 2016, parentName: "Phạm Quốc Toản", parentPhone: "0968334466", currentLevel: "Nâng cao", notes: "Chăm giải cờ thế", classIds: ["class-6"] },

  // Lớp 7 (Cơ sở 7 – Gamuda Gardens) - 4 học viên
  { id: "std-34", code: "HS034", fullName: "Trịnh Minh Trí", birthYear: 2018, parentName: "Trịnh Văn Tuấn", parentPhone: "0916445577", currentLevel: "Cơ bản", notes: "Rất thích cờ vua", classIds: ["class-7"] },
  { id: "std-35", code: "HS035", fullName: "Ngô Thảo Vy", birthYear: 2019, parentName: "Ngô Văn Kiên", parentPhone: "0987556688", currentLevel: "Cơ bản", notes: "Học luật đi quân nhanh", classIds: ["class-7"] },
  { id: "std-36", code: "HS036", fullName: "Đặng Quốc Bảo", birthYear: 2018, parentName: "Đặng Văn Hùng", parentPhone: "0905667799", currentLevel: "Cơ bản", notes: "Tư duy tốt", classIds: ["class-7"] },
  { id: "std-37", code: "HS037", fullName: "Nguyễn Thùy Trang", birthYear: 2018, parentName: "Nguyễn Văn Thắng", parentPhone: "0978778800", currentLevel: "Cơ bản", notes: "Ngoan ngoãn", classIds: ["class-7"] },

  // Lớp 8 (Cơ sở 8 – Nguyễn Tuân, Thanh Xuân) - 4 học viên
  { id: "std-38", code: "HS038", fullName: "Mai Đức Anh", birthYear: 2015, parentName: "Mai Văn Long", parentPhone: "0918889911", currentLevel: "Nâng cao", notes: "Chiến thuật tốt", classIds: ["class-8"] },
  { id: "std-39", code: "HS039", fullName: "Phan Khánh Linh", birthYear: 2016, parentName: "Phan Văn Hậu", parentPhone: "0989990022", currentLevel: "Nâng cao", notes: "Tàn cuộc hay", classIds: ["class-8"] },
  { id: "std-40", code: "HS040", fullName: "Lê Minh Hoàng", birthYear: 2015, parentName: "Lê Văn Sơn", parentPhone: "0906001133", currentLevel: "Nâng cao", notes: "Khai cuộc tốt", classIds: ["class-8"] },
  { id: "std-41", code: "HS041", fullName: "Vũ Bảo Trâm", birthYear: 2016, parentName: "Vũ Đình Chiến", parentPhone: "0977112244", currentLevel: "Nâng cao", notes: "Rất cố gắng", classIds: ["class-8"] },
];

// Khởi tạo các buổi học thực tế trong tháng 10/2026
export const initialSessions: AttendanceSessionData[] = [
  // Lớp 1 (Nhập môn - K01): 4 buổi học tháng 10
  {
    id: "sess-1-1",
    classId: "class-1",
    date: "2026-10-02",
    topic: "Ôn tập luật đi quân và Quy tắc Nhập thành an toàn",
    records: [
      { id: "rec-1-1-1", sessionId: "sess-1-1", studentId: "std-1", status: "PRESENT", coachNote: "Hiểu tốt quy tắc nhập thành", bookTitle: "Sách Cờ vua Nhập môn & Bài tập", bookPrice: 80000 },
      { id: "rec-1-1-2", sessionId: "sess-1-1", studentId: "std-2", status: "PRESENT", coachNote: "Cần chú ý không đi Vua qua ô bị kiểm soát" },
      { id: "rec-1-1-3", sessionId: "sess-1-1", studentId: "std-3", status: "PRESENT", coachNote: "Tập trung tốt" },
      { id: "rec-1-1-4", sessionId: "sess-1-1", studentId: "std-4", status: "ABSENT", coachNote: "Phụ huynh xin nghỉ về quê" },
      { id: "rec-1-1-5", sessionId: "sess-1-1", studentId: "std-5", status: "PRESENT", coachNote: "Thực hành nhanh", bookTitle: "Sách Cờ vua Nhập môn & Bài tập", bookPrice: 80000 },
      { id: "rec-1-1-6", sessionId: "sess-1-1", studentId: "std-6", status: "PRESENT", coachNote: "Rất hào hứng" },
      { id: "rec-1-1-7", sessionId: "sess-1-1", studentId: "std-7", status: "PRESENT", coachNote: "Làm bài tập đúng 100%" },
    ],
  },
  {
    id: "sess-1-2",
    classId: "class-1",
    date: "2026-10-06",
    topic: "Khai cuộc cơ bản: Kiểm soát 4 ô Trung tâm",
    records: [
      { id: "rec-1-2-1", sessionId: "sess-1-2", studentId: "std-1", status: "PRESENT", coachNote: "Chiếm trung tâm bằng Tốt rất chuẩn" },
      { id: "rec-1-2-2", sessionId: "sess-1-2", studentId: "std-2", status: "PRESENT", coachNote: "Tiến bộ rõ rệt" },
      { id: "rec-1-2-3", sessionId: "sess-1-2", studentId: "std-3", status: "PRESENT", coachNote: "Nhận diện đòn tấn công tốt" },
      { id: "rec-1-2-4", sessionId: "sess-1-2", studentId: "std-4", status: "PRESENT", coachNote: "Đã bắt kịp bài học" },
      { id: "rec-1-2-5", sessionId: "sess-1-2", studentId: "std-5", status: "PRESENT", coachNote: "Chiến thuật tốt" },
      { id: "rec-1-2-6", sessionId: "sess-1-2", studentId: "std-6", status: "ABSENT", coachNote: "Bị sốt, nghỉ 1 buổi" },
      { id: "rec-1-2-7", sessionId: "sess-1-2", studentId: "std-7", status: "PRESENT", coachNote: "Tích cực phát biểu" },
    ],
  },
  {
    id: "sess-1-3",
    classId: "class-1",
    date: "2026-10-09",
    topic: "Chiến thuật Đòn Bắt đôi (Fork) của quân Mã",
    records: [
      { id: "rec-1-3-1", sessionId: "sess-1-3", studentId: "std-1", status: "PRESENT", coachNote: "Bắt đôi Vua và Xe chuẩn xác" },
      { id: "rec-1-3-2", sessionId: "sess-1-3", studentId: "std-2", status: "ABSENT", coachNote: "Nghỉ có phép" },
      { id: "rec-1-3-3", sessionId: "sess-1-3", studentId: "std-3", status: "PRESENT", coachNote: "Nhìn nước cờ rất sáng" },
      { id: "rec-1-3-4", sessionId: "sess-1-3", studentId: "std-4", status: "PRESENT", coachNote: "Làm đúng 5/5 bài tập bắt đôi" },
      { id: "rec-1-3-5", sessionId: "sess-1-3", studentId: "std-5", status: "PRESENT", coachNote: "Rất chăm chỉ" },
      { id: "rec-1-3-6", sessionId: "sess-1-3", studentId: "std-6", status: "PRESENT", coachNote: "Đi học lại đầy đủ" },
      { id: "rec-1-3-7", sessionId: "sess-1-3", studentId: "std-7", status: "PRESENT", coachNote: "Thắng 2 ván đấu giao hữu" },
    ],
  },
  {
    id: "sess-1-4",
    classId: "class-1",
    date: "2026-10-13",
    topic: "Tàn cuộc Tốt: Quy tắc hình vuông và Phong Cấp",
    records: [
      { id: "rec-1-4-1", sessionId: "sess-1-4", studentId: "std-1", status: "PRESENT", coachNote: "Thuộc quy tắc hình vuông" },
      { id: "rec-1-4-2", sessionId: "sess-1-4", studentId: "std-2", status: "PRESENT", coachNote: "Thực hành đạt yêu cầu" },
      { id: "rec-1-4-3", sessionId: "sess-1-4", studentId: "std-3", status: "PRESENT", coachNote: "Xuất sắc" },
      { id: "rec-1-4-4", sessionId: "sess-1-4", studentId: "std-4", status: "PRESENT", coachNote: "Tự tin phong Hậu" },
      { id: "rec-1-4-5", sessionId: "sess-1-4", studentId: "std-5", status: "PRESENT", coachNote: "Đạt điểm tối đa" },
      { id: "rec-1-4-6", sessionId: "sess-1-4", studentId: "std-6", status: "PRESENT", coachNote: "Cố gắng rất nhiều" },
      { id: "rec-1-4-7", sessionId: "sess-1-4", studentId: "std-7", status: "PRESENT", coachNote: "Đánh cờ rất cẩn thận" },
    ],
  },

  // Lớp 2 (Nhập môn - K02): 4 buổi học tháng 10
  {
    id: "sess-2-1",
    classId: "class-2",
    date: "2026-10-01",
    topic: "Đòn Ghim quân (Pin) tuyệt đối và tương đối",
    records: [
      { id: "rec-2-1-8", sessionId: "sess-2-1", studentId: "std-8", status: "PRESENT", coachNote: "Hiểu tốt đòn ghim" },
      { id: "rec-2-1-9", sessionId: "sess-2-1", studentId: "std-9", status: "PRESENT", coachNote: "Tập trung giải thế cờ" },
      { id: "rec-2-1-10", sessionId: "sess-2-1", studentId: "std-10", status: "PRESENT", coachNote: "Xuất sắc" },
      { id: "rec-2-1-11", sessionId: "sess-2-1", studentId: "std-11", status: "ABSENT", coachNote: "Trùng lịch học thêm văn hóa" },
      { id: "rec-2-1-12", sessionId: "sess-2-1", studentId: "std-12", status: "PRESENT", coachNote: "Phối hợp đòn ghim nhanh" },
      { id: "rec-2-1-13", sessionId: "sess-2-1", studentId: "std-13", status: "PRESENT", coachNote: "Tiến bộ" },
    ],
  },
  {
    id: "sess-2-2",
    classId: "class-2",
    date: "2026-10-05",
    topic: "Khai cuộc Gambit Vua & Cách phản công chuẩn mực",
    records: [
      { id: "rec-2-2-8", sessionId: "sess-2-2", studentId: "std-8", status: "PRESENT", coachNote: "Hiểu rõ tư tưởng Gambit" },
      { id: "rec-2-2-9", sessionId: "sess-2-2", studentId: "std-9", status: "PRESENT", coachNote: "Phòng thủ kín kẽ" },
      { id: "rec-2-2-10", sessionId: "sess-2-2", studentId: "std-10", status: "PRESENT", coachNote: "Phản công trung tâm tốt" },
      { id: "rec-2-2-11", sessionId: "sess-2-2", studentId: "std-11", status: "PRESENT", coachNote: "Học bù kiến thức nhanh" },
      { id: "rec-2-2-12", sessionId: "sess-2-2", studentId: "std-12", status: "PRESENT", coachNote: "Tấn công sắc nét" },
      { id: "rec-2-2-13", sessionId: "sess-2-2", studentId: "std-13", status: "ABSENT", coachNote: "Gia đình bận việc riêng" },
    ],
  },
  {
    id: "sess-2-3",
    classId: "class-2",
    date: "2026-10-08",
    topic: "Chiến thuật Đòn Xiên (Skewer) của Hậu và Tượng",
    records: [
      { id: "rec-2-3-8", sessionId: "sess-2-3", studentId: "std-8", status: "PRESENT", coachNote: "Đòn xiên chính xác" },
      { id: "rec-2-3-9", sessionId: "sess-2-3", studentId: "std-9", status: "PRESENT", coachNote: "Giải nhanh bài tập" },
      { id: "rec-2-3-10", sessionId: "sess-2-3", studentId: "std-10", status: "PRESENT", coachNote: "Rất nhạy bén" },
      { id: "rec-2-3-11", sessionId: "sess-2-3", studentId: "std-11", status: "PRESENT", coachNote: "Nắm vững nguyên lý" },
      { id: "rec-2-3-12", sessionId: "sess-2-3", studentId: "std-12", status: "PRESENT", coachNote: "Chiến thuật chuẩn" },
      { id: "rec-2-3-13", sessionId: "sess-2-3", studentId: "std-13", status: "PRESENT", coachNote: "Làm bài tốt" },
    ],
  },
  {
    id: "sess-2-4",
    classId: "class-2",
    date: "2026-10-12",
    topic: "Chiếu hết cơ bản: Xe phối hợp Xe cắt bậc thang",
    records: [
      { id: "rec-2-3-8-4", sessionId: "sess-2-4", studentId: "std-8", status: "PRESENT", coachNote: "Cắt bậc thang chuẩn" },
      { id: "rec-2-3-9-4", sessionId: "sess-2-4", studentId: "std-9", status: "PRESENT", coachNote: "Rất tốt" },
      { id: "rec-2-3-10-4", sessionId: "sess-2-4", studentId: "std-10", status: "PRESENT", coachNote: "Chiếu hết trong 15 nước" },
      { id: "rec-2-3-11-4", sessionId: "sess-2-4", studentId: "std-11", status: "PRESENT", coachNote: "Hoàn thành bài test" },
      { id: "rec-2-3-12-4", sessionId: "sess-2-4", studentId: "std-12", status: "PRESENT", coachNote: "Xuất sắc" },
      { id: "rec-2-3-13-4", sessionId: "sess-2-4", studentId: "std-13", status: "PRESENT", coachNote: "Nắm chắc lý thuyết" },
    ],
  },

  // Lớp 3 (Nâng cao - N01): 4 buổi
  {
    id: "sess-3-1",
    classId: "class-3",
    date: "2026-10-03",
    topic: "Cấu trúc Tốt Carlsbad và Kế hoạch tấn công Thiểu số",
    records: [
      { id: "rec-3-1-14", sessionId: "sess-3-1", studentId: "std-14", status: "PRESENT", coachNote: "Hiểu sâu cấu trúc Tốt" },
      { id: "rec-3-1-15", sessionId: "sess-3-1", studentId: "std-15", status: "PRESENT", coachNote: "Tính toán chiến lược sắc sảo" },
      { id: "rec-3-1-16", sessionId: "sess-3-1", studentId: "std-16", status: "PRESENT", coachNote: "Bình tĩnh phòng thủ" },
      { id: "rec-3-1-17", sessionId: "sess-3-1", studentId: "std-17", status: "ABSENT", coachNote: "Nghỉ do thi học sinh giỏi" },
      { id: "rec-3-1-18", sessionId: "sess-3-1", studentId: "std-18", status: "PRESENT", coachNote: "Tấn công dồn dập" },
      { id: "rec-3-1-19", sessionId: "sess-3-1", studentId: "std-19", status: "PRESENT", coachNote: "Nắm chắc lý thuyết" },
    ],
  },
  {
    id: "sess-3-2",
    classId: "class-3",
    date: "2026-10-04",
    topic: "Tàn cuộc Xe cơ bản: Thế cờ Lucena & Thế cờ Philidor",
    records: [
      { id: "rec-3-2-14", sessionId: "sess-3-2", studentId: "std-14", status: "PRESENT", coachNote: "Xây cầu Lucena thành thạo" },
      { id: "rec-3-2-15", sessionId: "sess-3-2", studentId: "std-15", status: "PRESENT", coachNote: "Kỹ thuật Philidor hoàn hảo" },
      { id: "rec-3-2-16", sessionId: "sess-3-2", studentId: "std-16", status: "PRESENT", coachNote: "Phòng thủ hòa cờ chuẩn" },
      { id: "rec-3-2-17", sessionId: "sess-3-2", studentId: "std-17", status: "PRESENT", coachNote: "Nhanh chóng nắm kỹ thuật" },
      { id: "rec-3-2-18", sessionId: "sess-3-2", studentId: "std-18", status: "PRESENT", coachNote: "Tư duy tốt" },
      { id: "rec-3-2-19", sessionId: "sess-3-2", studentId: "std-19", status: "PRESENT", coachNote: "Tính toán chính xác" },
    ],
  },
  {
    id: "sess-3-3",
    classId: "class-3",
    date: "2026-10-10",
    topic: "Đòn thế Thí quân phá thành và Mở cột h",
    records: [
      { id: "rec-3-3-14", sessionId: "sess-3-3", studentId: "std-14", status: "PRESENT", coachNote: "Thí tượng h7 đẹp mắt" },
      { id: "rec-3-3-15", sessionId: "sess-3-3", studentId: "std-15", status: "PRESENT", coachNote: "Tìm ra nước cờ duy nhất" },
      { id: "rec-3-3-16", sessionId: "sess-3-3", studentId: "std-16", status: "ABSENT", coachNote: "Bị cảm nhẹ" },
      { id: "rec-3-3-17", sessionId: "sess-3-3", studentId: "std-17", status: "PRESENT", coachNote: "Khả năng phối hợp cực cao" },
      { id: "rec-3-3-18", sessionId: "sess-3-3", studentId: "std-18", status: "PRESENT", coachNote: "Chiếu hết ngoạn mục" },
      { id: "rec-3-3-19", sessionId: "sess-3-3", studentId: "std-19", status: "PRESENT", coachNote: "Lập luận thuyết phục" },
    ],
  },
  {
    id: "sess-3-4",
    classId: "class-3",
    date: "2026-10-11",
    topic: "Chiến lược chiếm Cột mở và Hàng ngang thứ 7",
    records: [
      { id: "rec-3-4-14", sessionId: "sess-3-4", studentId: "std-14", status: "PRESENT", coachNote: "Xâm nhập hàng 7 quyết liệt" },
      { id: "rec-3-4-15", sessionId: "sess-3-4", studentId: "std-15", status: "PRESENT", coachNote: "Đôi Xe hàng 7 uy lực" },
      { id: "rec-3-4-16", sessionId: "sess-3-4", studentId: "std-16", status: "PRESENT", coachNote: "Bình tĩnh hóa giải" },
      { id: "rec-3-4-17", sessionId: "sess-3-4", studentId: "std-17", status: "PRESENT", coachNote: "Kiểm soát thế trận" },
      { id: "rec-3-4-18", sessionId: "sess-3-4", studentId: "std-18", status: "PRESENT", coachNote: "Rất xuất sắc" },
      { id: "rec-3-4-19", sessionId: "sess-3-4", studentId: "std-19", status: "PRESENT", coachNote: "Tiến bộ vượt bậc" },
    ],
  },

  // Lớp 4 (Đội tuyển - DT01): 4 buổi
  {
    id: "sess-4-1",
    classId: "class-4",
    date: "2026-10-03",
    topic: "Chuyên đề Phòng thủ Sicilian: Biến thể Najdorf 6.Bg5",
    records: [
      { id: "rec-4-1-20", sessionId: "sess-4-1", studentId: "std-20", status: "PRESENT", coachNote: "Hiểu biến sâu tới nước 18", bookTitle: "Cẩm nang Đại Kiện Tướng - Sicilian", bookPrice: 150000 },
      { id: "rec-4-1-21", sessionId: "sess-4-1", studentId: "std-21", status: "PRESENT", coachNote: "Nắm vững ý đồ đối phó" },
      { id: "rec-4-1-22", sessionId: "sess-4-1", studentId: "std-22", status: "PRESENT", coachNote: "Phản công cánh Vua mạnh mẽ" },
      { id: "rec-4-1-23", sessionId: "sess-4-1", studentId: "std-23", status: "PRESENT", coachNote: "Xử lý trung tàn cuộc nhạy bén" },
      { id: "rec-4-1-24", sessionId: "sess-4-1", studentId: "std-24", status: "PRESENT", coachNote: "Chuẩn bị khai cuộc chuẩn Đại Kiện Tướng", bookTitle: "Kỹ thuật Tàn cuộc Nâng cao", bookPrice: 120000 },
      { id: "rec-4-1-25", sessionId: "sess-4-1", studentId: "std-25", status: "PRESENT", coachNote: "Tập trung tối đa" },
    ],
  },
  {
    id: "sess-4-2",
    classId: "class-4",
    date: "2026-10-04",
    topic: "Kỹ thuật tính biến sâu 5-7 nước trong thế cờ phức tạp",
    records: [
      { id: "rec-4-2-20", sessionId: "sess-4-2", studentId: "std-20", status: "PRESENT", coachNote: "Tìm ra Candidate Moves chuẩn" },
      { id: "rec-4-2-21", sessionId: "sess-4-2", studentId: "std-21", status: "ABSENT", coachNote: "Thi đấu giải cờ nhanh mở rộng" },
      { id: "rec-4-2-22", sessionId: "sess-4-2", studentId: "std-22", status: "PRESENT", coachNote: "Tính toán không sai sót" },
      { id: "rec-4-2-23", sessionId: "sess-4-2", studentId: "std-23", status: "PRESENT", coachNote: "Đạt phong độ rất cao" },
      { id: "rec-4-2-24", sessionId: "sess-4-2", studentId: "std-24", status: "PRESENT", coachNote: "Phát hiện bẫy ngầm của đối phương" },
      { id: "rec-4-2-25", sessionId: "sess-4-2", studentId: "std-25", status: "PRESENT", coachNote: "Rèn luyện thể lực và tâm lý thi đấu" },
    ],
  },
  {
    id: "sess-4-3",
    classId: "class-4",
    date: "2026-10-10",
    topic: "Đấu tập đồng loạt có đồng hồ cờ chớp (Blitz 3+2)",
    records: [
      { id: "rec-4-3-20", sessionId: "sess-4-3", studentId: "std-20", status: "PRESENT", coachNote: "Thắng 4/5 ván cờ chớp" },
      { id: "rec-4-3-21", sessionId: "sess-4-3", studentId: "std-21", status: "PRESENT", coachNote: "Bản lĩnh thi đấu vững vàng" },
      { id: "rec-4-3-22", sessionId: "sess-4-3", studentId: "std-22", status: "PRESENT", coachNote: "Quản lý thời gian tốt" },
      { id: "rec-4-3-23", sessionId: "sess-4-3", studentId: "std-23", status: "PRESENT", coachNote: "Sáng tạo trong các nước cờ khó" },
      { id: "rec-4-3-24", sessionId: "sess-4-3", studentId: "std-24", status: "PRESENT", coachNote: "Thắng toàn bộ các ván" },
      { id: "rec-4-3-25", sessionId: "sess-4-3", studentId: "std-25", status: "PRESENT", coachNote: "Phục hồi phong độ xuất sắc" },
    ],
  },
  {
    id: "sess-4-4",
    classId: "class-4",
    date: "2026-10-11",
    topic: "Tàn cuộc Mã đối Tượng: Lợi thế cấu hình Tốt đóng/mở",
    records: [
      { id: "rec-4-4-20", sessionId: "sess-4-4", studentId: "std-20", status: "PRESENT", coachNote: "Chiếm ô tiền đồn cho Mã" },
      { id: "rec-4-4-21", sessionId: "sess-4-4", studentId: "std-21", status: "PRESENT", coachNote: "Vận dụng Tốt mở cho Tượng" },
      { id: "rec-4-4-22", sessionId: "sess-4-4", studentId: "std-22", status: "ABSENT", coachNote: "Bận thi đấu giao lưu" },
      { id: "rec-4-4-23", sessionId: "sess-4-4", studentId: "std-23", status: "PRESENT", coachNote: "Bình tĩnh chuyển hóa ưu thế" },
      { id: "rec-4-4-24", sessionId: "sess-4-4", studentId: "std-24", status: "PRESENT", coachNote: "Kỹ năng tàn cuộc đỉnh cao" },
      { id: "rec-4-4-25", sessionId: "sess-4-4", studentId: "std-25", status: "PRESENT", coachNote: "Chiến thắng thuyết phục" },
    ],
  },
];

// Khởi tạo đánh giá kỳ thủ 4 tiêu chí
export const initialEvaluations: StudentEvaluationData[] = [
  { id: "eval-1", studentId: "std-1", month: 10, year: 2026, opening: 4, tactics: 4, calculation: 3, endgame: 4, generalNote: "Nắm luật rất chắc, chịu khó suy nghĩ trước khi đi cờ." },
  { id: "eval-2", studentId: "std-2", month: 10, year: 2026, opening: 3, tactics: 3, calculation: 3, endgame: 3, generalNote: "Nhanh nhẹn, cần chú ý quan sát nước cờ của đối thủ hơn." },
  { id: "eval-3", studentId: "std-3", month: 10, year: 2026, opening: 4, tactics: 4, calculation: 4, endgame: 4, generalNote: "Tư duy sáng sủa, có tiềm năng phát triển lên lớp Nhập môn." },
  { id: "eval-8", studentId: "std-8", month: 10, year: 2026, opening: 4, tactics: 4, calculation: 4, endgame: 3, generalNote: "Rất nhạy đòn phối hợp, cần rèn luyện thêm tính kiên nhẫn ở tàn cuộc." },
  { id: "eval-10", studentId: "std-10", month: 10, year: 2026, opening: 4, tactics: 5, calculation: 4, endgame: 4, generalNote: "Đòn chiến thuật sắc bén, thường xuyên tìm được nước cờ hay." },
  { id: "eval-14", studentId: "std-14", month: 10, year: 2026, opening: 4, tactics: 4, calculation: 4, endgame: 4, generalNote: "Khả năng chiến thuật toàn diện, tâm lý thi đấu rất vững." },
  { id: "eval-15", studentId: "std-15", month: 10, year: 2026, opening: 5, tactics: 4, calculation: 4, endgame: 5, generalNote: "Khai cuộc và tàn cuộc đều ở mức xuất sắc so với lứa tuổi." },
  { id: "eval-20", studentId: "std-20", month: 10, year: 2026, opening: 5, tactics: 5, calculation: 4, endgame: 5, generalNote: "Chuẩn bị tốt cho giải vô địch trẻ thành phố, phong độ ổn định." },
  { id: "eval-24", studentId: "std-24", month: 10, year: 2026, opening: 5, tactics: 5, calculation: 5, endgame: 5, generalNote: "Kỳ thủ xuất sắc nhất đội, có tư duy chiến lược đẳng cấp." },
];

export const initialBankConfig: BankConfig = {
  bankId: "MB",
  bankAccount: "0987654321",
  bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
  accountHolder: "CLB CO VUA KIEN TUONG TUONG LAI",
  qrTemplate: "compact2",
};

export const initialZaloConfig: ZaloConfig = {
  titleTemplate: "[KTTLL] THÔNG BÁO HỌC PHÍ THÁNG {month}/{year}",
  bodyTemplate: "Kính gửi phụ huynh em {studentName}, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng {month}/{year} theo nguyên tắc Thực học - Thực trả.",
  footerNote: "Lưu ý: Quý phụ huynh vui lòng thanh toán đúng cú pháp để hệ thống đối soát tự động. Mọi thắc mắc xin liên hệ Hotline CLB: 0904.555.666.",
  appId: "",
  secretKey: "",
  oaId: "",
};

/**
 * Singleton DataStore State Manager
 */
class InMemoryDataStore {
  public branches: BranchData[] = [...initialBranches];
  public users: UserData[] = [...initialUsers];
  public classes: ClassroomData[] = [...initialClasses];
  public students: StudentData[] = [...initialStudents];
  public sessions: AttendanceSessionData[] = [...initialSessions];
  public evaluations: StudentEvaluationData[] = [...initialEvaluations];
  public bankConfig: BankConfig = { ...initialBankConfig };
  public zaloConfig: ZaloConfig = { ...initialZaloConfig };
  public invoices: MonthlyInvoiceData[] = [];

  constructor() {
    this.normalizeCoachData();
    this.recalculateAllInvoices(10, 2026);
    this.loadFromLocalStorage();
  }

  // Tự động lưu dữ liệu vào localStorage trên trình duyệt để không bị mất khi F5
  public saveToLocalStorage() {
    if (typeof window === "undefined") return;
    try {
      const zaloSentMap: Record<string, string> = {};
      this.invoices.forEach((inv) => {
        if (inv.zaloSentAt) {
          zaloSentMap[inv.id] = inv.zaloSentAt;
          zaloSentMap[`${inv.classId}_${inv.studentId}_${inv.month}_${inv.year}`] = inv.zaloSentAt;
        }
      });

      const payload = {
        users: this.users,
        classes: this.classes,
        students: this.students,
        branches: this.branches,
        bankConfig: this.bankConfig,
        zaloConfig: this.zaloConfig,
        zaloSentMap,
      };
      localStorage.setItem("kttll_datastore", JSON.stringify(payload));
    } catch (e) {
      console.warn("Không thể lưu kttll_datastore vào localStorage", e);
    }
  }

  // Tự động nạp dữ liệu từ localStorage
  public loadFromLocalStorage() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("kttll_datastore");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.users && Array.isArray(data.users)) {
        data.users.forEach((u: UserData) => {
          const idx = this.users.findIndex((x) => x.id === u.id || x.email === u.email);
          if (idx >= 0) this.users[idx] = { ...this.users[idx], ...u };
          else this.users.push(u);
        });
      }
      if (data.students && Array.isArray(data.students)) {
        data.students.forEach((s: StudentData) => {
          const idx = this.students.findIndex((x) => x.id === s.id);
          if (idx >= 0) this.students[idx] = { ...this.students[idx], ...s };
          else this.students.push(s);
        });
      }
      if (data.classes && Array.isArray(data.classes)) {
        data.classes.forEach((c: ClassroomData) => {
          const idx = this.classes.findIndex((x) => x.id === c.id);
          if (idx >= 0) this.classes[idx] = { ...this.classes[idx], ...c };
          else this.classes.push(c);
        });
      }
      if (data.bankConfig) {
        this.bankConfig = { ...this.bankConfig, ...data.bankConfig };
      }
      if (data.zaloConfig) {
        this.zaloConfig = { ...this.zaloConfig, ...data.zaloConfig };
      }
      this.recalculateAllInvoices(10, 2026);

      // Phục hồi trạng thái đã gửi Zalo
      if (data.zaloSentMap && typeof data.zaloSentMap === "object") {
        this.invoices.forEach((inv) => {
          const direct = data.zaloSentMap[inv.id];
          const composite = data.zaloSentMap[`${inv.classId}_${inv.studentId}_${inv.month}_${inv.year}`];
          if (direct) inv.zaloSentAt = direct;
          else if (composite) inv.zaloSentAt = composite;
        });
      }
    } catch (e) {
      console.warn("Không thể đọc kttll_datastore từ localStorage", e);
    }
  }

  // Chuẩn hóa dữ liệu HLV mẫu và danh sách cơ sở
  public normalizeCoachData() {
    for (const u of this.users) {
      const canonical = resolveCanonicalCoachId(u.id || u.email);
      if (canonical === "user-coach-2") {
        u.name = "HLV Trần Huyền Trang";
        u.title = "HLV Quốc gia";
        u.hasAdminAccess = true;
      } else if (canonical === "user-coach-1") {
        u.name = "GM Bùi Vinh";
        u.title = "Đại Kiện Tướng Quốc Tế";
        u.hasAdminAccess = true;
      } else if (canonical === "user-admin") {
        u.hasAdminAccess = true;
      }
      if (u.name && u.name.includes("ĐKT")) {
        u.name = u.name.replace(/ĐKT/g, "GM");
      }
    }

    // Đồng bộ đầy đủ 8 cơ sở theo chuẩn kientuongtuonglai.com
    initialBranches.forEach((ib) => {
      const existing = this.branches.find((b) => b.id === ib.id);
      if (existing) {
        existing.name = ib.name;
        existing.address = ib.address;
        existing.phone = ib.phone;
      } else {
        this.branches.push(ib);
      }
    });

    // Chuẩn hóa loại bỏ trình độ Vỡ Lòng, chuyển sang Nhập môn hoặc Cơ bản và gán shareWithAdmin
    for (const c of this.classes) {
      if (c.level === "Vỡ lòng") {
        c.level = "Nhập môn";
      }
      if (c.name.includes("Vỡ Lòng")) {
        c.name = c.name.replace(/Vỡ Lòng/g, "Nhập Môn");
      }
      if (c.shareWithAdmin === undefined) {
        c.shareWithAdmin = c.id === "class-7" ? false : true;
      }
    }
    for (const s of this.students) {
      if (s.currentLevel === "Vỡ lòng") {
        s.currentLevel = "Nhập môn";
      }
    }

    // Đồng bộ các lớp học mẫu cho 8 cơ sở
    initialClasses.forEach((ic) => {
      const existingCls = this.classes.find((c) => c.id === ic.id);
      if (existingCls) {
        existingCls.branchId = ic.branchId;
        existingCls.name = ic.name;
        existingCls.level = ic.level;
        existingCls.schedule = ic.schedule;
        existingCls.shareWithAdmin = ic.shareWithAdmin;
      } else {
        this.classes.push(ic);
      }
    });

    // Đồng bộ học viên mẫu cho các lớp mới
    initialStudents.forEach((is) => {
      if (!this.students.some((s) => s.id === is.id)) {
        this.students.push(is);
      }
    });
  }

  // Cập nhật thông tin toàn diện của Huấn luyện viên
  public updateCoach(coachId: string, data: Partial<UserData>) {
    const coach = this.users.find((u) => u.id === coachId);
    if (coach) {
      Object.assign(coach, data);
      this.saveToLocalStorage();
      return coach;
    }
    return null;
  }

  // Cấp hoặc thu hồi quyền truy cập Admin cho Huấn luyện viên
  public setCoachAdminAccess(coachId: string, hasAccess: boolean) {
    const coach = this.users.find((u) => u.id === coachId);
    if (coach) {
      coach.hasAdminAccess = hasAccess;
      this.saveToLocalStorage();
      return coach;
    }
    return null;
  }

  // Đăng ký Huấn luyện viên mới (Hoàn toàn sạch dữ liệu mẫu, không tạo lớp hoặc học sinh ảo)
  public registerCoach(data: Omit<UserData, "id" | "role"> & { password?: string }) {
    const coachId = `user-coach-${Date.now()}`;
    const newCoach: UserData = {
      ...data,
      id: coachId,
      role: "COACH",
      baseRate: data.baseRate || 200000,
      title: data.title || "HLV Quốc gia",
      createdAt: new Date().toISOString(),
    };
    this.users.push(newCoach);

    // Không tự động tạo lớp học mẫu hay học viên mẫu để tài khoản người dùng mới đăng ký hoàn toàn sạch sẽ.
    this.saveToLocalStorage();
    return newCoach;
  }

  // Dọn dẹp toàn bộ dữ liệu mẫu (các lớp học, học sinh, điểm danh, hóa đơn mẫu)
  public cleanDemoData() {
    const demoClassIds = ["class-1", "class-2", "class-3", "class-4"];
    const demoStudentIds = initialStudents.map((s) => s.id);
    const demoSessionIds = initialSessions.map((s) => s.id);

    this.classes = this.classes.filter(
      (c) => !demoClassIds.includes(c.id) && !c.id.startsWith("class-demo")
    );
    this.students = this.students.filter((s) => !demoStudentIds.includes(s.id));
    this.sessions = this.sessions.filter(
      (sess) => !demoSessionIds.includes(sess.id) && !demoClassIds.includes(sess.classId)
    );
    this.evaluations = this.evaluations.filter((ev) => !demoStudentIds.includes(ev.studentId));
    this.invoices = this.invoices.filter(
      (inv) => !demoClassIds.includes(inv.classId) && !demoStudentIds.includes(inv.studentId)
    );

    this.saveToLocalStorage();
  }

  // Khôi phục lại dữ liệu mẫu cho mục đích demo
  public restoreDemoData() {
    initialClasses.forEach((ic) => {
      if (!this.classes.some((c) => c.id === ic.id)) this.classes.push(ic);
    });
    initialStudents.forEach((is) => {
      if (!this.students.some((s) => s.id === is.id)) this.students.push(is);
    });
    initialSessions.forEach((isess) => {
      if (!this.sessions.some((s) => s.id === isess.id)) this.sessions.push(isess);
    });
    initialEvaluations.forEach((iev) => {
      if (!this.evaluations.some((e) => e.id === iev.id)) this.evaluations.push(iev);
    });
    this.recalculateAllInvoices(10, 2026);
    this.saveToLocalStorage();
  }

  // Cập nhật thông tin toàn diện của Lớp học
  public updateClass(classId: string, data: Partial<ClassroomData>) {
    const cls = this.classes.find((c) => c.id === classId);
    if (cls) {
      Object.assign(cls, data);
      if (data.feePerSession !== undefined) {
        this.recalculateAllInvoices(10, 2026);
      }
      this.saveToLocalStorage();
      return cls;
    }
    return null;
  }

  // Cập nhật thông tin cơ sở
  public updateBranch(branchId: string, data: Partial<BranchData>) {
    const branch = this.branches.find((b) => b.id === branchId);
    if (branch) {
      Object.assign(branch, data);
      this.saveToLocalStorage();
      return branch;
    }
    return null;
  }

  // Xóa cơ sở đào tạo
  public deleteBranch(branchId: string) {
    this.branches = this.branches.filter((b) => b.id !== branchId);
    this.saveToLocalStorage();
    return true;
  }

  // Xóa lớp học
  public deleteClass(classId: string) {
    this.classes = this.classes.filter((c) => c.id !== classId);
    // Gỡ lớp khỏi danh sách học viên
    this.students.forEach((s) => {
      s.classIds = s.classIds.filter((cid) => cid !== classId);
    });
    this.recalculateAllInvoices(10, 2026);
    this.saveToLocalStorage();
    return true;
  }

  // Xóa huấn luyện viên
  public deleteCoach(coachId: string) {
    this.users = this.users.filter((u) => u.id !== coachId);
    this.saveToLocalStorage();
    return true;
  }

  // Thêm học viên mới
  public addStudent(student: StudentData) {
    this.students.push(student);
    this.recalculateAllInvoices(10, 2026);
    this.saveToLocalStorage();
    return student;
  }

  // Cập nhật thông tin học viên (hỗ trợ inline editing & đổi ảnh avatar)
  public updateStudent(studentId: string, data: Partial<StudentData>) {
    const student = this.students.find((s) => s.id === studentId);
    if (student) {
      Object.assign(student, data);
      if (data.customFeePerSession !== undefined) {
        this.recalculateAllInvoices(10, 2026);
      }
      this.saveToLocalStorage();
      return student;
    }
    return null;
  }

  // Xóa học viên
  public deleteStudent(studentId: string) {
    this.students = this.students.filter((s) => s.id !== studentId);
    this.recalculateAllInvoices(10, 2026);
    this.saveToLocalStorage();
    return true;
  }

  // Tự động tính toán hóa đơn học phí cho tất cả học viên theo nguyên tắc THỰC HỌC - THỰC TRẢ
  public recalculateAllInvoices(month: number, year: number) {
    const newInvoices: MonthlyInvoiceData[] = [];

    for (const cls of this.classes) {
      // Tìm tất cả học sinh thuộc lớp này
      const classStudents = this.students.filter((s) => s.classIds.includes(cls.id));

      // Lấy tất cả các buổi học của lớp trong tháng/năm đó
      const classSessions = this.sessions.filter((sess) => {
        if (sess.classId !== cls.id) return false;
        const d = new Date(sess.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });

      for (const student of classStudents) {
        // Đếm số buổi có mặt
        let presentCount = 0;
        for (const sess of classSessions) {
          const record = sess.records.find((r) => r.studentId === student.id);
          if (record && record.status === "PRESENT") {
            presentCount += 1;
          }
        }

        // Ưu tiên đơn giá riêng của từng học viên (nếu có), nếu không áp dụng đơn giá chung của lớp
        const feePerSession = (student.customFeePerSession !== undefined && student.customFeePerSession !== null)
          ? student.customFeePerSession
          : cls.feePerSession;
        // Công thức THỰC HỌC - THỰC TRẢ: Số buổi Có mặt * Đơn giá
        const totalAmount = presentCount * feePerSession;

        // Sinh mã hóa đơn: HP-[YEAR][MONTH]-[CODE]
        const paddedMonth = month.toString().padStart(2, "0");
        const invoiceCode = `HP-${year}${paddedMonth}-${student.code}`;

        // Kiểm tra xem đã có hóa đơn cũ chưa để giữ trạng thái thanh toán
        const existing = this.invoices.find(
          (inv) => inv.classId === cls.id && inv.studentId === student.id && inv.month === month && inv.year === year
        );

        newInvoices.push({
          id: existing?.id || `inv-${cls.id}-${student.id}-${month}-${year}`,
          invoiceCode,
          classId: cls.id,
          studentId: student.id,
          month,
          year,
          presentCount,
          feePerSession,
          totalAmount,
          status: existing ? existing.status : (Math.random() > 0.5 ? "PAID" : "PENDING"),
          zaloSentAt: existing?.zaloSentAt,
          vietQrUrl: existing?.vietQrUrl,
          createdAt: existing?.createdAt || new Date().toISOString(),
        });
      }
    }

    this.invoices = newInvoices;
  }

  // Đánh dấu hóa đơn đã gửi Zalo thành công
  public markInvoiceZaloSent(invoiceId: string, sentAt?: string) {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    if (inv) {
      inv.zaloSentAt = sentAt || new Date().toISOString();
      this.saveToLocalStorage();
    }
  }

  // Đánh dấu hóa đơn đã gửi Zalo theo lớp, học viên, tháng, năm
  public markInvoiceZaloSentByStudent(
    classId: string,
    studentId: string,
    month: number,
    year: number,
    sentAt?: string
  ) {
    const inv = this.invoices.find(
      (i) => i.classId === classId && i.studentId === studentId && i.month === month && i.year === year
    );
    if (inv) {
      inv.zaloSentAt = sentAt || new Date().toISOString();
      this.saveToLocalStorage();
    }
  }

  // Tính thù lao HLV: Số ca dạy thực tế * Đơn giá ca dạy
  public getCoachPayroll(month: number, year: number, onlySharedWithAdmin: boolean = false) {
    return this.users
      .filter((u) => u.role === "COACH")
      .map((coach) => {
        // Các lớp mà HLV này phụ trách (nếu Admin xem thì loại trừ các lớp riêng HLV không share)
        const coachClasses = this.classes.filter((c) => {
          if (onlySharedWithAdmin && c.shareWithAdmin === false) return false;
          return (
            c.coachId === coach.id ||
            resolveCanonicalCoachId(c.coachId) === resolveCanonicalCoachId(coach.id) ||
            (coach.email && resolveCanonicalCoachId(c.coachId) === resolveCanonicalCoachId(coach.email))
          );
        });
        const classIds = coachClasses.map((c) => c.id);

        // Các ca dạy thực tế đã hoàn thành trong tháng
        const sessionsInMonth = this.sessions.filter((sess) => {
          if (!classIds.includes(sess.classId)) return false;
          const d = new Date(sess.date);
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        });

        // Tổng học phí từ các lớp mà HLV phụ trách trong tháng (quy tắc Thực học - Thực trả)
        const coachInvoices = this.invoices.filter(
          (inv) => classIds.includes(inv.classId) && inv.month === month && inv.year === year
        );
        const totalTuition = coachInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const tuitionCommission = Math.round(totalTuition * 0.5); // 50% Tổng học phí

        // Tiền sách phát cho học viên trong các buổi dạy của HLV trong tháng
        let totalBooksCount = 0;
        let totalBookRevenue = 0;
        sessionsInMonth.forEach((sess) => {
          sess.records.forEach((rec) => {
            if (rec.bookPrice && rec.bookPrice > 0) {
              totalBooksCount += 1;
              totalBookRevenue += rec.bookPrice;
            }
          });
        });
        const bookCommission = Math.round(totalBookRevenue * 0.3); // 30% Tiền sách

        // Công thức mới: Thu nhập HLV = Tổng học phí * 50% + Tiền sách * 30%
        const totalSessions = sessionsInMonth.length;
        const totalIncome = tuitionCommission + bookCommission;

        return {
          coachId: coach.id,
          coachName: coach.name,
          coachPhone: coach.phone,
          branchName: this.branches.find((b) => b.id === coach.branchId)?.name || "Chưa gán",
          totalSessions,
          totalTuition,
          tuitionCommission,
          totalBooksCount,
          totalBookRevenue,
          bookCommission,
          totalIncome,
          totalSalary: totalIncome, // compatibility alias
          month,
          year,
          classesCount: coachClasses.length,
          sessionsList: sessionsInMonth,
        };
      });
  }

  // Cập nhật đơn giá học phí riêng theo từng học viên (học bổng, ưu đãi hoặc thỏa thuận riêng)
  public updateStudentFee(studentId: string, customFeePerSession: number | null) {
    const student = this.students.find((s) => s.id === studentId);
    if (student) {
      if (customFeePerSession === null || isNaN(customFeePerSession) || customFeePerSession < 0) {
        delete student.customFeePerSession;
      } else {
        student.customFeePerSession = customFeePerSession;
      }
      this.recalculateAllInvoices(10, 2026);
      this.saveToLocalStorage();
    }
  }

  // Cập nhật thông tin phát sách cho học viên trong buổi điểm danh
  public updateRecordBook(sessionId: string, studentId: string, bookTitle?: string, bookPrice?: number) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (session) {
      const rec = session.records.find((r) => r.studentId === studentId);
      if (rec) {
        if (!bookTitle || !bookPrice || bookPrice <= 0) {
          delete rec.bookTitle;
          delete rec.bookPrice;
        } else {
          rec.bookTitle = bookTitle;
          rec.bookPrice = bookPrice;
        }
        this.saveToLocalStorage();
      }
    }
  }

  // Cập nhật cấu hình ngân hàng thụ hưởng & mã VietQR
  public updateBankConfig(data: Partial<BankConfig>) {
    Object.assign(this.bankConfig, data);
    this.saveToLocalStorage();
    return this.bankConfig;
  }

  // Cập nhật mẫu tin nhắn Zalo OA
  public updateZaloConfig(data: Partial<ZaloConfig>) {
    Object.assign(this.zaloConfig, data);
    this.saveToLocalStorage();
    return this.zaloConfig;
  }

  // Lấy danh sách lớp mà Quản trị viên (Admin) được phép xem và quản lý
  public getAdminClasses(): ClassroomData[] {
    return this.classes.filter((c) => c.shareWithAdmin !== false);
  }
}

// Global singleton instance
const globalStore = globalThis as unknown as { __kttllStore: InMemoryDataStore | undefined };

if (!globalStore.__kttllStore) {
  globalStore.__kttllStore = new InMemoryDataStore();
}

export const dataStore = globalStore.__kttllStore;

/**
 * Chuẩn hóa và map ID / Email / Name của HLV về canonical ID chuẩn
 */
export function resolveCanonicalCoachId(coachIdOrEmail?: string): string {
  if (!coachIdOrEmail) return "user-coach-1";
  const str = String(coachIdOrEmail).toLowerCase().trim();

  // GM Bùi Vinh (HLV 1)
  if (
    str === "user-coach-1" ||
    str === "c5d28630-d676-4746-adf3-481504084b3a" ||
    str === "hlv1@kttll.vn" ||
    str.includes("hlv1") ||
    str.includes("bui vinh") ||
    str.includes("bùi vinh")
  ) {
    return "user-coach-1";
  }

  // HLV Trần Huyền Trang (HLV 2)
  if (
    str === "user-coach-2" ||
    str === "102dedb3-2dbe-4f91-a9dd-80ff4e31caa0" ||
    str === "00477341-c15a-430a-8d1f-a64e39c03a9c" ||
    str === "hlv2@kttll.vn" ||
    str === "trantrang66c@gmail.com" ||
    str.includes("hlv2") ||
    str.includes("trantrang") ||
    str.includes("huyen trang") ||
    str.includes("huyền trang")
  ) {
    return "user-coach-2";
  }

  // Ban Chủ Nhiệm (Admin)
  if (
    str === "user-admin" ||
    str === "2054bdb5-6e30-4d7b-b6f5-b041ccc6cb77" ||
    str === "admin@kttll.vn" ||
    str.includes("admin")
  ) {
    return "user-admin";
  }

  // Tìm trong dataStore.users nếu có email hoặc id khớp
  if (dataStore && dataStore.users) {
    const found = dataStore.users.find(
      (u) => u.id === coachIdOrEmail || (u.email && u.email.toLowerCase() === str)
    );
    if (found) {
      if (found.email.toLowerCase() === "trantrang66c@gmail.com" || (found.name && found.name.includes("Huyền Trang"))) {
        return "user-coach-2";
      }
      if (found.email.toLowerCase() === "hlv1@kttll.vn" || (found.name && found.name.includes("Bùi Vinh"))) {
        return "user-coach-1";
      }
      return found.id;
    }
  }

  return coachIdOrEmail;
}

/**
 * Kiểm tra xem lớp học có thuộc về HLV này hay không (hỗ trợ cả UUID, email và canonical ID)
 */
export function isClassOwnedByCoach(cls: ClassroomData, coachId?: string, coachEmail?: string): boolean {
  if (!cls) return false;
  if (!coachId && !coachEmail) return false;

  if (coachId && cls.coachId === coachId) return true;
  if (coachEmail && cls.coachId === coachEmail) return true;

  const classCanonical = resolveCanonicalCoachId(cls.coachId);
  const userCanonical = resolveCanonicalCoachId(coachId || coachEmail);

  if (classCanonical === userCanonical) return true;

  if (coachEmail) {
    const emailCanonical = resolveCanonicalCoachId(coachEmail);
    if (classCanonical === emailCanonical) return true;
  }

  return false;
}

/**
 * Kiểm tra xem tài khoản có phải là tài khoản mẫu/demo của hệ thống hay không
 */
export function isDemoCoach(coachId?: string): boolean {
  if (!coachId) return false;
  const canonical = resolveCanonicalCoachId(coachId);
  return canonical === "user-coach-1" || canonical === "user-coach-2" || canonical === "user-admin";
}

/**
 * Lấy danh sách lớp học của riêng Huấn luyện viên
 * Hỗ trợ nhận diện chính xác theo cả ID cơ sở dữ liệu Supabase, Email và Canonical Mock ID
 */
export function getCoachClasses(coachId?: string, coachEmail?: string): ClassroomData[] {
  if (!coachId && !coachEmail) return [];
  return dataStore.classes.filter((c) => isClassOwnedByCoach(c, coachId, coachEmail));
}

/**
 * Lấy danh sách học viên của riêng Huấn luyện viên
 */
export function getCoachStudents(coachId?: string, coachEmail?: string): StudentData[] {
  if (!coachId && !coachEmail) return [];
  const coachClasses = getCoachClasses(coachId, coachEmail);
  const classIds = coachClasses.map((c) => c.id);
  return dataStore.students.filter((s) => s.classIds.some((cid) => classIds.includes(cid)));
}

/**
 * Lấy danh sách lớp học mà Admin được phép xem và quản trị (loại trừ các lớp riêng HLV không chia sẻ)
 */
export function getAdminClasses(): ClassroomData[] {
  return dataStore.classes.filter((c) => c.shareWithAdmin !== false);
}
