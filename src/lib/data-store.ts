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
  role: 'ADMIN' | 'COACH';
  branchId?: string;
  baseRate: number; // 200.000đ/ca
  title?: string;
}

export interface ClassroomData {
  id: string;
  name: string;
  level: string; // Vỡ lòng, Nhập môn, Nâng cao, Đội tuyển
  feePerSession: number;
  schedule: string;
  branchId: string;
  coachId: string;
  isActive: boolean;
}

export interface StudentData {
  id: string;
  code: string; // VD: HS001
  fullName: string;
  birthYear: number;
  parentName: string;
  parentPhone: string;
  currentLevel: string;
  eloRating: number;
  notes?: string;
  classIds: string[];
}

export interface AttendanceRecordData {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT';
  coachNote?: string;
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
}

// Khởi tạo cơ sở dữ liệu mẫu ban đầu
export const initialBranches: BranchData[] = [
  { id: "branch-1", name: "Cơ sở 1 - Bạch Mai", address: "187 Bạch Mai, Q. Hai Bà Trưng, Hà Nội", phone: "0988.123.456" },
  { id: "branch-2", name: "Cơ sở 2 - Thái Hà", address: "45 Thái Hà, Q. Đống Đa, Hà Nội", phone: "0988.654.321" },
  { id: "branch-3", name: "Cơ sở 3 - Hoàng Quốc Việt", address: "120 Hoàng Quốc Việt, Q. Cầu Giấy, Hà Nội", phone: "0977.888.999" },
  { id: "branch-4", name: "Cơ sở 4 - Trương Định", address: "254 Trương Định, Q. Hoàng Mai, Hà Nội", phone: "0966.555.444" },
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
  },
  {
    id: "user-coach-1",
    name: "ĐKT Bùi Vinh",
    email: "hlv1@kttll.vn",
    phone: "0912.345.678",
    role: "COACH",
    branchId: "branch-1",
    baseRate: 250000,
    title: "Đại Kiện Tướng Quốc Tế / Trưởng ban Chuyên môn",
  },
  {
    id: "user-coach-2",
    name: "HLV Nguyễn Văn Hùng",
    email: "hlv2@kttll.vn",
    phone: "0983.112.233",
    role: "COACH",
    branchId: "branch-3",
    baseRate: 200000,
    title: "Kiện tướng Quốc gia / HLV Trẻ",
  },
];

export const initialClasses: ClassroomData[] = [
  {
    id: "class-1",
    name: "Cờ vua Vỡ Lòng - K01",
    level: "Vỡ lòng",
    feePerSession: 150000,
    schedule: "Thứ 3 & Thứ 6 (18:00 - 19:30)",
    branchId: "branch-1",
    coachId: "user-coach-1",
    isActive: true,
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
  },
];

export const initialStudents: StudentData[] = [
  // Lớp 1 (Vỡ lòng - K01, Bạch Mai) - 7 học viên
  { id: "std-1", code: "HS001", fullName: "Nguyễn Minh Khang", birthYear: 2018, parentName: "Nguyễn Hoàng Nam", parentPhone: "0912111222", currentLevel: "Vỡ lòng", eloRating: 1020, notes: "Nắm luật nhanh, rất tập trung", classIds: ["class-1"] },
  { id: "std-2", code: "HS002", fullName: "Trần Bảo An", birthYear: 2019, parentName: "Lê Thị Thu", parentPhone: "0983222333", currentLevel: "Vỡ lòng", eloRating: 980, notes: "Thích ăn quân Xe, vui vẻ", classIds: ["class-1"] },
  { id: "std-3", code: "HS003", fullName: "Lê Hoàng Phúc", birthYear: 2018, parentName: "Lê Văn Hùng", parentPhone: "0904333444", currentLevel: "Vỡ lòng", eloRating: 1050, notes: "Biết phong Cấp Tốt tốt", classIds: ["class-1"] },
  { id: "std-4", code: "HS004", fullName: "Phạm Gia Huy", birthYear: 2017, parentName: "Phạm Quốc Tuấn", parentPhone: "0975444555", currentLevel: "Vỡ lòng", eloRating: 1010, notes: "Học đều đặn", classIds: ["class-1"] },
  { id: "std-5", code: "HS005", fullName: "Vũ Tuệ Lâm", birthYear: 2018, parentName: "Nguyễn Hương Giang", parentPhone: "0966555666", currentLevel: "Vỡ lòng", eloRating: 1040, notes: "Tư duy không gian tốt", classIds: ["class-1"] },
  { id: "std-6", code: "HS006", fullName: "Đỗ Đăng Khoa", birthYear: 2019, parentName: "Đỗ Xuân Bách", parentPhone: "0918666777", currentLevel: "Vỡ lòng", eloRating: 990, notes: "Mới vào học đầu tháng", classIds: ["class-1"] },
  { id: "std-7", code: "HS007", fullName: "Bùi Ngọc Hân", birthYear: 2018, parentName: "Bùi Đình Trọng", parentPhone: "0949777888", currentLevel: "Vỡ lòng", eloRating: 1030, notes: "Ngoan ngoãn, hòa đồng", classIds: ["class-1"] },

  // Lớp 2 (Nhập môn - K02, Thái Hà) - 6 học viên
  { id: "std-8", code: "HS008", fullName: "Hoàng Đức Anh", birthYear: 2017, parentName: "Hoàng Văn Tuấn", parentPhone: "0982888999", currentLevel: "Nhập môn", eloRating: 1120, notes: "Biết bẫy mở cờ", classIds: ["class-2"] },
  { id: "std-9", code: "HS009", fullName: "Đặng Quỳnh Chi", birthYear: 2017, parentName: "Trần Mai Phương", parentPhone: "0933999000", currentLevel: "Nhập môn", eloRating: 1100, notes: "Phản xạ nhanh", classIds: ["class-2"] },
  { id: "std-10", code: "HS010", fullName: "Ngô Nhật Minh", birthYear: 2016, parentName: "Ngô Quang Huy", parentPhone: "0915123456", currentLevel: "Nhập môn", eloRating: 1150, notes: "Nắm chắc các đòn phối hợp", classIds: ["class-2"] },
  { id: "std-11", code: "HS011", fullName: "Lý Khánh An", birthYear: 2017, parentName: "Lý Văn Toàn", parentPhone: "0978234567", currentLevel: "Nhập môn", eloRating: 1080, notes: "Chăm chỉ làm bài tập", classIds: ["class-2"] },
  { id: "std-12", code: "HS012", fullName: "Trương Hải Đăng", birthYear: 2016, parentName: "Trương Quốc Đạt", parentPhone: "0909345678", currentLevel: "Nhập môn", eloRating: 1140, notes: "Chiến thuật chĩa đôi rất sắc", classIds: ["class-2"] },
  { id: "std-13", code: "HS013", fullName: "Phan Thảo My", birthYear: 2018, parentName: "Phan Văn Quân", parentPhone: "0967456789", currentLevel: "Nhập môn", eloRating: 1090, notes: "Rất say mê cờ vua", classIds: ["class-2"] },

  // Lớp 3 (Nâng cao - N01, Hoàng Quốc Việt) - 6 học viên
  { id: "std-14", code: "HS014", fullName: "Vũ Gia Bảo", birthYear: 2015, parentName: "Vũ Đình Khiêm", parentPhone: "0981567890", currentLevel: "Nâng cao", eloRating: 1280, notes: "Đạt giải nhì cấp trường", classIds: ["class-3"] },
  { id: "std-15", code: "HS015", fullName: "Lê Minh Triết", birthYear: 2015, parentName: "Lê Hải Bình", parentPhone: "0913678901", currentLevel: "Nâng cao", eloRating: 1310, notes: "Khai cuộc Italia xuất sắc", classIds: ["class-3"] },
  { id: "std-16", code: "HS016", fullName: "Nguyễn Phương Linh", birthYear: 2016, parentName: "Nguyễn Thanh Tùng", parentPhone: "0934789012", currentLevel: "Nâng cao", eloRating: 1250, notes: "Tàn cuộc chắc chắn", classIds: ["class-3"] },
  { id: "std-17", code: "HS017", fullName: "Phạm Quang Dũng", birthYear: 2015, parentName: "Phạm Quốc Hùng", parentPhone: "0972890123", currentLevel: "Nâng cao", eloRating: 1290, notes: "Có nhãn quan chiến lược tốt", classIds: ["class-3"] },
  { id: "std-18", code: "HS018", fullName: "Đinh Thái Sơn", birthYear: 2014, parentName: "Đinh Văn Long", parentPhone: "0903901234", currentLevel: "Nâng cao", eloRating: 1330, notes: "Lực cờ tấn công mạnh", classIds: ["class-3"] },
  { id: "std-19", code: "HS019", fullName: "Trần Mai Anh", birthYear: 2016, parentName: "Trần Đình Khang", parentPhone: "0968012345", currentLevel: "Nâng cao", eloRating: 1270, notes: "Tính toán biến sâu", classIds: ["class-3"] },

  // Lớp 4 (Đội tuyển - DT01, Trương Định) - 6 học viên
  { id: "std-20", code: "HS020", fullName: "Bùi Quốc Anh", birthYear: 2014, parentName: "Bùi Thế Huynh", parentPhone: "0919123888", currentLevel: "Đội tuyển", eloRating: 1460, notes: "Chuẩn bị thi đấu giải Hà Nội mở rộng", classIds: ["class-4"] },
  { id: "std-21", code: "HS021", fullName: "Nguyễn Khánh Nam", birthYear: 2013, parentName: "Nguyễn Minh Đức", parentPhone: "0985234999", currentLevel: "Đội tuyển", eloRating: 1420, notes: "Huy chương vàng cấp quận", classIds: ["class-4"] },
  { id: "std-22", code: "HS022", fullName: "Lê Tuấn Kiệt", birthYear: 2014, parentName: "Lê Văn Hùng", parentPhone: "0936345000", currentLevel: "Đội tuyển", eloRating: 1390, notes: "Khai cuộc Sicilian lão luyện", classIds: ["class-4"] },
  { id: "std-23", code: "HS023", fullName: "Hoàng Thảo Nguyên", birthYear: 2015, parentName: "Hoàng Minh Tâm", parentPhone: "0974456111", currentLevel: "Đội tuyển", eloRating: 1410, notes: "Tính nước chiếu hết rất nhạy bén", classIds: ["class-4"] },
  { id: "std-24", code: "HS024", fullName: "Trần Đức Minh", birthYear: 2013, parentName: "Trần Văn Toàn", parentPhone: "0907567222", currentLevel: "Đội tuyển", eloRating: 1480, notes: "Đạt chuẩn Kiện tướng tương lai", classIds: ["class-4"] },
  { id: "std-25", code: "HS025", fullName: "Võ Minh Khôi", birthYear: 2014, parentName: "Võ Đình Trọng", parentPhone: "0962678333", currentLevel: "Đội tuyển", eloRating: 1430, notes: "Tập trung cao độ, thi đấu bản lĩnh", classIds: ["class-4"] },
];

// Khởi tạo các buổi học thực tế trong tháng 10/2026
export const initialSessions: AttendanceSessionData[] = [
  // Lớp 1 (Vỡ lòng - K01): 4 buổi học tháng 10
  {
    id: "sess-1-1",
    classId: "class-1",
    date: "2026-10-02",
    topic: "Ôn tập luật đi quân và Quy tắc Nhập thành an toàn",
    records: [
      { id: "rec-1-1-1", sessionId: "sess-1-1", studentId: "std-1", status: "PRESENT", coachNote: "Hiểu tốt quy tắc nhập thành" },
      { id: "rec-1-1-2", sessionId: "sess-1-1", studentId: "std-2", status: "PRESENT", coachNote: "Cần chú ý không đi Vua qua ô bị kiểm soát" },
      { id: "rec-1-1-3", sessionId: "sess-1-1", studentId: "std-3", status: "PRESENT", coachNote: "Tập trung tốt" },
      { id: "rec-1-1-4", sessionId: "sess-1-1", studentId: "std-4", status: "ABSENT", coachNote: "Phụ huynh xin nghỉ về quê" },
      { id: "rec-1-1-5", sessionId: "sess-1-1", studentId: "std-5", status: "PRESENT", coachNote: "Thực hành nhanh" },
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
      { id: "rec-4-1-20", sessionId: "sess-4-1", studentId: "std-20", status: "PRESENT", coachNote: "Hiểu biến sâu tới nước 18" },
      { id: "rec-4-1-21", sessionId: "sess-4-1", studentId: "std-21", status: "PRESENT", coachNote: "Nắm vững ý đồ đối phó" },
      { id: "rec-4-1-22", sessionId: "sess-4-1", studentId: "std-22", status: "PRESENT", coachNote: "Phản công cánh Vua mạnh mẽ" },
      { id: "rec-4-1-23", sessionId: "sess-4-1", studentId: "std-23", status: "PRESENT", coachNote: "Xử lý trung tàn cuộc nhạy bén" },
      { id: "rec-4-1-24", sessionId: "sess-4-1", studentId: "std-24", status: "PRESENT", coachNote: "Chuẩn bị khai cuộc chuẩn Đại Kiện Tướng" },
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
  { id: "eval-24", studentId: "std-24", month: 10, year: 2026, opening: 5, tactics: 5, calculation: 5, endgame: 5, generalNote: "Kỳ thủ xuất sắc nhất đội, Elo 1480, có tư duy chiến lược đẳng cấp." },
];

export const initialBankConfig: BankConfig = {
  bankId: "MB",
  bankAccount: "0987654321",
  bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
  accountHolder: "CLB CO VUA KIEN TUONG TUONG LAI",
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
  public invoices: MonthlyInvoiceData[] = [];

  constructor() {
    this.recalculateAllInvoices(10, 2026);
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

        const feePerSession = cls.feePerSession;
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

  // Tính thù lao HLV: Số ca dạy thực tế * Đơn giá ca dạy
  public getCoachPayroll(month: number, year: number) {
    return this.users
      .filter((u) => u.role === "COACH")
      .map((coach) => {
        // Các lớp mà HLV này phụ trách
        const coachClasses = this.classes.filter((c) => c.coachId === coach.id);
        const classIds = coachClasses.map((c) => c.id);

        // Các ca dạy thực tế đã hoàn thành trong tháng
        const sessionsInMonth = this.sessions.filter((sess) => {
          if (!classIds.includes(sess.classId)) return false;
          const d = new Date(sess.date);
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        });

        const totalSessions = sessionsInMonth.length;
        const baseRate = coach.baseRate;
        const totalSalary = totalSessions * baseRate;

        return {
          coachId: coach.id,
          coachName: coach.name,
          coachPhone: coach.phone,
          branchName: this.branches.find((b) => b.id === coach.branchId)?.name || "Chưa gán",
          totalSessions,
          baseRate,
          totalSalary,
          month,
          year,
          classesCount: coachClasses.length,
          sessionsList: sessionsInMonth,
        };
      });
  }
}

// Global singleton instance
const globalStore = globalThis as unknown as { __kttllStore: InMemoryDataStore | undefined };

if (!globalStore.__kttllStore) {
  globalStore.__kttllStore = new InMemoryDataStore();
}

export const dataStore = globalStore.__kttllStore;
