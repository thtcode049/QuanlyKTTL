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
  systemRole?: 'CHUNHIEM' | 'PHOCHUNHIEM' | 'CHUCOSO' | 'COACH'; // Phân quyền: Chủ nhiệm, Phó chủ nhiệm, Chủ từng cơ sở, HLV
  branchId?: string;
  baseRate: number; // 200.000đ/ca
  tuitionRatePercent?: number; // % học phí nhận được (mặc định 50%)
  bookRatePercent?: number; // % tiền sách nhận được (mặc định 30%)
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
  birthYear?: number;
  gender?: 'Nam' | 'Nữ';
  parentName?: string; // Đã loại bỏ khỏi UI/hệ thống, giữ optional để tương thích ngược
  parentPhone: string;
  currentLevel?: string; // Trình độ học viên đã loại bỏ (chỉ dùng trình độ lớp), giữ optional tương thích
  eloRating?: number; // Đã loại bỏ khỏi UI/hệ thống đánh giá
  notes?: string;
  classIds: string[];
  customFeePerSession?: number | null; // Đơn giá học phí riêng theo từng học viên (ưu đãi, học bổng hoặc kèm riêng)
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

export type TaskCategory = 'CHUYEN_MON' | 'GIAO_AN' | 'TUYEN_SINH' | 'SU_KIEN' | 'CO_SO' | 'KHAC';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED_PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface TaskData {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  kpiPoints: number; // 5 - 100
  dueDate: string; // YYYY-MM-DD
  branchId?: string;
  assigneeId: string; // ID HLV
  creatorId?: string; // ID Quản lý giao việc
  creatorName?: string;
  reportNote?: string; // Báo cáo kết quả của HLV
  reportAttachments?: string; // Link/chứng minh kết quả
  submittedAt?: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewFeedback?: string;
  isCompletedOnTime?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_SUBMITTED'
  | 'TASK_APPROVED'
  | 'TASK_REJECTED'
  | 'SYSTEM'
  | 'PAYROLL';

export interface NotificationData {
  id: string;
  userId: string; // ID người nhận, hoặc "ALL_ADMIN", "ALL_COACH"
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  taskId?: string;
  isRead: boolean;
  createdAt: string;
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
    id: "2054bdb5-6e30-4d7b-b6f5-b041ccc6cb77",
    name: "Ban Chủ Nhiệm CLB",
    email: "admin@kttll.vn",
    phone: "0904.555.666",
    role: "ADMIN",
    systemRole: "CHUNHIEM",
    baseRate: 0,
    tuitionRatePercent: 50,
    bookRatePercent: 30,
    title: "Chủ nhiệm CLB",
    hasAdminAccess: true,
  },
  {
    id: "user-coach-1",
    name: "GM Bùi Vinh",
    email: "hlv1@kttll.vn",
    phone: "0912.345.678",
    role: "COACH",
    systemRole: "PHOCHUNHIEM",
    branchId: "branch-1",
    baseRate: 250000,
    tuitionRatePercent: 55,
    bookRatePercent: 35,
    title: "Đại Kiện Tướng Quốc Tế",
    hasAdminAccess: true,
  },
  {
    id: "00477341-c15a-430a-8d1f-a64e39c03a9c",
    name: "HLV Trần Huyền Trang",
    email: "trantrang66c@gmail.com",
    phone: "0833.599.495",
    role: "COACH",
    systemRole: "CHUCOSO",
    branchId: "branch-3",
    baseRate: 200000,
    tuitionRatePercent: 50,
    bookRatePercent: 30,
    title: "HLV Quốc gia • Quản lý CS Hoàng Quốc Việt",
    hasAdminAccess: true,
  },
];

export const initialClasses: ClassroomData[] = [];

export const initialStudents: StudentData[] = [];

export const initialSessions: AttendanceSessionData[] = [];

export const initialEvaluations: StudentEvaluationData[] = [];

export const initialBankConfig: BankConfig = {
  bankId: "MB",
  bankAccount: "04092004369",
  bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
  accountHolder: "TRAN HUYEN TRANG",
  qrTemplate: "compact2",
};

export const initialZaloConfig: ZaloConfig = {
  titleTemplate: "[KTTLL] THÔNG BÁO HỌC PHÍ THÁNG {month}/{year}",
  bodyTemplate: "Kính gửi phụ huynh em {studentName}, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng {month}/{year} theo nguyên tắc Thực học - Thực trả.",
  footerNote: "Lưu ý: Quý phụ huynh vui lòng thanh toán đúng cú pháp để hệ thống đối soát tự động. Mọi thắc mắc xin liên hệ Hotline CLB: 0904.555.666.",
};

export const initialTasks: TaskData[] = [];

export const initialNotifications: NotificationData[] = [];

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
  public tasks: TaskData[] = [...initialTasks];
  public notifications: NotificationData[] = [...initialNotifications];
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
        tasks: this.tasks,
        notifications: this.notifications,
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
        data.students.filter((s: StudentData) => !s.id.startsWith("std-")).forEach((s: StudentData) => {
          const idx = this.students.findIndex((x) => x.id === s.id);
          if (idx >= 0) this.students[idx] = { ...this.students[idx], ...s };
          else this.students.push(s);
        });
      }
      if (data.classes && Array.isArray(data.classes)) {
        data.classes.filter((c: ClassroomData) => !c.id.startsWith("class-")).forEach((c: ClassroomData) => {
          const idx = this.classes.findIndex((x) => x.id === c.id);
          if (idx >= 0) this.classes[idx] = { ...this.classes[idx], ...c };
          else this.classes.push(c);
        });
      }
      if (data.tasks && Array.isArray(data.tasks)) {
        this.tasks = data.tasks;
      }
      if (data.notifications && Array.isArray(data.notifications)) {
        this.notifications = data.notifications;
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

  // Đồng bộ toàn diện dữ liệu trực tiếp từ Supabase PostgreSQL
  public async syncWithDatabase(): Promise<boolean> {
    try {
      if (typeof window === "undefined") return false;
      const res = await fetch("/api/sync");
      if (!res.ok) return false;
      const json = await res.json();
      if (json.success && json.data) {
        const { branches, users, classes, students, sessions } = json.data;
        if (Array.isArray(branches) && branches.length > 0) this.branches = branches;
        if (Array.isArray(users) && users.length > 0) this.users = users;
        if (Array.isArray(classes)) this.classes = classes;
        if (Array.isArray(students)) this.students = students;
        if (Array.isArray(sessions)) this.sessions = sessions;
        this.recalculateAllInvoices(10, 2026);
        this.saveToLocalStorage();
        return true;
      }
    } catch (err) {
      console.warn("Lỗi đồng bộ dữ liệu từ Supabase:", err);
    }
    return false;
  }

  // Thêm lớp học mới (đồng bộ Supabase DB)
  public async addClass(cls: ClassroomData) {
    const existingIdx = this.classes.findIndex((c) => c.id === cls.id);
    if (existingIdx >= 0) {
      this.classes[existingIdx] = cls;
    } else {
      this.classes.push(cls);
    }
    this.saveToLocalStorage();

    // Đồng bộ lên Supabase Database
    try {
      if (typeof window !== "undefined") {
        fetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cls),
        }).catch((e) => console.warn("Lỗi lưu lớp học lên DB:", e));
      }
    } catch (e) {}

    return cls;
  }

  // Cập nhật thông tin toàn diện của Lớp học (đồng bộ Supabase DB)
  public updateClass(classId: string, data: Partial<ClassroomData>) {
    const cls = this.classes.find((c) => c.id === classId);
    if (cls) {
      Object.assign(cls, data);
      if (data.feePerSession !== undefined) {
        this.recalculateAllInvoices(10, 2026);
      }
      this.saveToLocalStorage();

      // Đồng bộ lên Supabase Database
      try {
        if (typeof window !== "undefined") {
          fetch("/api/classes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: classId, ...data }),
          }).catch((e) => console.warn("Lỗi cập nhật lớp học lên DB:", e));
        }
      } catch (e) {}

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

  // Xóa lớp học (đồng bộ Supabase DB)
  public deleteClass(classId: string) {
    this.classes = this.classes.filter((c) => c.id !== classId);
    // Gỡ lớp khỏi danh sách học viên
    this.students.forEach((s) => {
      s.classIds = s.classIds.filter((cid) => cid !== classId);
    });
    this.recalculateAllInvoices(10, 2026);
    this.saveToLocalStorage();

    // Đồng bộ xóa trên Supabase Database
    try {
      if (typeof window !== "undefined") {
        fetch(`/api/classes?id=${classId}`, {
          method: "DELETE",
        }).catch((e) => console.warn("Lỗi xóa lớp học trên DB:", e));
      }
    } catch (e) {}

    return true;
  }

  // Xóa huấn luyện viên
  public deleteCoach(coachId: string) {
    this.users = this.users.filter((u) => u.id !== coachId);
    this.saveToLocalStorage();
    return true;
  }

  // Thêm học viên mới (đồng bộ Supabase DB)
  public addStudent(student: StudentData) {
    const existingIdx = this.students.findIndex((s) => s.id === student.id);
    if (existingIdx >= 0) {
      this.students[existingIdx] = student;
    } else {
      this.students.push(student);
    }
    this.recalculateAllInvoices(10, 2026);
    this.saveToLocalStorage();

    // Đồng bộ lên Supabase Database
    try {
      if (typeof window !== "undefined") {
        fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(student),
        }).catch((e) => console.warn("Lỗi lưu học sinh lên DB:", e));
      }
    } catch (e) {}

    return student;
  }

  // Thêm hàng loạt học viên từ Sheet / Excel (đồng bộ Supabase DB)
  public async addStudentsBatch(
    newStudents: StudentData[],
    defaultClassId?: string
  ): Promise<{ success: boolean; count: number }> {
    for (const student of newStudents) {
      const existingIdx = this.students.findIndex((s) => s.id === student.id);
      if (existingIdx >= 0) {
        this.students[existingIdx] = student;
      } else {
        this.students.push(student);
      }
    }
    this.recalculateAllInvoices(10, 2026);
    this.saveToLocalStorage();

    // Đồng bộ lên Supabase Database
    try {
      if (typeof window !== "undefined") {
        const res = await fetch("/api/students/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: newStudents, defaultClassId }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.created)) {
          data.created.forEach((createdStd: any) => {
            const localStd = this.students.find(
              (s) => s.parentPhone === createdStd.parentPhone && s.fullName === createdStd.fullName
            );
            if (localStd && localStd.id.startsWith("std-bulk-")) {
              localStd.id = createdStd.id;
            }
          });
          this.saveToLocalStorage();
        }
        return { success: true, count: data.count || newStudents.length };
      }
    } catch (e) {
      console.warn("Lỗi lưu hàng loạt học sinh lên DB:", e);
    }

    return { success: true, count: newStudents.length };
  }

  // Cập nhật thông tin học viên (đồng bộ Supabase DB)
  public updateStudent(studentId: string, data: Partial<StudentData>) {
    const student = this.students.find((s) => s.id === studentId);
    if (student) {
      Object.assign(student, data);
      if (data.customFeePerSession !== undefined) {
        this.recalculateAllInvoices(10, 2026);
      }
      this.saveToLocalStorage();

      // Đồng bộ lên Supabase Database
      try {
        if (typeof window !== "undefined") {
          fetch("/api/students", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: studentId, ...data }),
          }).catch((e) => console.warn("Lỗi cập nhật học sinh lên DB:", e));
        }
      } catch (e) {}

      return student;
    }
    return null;
  }

  // Xóa học viên (đồng bộ Supabase DB)
  public deleteStudent(studentId: string, classId?: string) {
    if (classId) {
      const s = this.students.find((st) => st.id === studentId);
      if (s) {
        s.classIds = s.classIds.filter((cid) => cid !== classId);
      }
    } else {
      this.students = this.students.filter((s) => s.id !== studentId);
    }
    this.recalculateAllInvoices(10, 2026);
    this.saveToLocalStorage();

    // Đồng bộ xóa trên Supabase Database
    try {
      if (typeof window !== "undefined") {
        const url = classId ? `/api/students?id=${studentId}&classId=${classId}` : `/api/students?id=${studentId}`;
        fetch(url, {
          method: "DELETE",
        }).catch((e) => console.warn("Lỗi xóa học sinh trên DB:", e));
      }
    } catch (e) {}

    return true;
  }

  // Tự động tính toán hóa đơn học phí cho tất cả học viên theo nguyên tắc THỰC HỌC - THỰC TRẢ
  public recalculateAllInvoices(month: number, year: number) {
    const newInvoices: MonthlyInvoiceData[] = [];

    for (const cls of this.classes) {
      // Lấy tất cả các buổi học của lớp trong tháng/năm đó
      const classSessions = this.sessions.filter((sess) => {
        if (sess.classId !== cls.id) return false;
        const d = new Date(sess.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });

      // Lấy học sinh chính thức của lớp
      const regularStudents = this.students.filter((s) => s.classIds.includes(cls.id));

      // Lấy thêm những học sinh học bù (có mặt trong records của buổi học nhưng không thuộc lớp chính thức)
      const makeupStudentIds = new Set<string>();
      classSessions.forEach((sess) => {
        sess.records.forEach((r) => {
          if (!regularStudents.some((s) => s.id === r.studentId)) {
            makeupStudentIds.add(r.studentId);
          }
        });
      });
      const makeupStudents = this.students.filter((s) => makeupStudentIds.has(s.id));
      const classStudents = [...regularStudents, ...makeupStudents];

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

        // Mức % học phí & % tiền sách tùy chỉnh theo từng HLV (mặc định 50% & 30%)
        const tuitionRate = coach.tuitionRatePercent !== undefined ? coach.tuitionRatePercent : 50;
        const bookRate = coach.bookRatePercent !== undefined ? coach.bookRatePercent : 30;

        const tuitionCommission = Math.round(totalTuition * (tuitionRate / 100));

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
        const bookCommission = Math.round(totalBookRevenue * (bookRate / 100));

        // Công thức: Thu nhập HLV = Tổng học phí * % học phí + Tiền sách * % tiền sách
        const totalSessions = sessionsInMonth.length;
        const totalIncome = tuitionCommission + bookCommission;

        return {
          coachId: coach.id,
          coachName: coach.name,
          coachPhone: coach.phone,
          branchName: this.branches.find((b) => b.id === coach.branchId)?.name || "Chưa gán",
          totalSessions,
          totalTuition,
          tuitionRatePercent: tuitionRate,
          tuitionCommission,
          totalBooksCount,
          totalBookRevenue,
          bookRatePercent: bookRate,
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

  // Cập nhật mức % học phí và % tiền sách cho Huấn luyện viên
  public updateCoachSalaryRates(coachId: string, tuitionRatePercent: number, bookRatePercent: number) {
    const canonical = resolveCanonicalCoachId(coachId);
    const coach = this.users.find(
      (u) => u.id === coachId || resolveCanonicalCoachId(u.id) === canonical || (u.email && resolveCanonicalCoachId(u.email) === canonical)
    );
    if (coach) {
      coach.tuitionRatePercent = Number(tuitionRatePercent);
      coach.bookRatePercent = Number(bookRatePercent);
      this.saveToLocalStorage();
      return coach;
    }
    return null;
  }

  // Cập nhật phân quyền người dùng: Chủ nhiệm, Phó chủ nhiệm, Chủ cơ sở, HLV
  public updateUserRole(
    userId: string,
    systemRole: 'CHUNHIEM' | 'PHOCHUNHIEM' | 'CHUCOSO' | 'COACH',
    branchId?: string,
    hasAdminAccess?: boolean
  ) {
    const canonical = resolveCanonicalCoachId(userId);
    const user = this.users.find(
      (u) => u.id === userId || resolveCanonicalCoachId(u.id) === canonical || (u.email && resolveCanonicalCoachId(u.email) === canonical)
    );
    if (user) {
      user.systemRole = systemRole;
      if (systemRole === 'CHUNHIEM' || systemRole === 'PHOCHUNHIEM') {
        user.hasAdminAccess = true;
        user.role = 'ADMIN';
        if (systemRole === 'CHUNHIEM') user.title = user.title || "Chủ nhiệm CLB";
        if (systemRole === 'PHOCHUNHIEM') user.title = user.title || "Phó chủ nhiệm CLB";
      } else if (systemRole === 'CHUCOSO') {
        user.hasAdminAccess = true;
        if (branchId) user.branchId = branchId;
        const br = this.branches.find((b) => b.id === user.branchId);
        user.title = `${user.title?.split('•')[0].trim() || 'HLV Quốc gia'} • Quản lý ${br ? br.name.split('–')[0].trim() : 'Cơ sở'}`;
      } else {
        user.role = 'COACH';
        user.hasAdminAccess = hasAdminAccess ?? false;
      }
      this.saveToLocalStorage();
      return user;
    }
    return null;
  }

  // Quản lý Nhiệm vụ (Task Assignment)
  public createTask(data: Omit<TaskData, 'id' | 'createdAt'>): TaskData {
    const id = `task-${Date.now()}`;
    const newTask: TaskData = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.tasks.unshift(newTask);

    // Tự động gửi thông báo cho HLV được giao
    this.createNotification({
      userId: data.assigneeId,
      title: "Nhiệm vụ mới được giao",
      message: `Ban Quản Lý vừa giao nhiệm vụ: "${data.title}". Hạn hoàn thành: ${data.dueDate}.`,
      type: "TASK_ASSIGNED",
      link: "/coach/tasks",
      taskId: id,
      isRead: false,
    });

    this.saveToLocalStorage();
    return newTask;
  }

  public updateTask(id: string, data: Partial<TaskData>): TaskData | null {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      Object.assign(task, data);
      task.updatedAt = new Date().toISOString();
      this.saveToLocalStorage();
      return task;
    }
    return null;
  }

  public submitTaskReport(taskId: string, reportNote: string, reportAttachments?: string): TaskData | null {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    task.status = 'COMPLETED_PENDING_REVIEW';
    task.reportNote = reportNote;
    task.reportAttachments = reportAttachments;
    task.submittedAt = new Date().toISOString();

    const due = new Date(task.dueDate + "T23:59:59");
    task.isCompletedOnTime = new Date() <= due;

    const coach = this.users.find(
      (u) => u.id === task.assigneeId || resolveCanonicalCoachId(u.id) === resolveCanonicalCoachId(task.assigneeId)
    );

    // Gửi thông báo đến Admin / Quản lý
    this.createNotification({
      userId: task.creatorId || "user-admin",
      title: "HLV đã nộp báo cáo hoàn thành",
      message: `HLV ${coach?.name || 'Huấn luyện viên'} đã gửi báo cáo kết quả cho nhiệm vụ: "${task.title}". Vui lòng duyệt kết quả & KPI.`,
      type: "TASK_SUBMITTED",
      link: "/admin/tasks",
      taskId: task.id,
      isRead: false,
    });

    this.saveToLocalStorage();
    return task;
  }

  public reviewTask(
    taskId: string,
    approved: boolean,
    feedback?: string,
    reviewerId?: string
  ): TaskData | null {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    task.reviewedAt = new Date().toISOString();
    task.reviewerId = reviewerId || "user-admin";
    task.reviewFeedback = feedback;

    if (approved) {
      task.status = 'APPROVED';
      this.createNotification({
        userId: task.assigneeId,
        title: `Nhiệm vụ đã được duyệt (+${task.kpiPoints} KPI)`,
        message: `Nhiệm vụ "${task.title}" của bạn đã được duyệt thành công! Bạn được cộng +${task.kpiPoints} điểm KPI.${feedback ? ` Nhận xét: "${feedback}"` : ''}`,
        type: "TASK_APPROVED",
        link: "/coach/tasks",
        taskId: task.id,
        isRead: false,
      });
    } else {
      task.status = 'REJECTED';
      this.createNotification({
        userId: task.assigneeId,
        title: "Yêu cầu chỉnh sửa / Bổ sung nhiệm vụ",
        message: `Nhiệm vụ "${task.title}" chưa đạt yêu cầu. Nhận xét của Quản lý: "${feedback || 'Cần bổ sung thêm thông tin'}". Vui lòng cập nhật lại.`,
        type: "TASK_REJECTED",
        link: "/coach/tasks",
        taskId: task.id,
        isRead: false,
      });
    }

    this.saveToLocalStorage();
    return task;
  }

  public deleteTask(taskId: string): boolean {
    const prevLen = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
    if (this.tasks.length !== prevLen) {
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  public getCoachTasks(coachId?: string, coachEmail?: string): TaskData[] {
    if (!coachId && !coachEmail) return [];
    const canonical = resolveCanonicalCoachId(coachId || coachEmail);
    return this.tasks.filter((t) => {
      if (coachId && t.assigneeId === coachId) return true;
      if (canonical && resolveCanonicalCoachId(t.assigneeId) === canonical) return true;
      return false;
    });
  }

  // Thống kê KPI Đội ngũ HLV
  public getKpiStats(branchId?: string) {
    const filteredTasks = this.tasks.filter((t) => {
      if (!branchId || branchId === 'ALL') return true;
      return t.branchId === branchId;
    });

    const coaches = this.users.filter((u) => u.role === 'COACH');

    const coachStats = coaches.map((coach) => {
      const canonical = resolveCanonicalCoachId(coach.id || coach.email);
      const coachTasks = filteredTasks.filter((t) => {
        return t.assigneeId === coach.id || resolveCanonicalCoachId(t.assigneeId) === canonical;
      });

      const totalTasks = coachTasks.length;
      const approvedTasks = coachTasks.filter((t) => t.status === 'APPROVED').length;
      const pendingReviewTasks = coachTasks.filter((t) => t.status === 'COMPLETED_PENDING_REVIEW').length;
      const inProgressTasks = coachTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'PENDING').length;
      const onTimeTasks = coachTasks.filter((t) => t.status === 'APPROVED' && t.isCompletedOnTime !== false).length;
      const kpiPoints = coachTasks
        .filter((t) => t.status === 'APPROVED')
        .reduce((sum, t) => sum + (t.kpiPoints || 0), 0);

      const completionRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;
      let rating = "Chưa có đánh giá";
      if (totalTasks > 0) {
        if (completionRate >= 90) rating = "Xuất sắc";
        else if (completionRate >= 75) rating = "Tốt";
        else if (completionRate >= 50) rating = "Khá";
        else rating = "Cần cải thiện";
      }

      return {
        coachId: coach.id,
        coachName: coach.name,
        coachPhone: coach.phone,
        title: coach.title || "HLV Quốc gia",
        branchName: this.branches.find((b) => b.id === coach.branchId)?.name || "Chưa gán",
        totalTasks,
        approvedTasks,
        pendingReviewTasks,
        inProgressTasks,
        onTimeTasks,
        kpiPoints,
        completionRate,
        rating,
        tasks: coachTasks,
      };
    });

    const totalAllTasks = filteredTasks.length;
    const totalApproved = filteredTasks.filter((t) => t.status === 'APPROVED').length;
    const totalPendingReview = filteredTasks.filter((t) => t.status === 'COMPLETED_PENDING_REVIEW').length;
    const totalInProgress = filteredTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'PENDING').length;
    const totalKpiPoints = filteredTasks
      .filter((t) => t.status === 'APPROVED')
      .reduce((sum, t) => sum + (t.kpiPoints || 0), 0);
    const avgRate = totalAllTasks > 0 ? Math.round((totalApproved / totalAllTasks) * 100) : 0;

    return {
      coachStats,
      overall: {
        totalTasks: totalAllTasks,
        approvedTasks: totalApproved,
        pendingReviewTasks: totalPendingReview,
        inProgressTasks: totalInProgress,
        totalKpiPoints,
        avgRate,
      },
    };
  }

  // Quản lý Thông báo (Notification Center)
  public createNotification(data: Omit<NotificationData, 'id' | 'createdAt'>): NotificationData {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newNotif: NotificationData = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    this.saveToLocalStorage();
    return newNotif;
  }

  public getUserNotifications(userId?: string): NotificationData[] {
    if (!userId) return this.notifications;
    const canonical = resolveCanonicalCoachId(userId);
    return this.notifications.filter((n) => {
      if (n.userId === userId) return true;
      if (canonical && resolveCanonicalCoachId(n.userId) === canonical) return true;
      if (n.userId === "ALL_ADMIN" && (userId === "user-admin" || canonical === "user-admin")) return true;
      if (n.userId === "ALL_COACH") return true;
      return false;
    });
  }

  public getUnreadNotificationCount(userId?: string): number {
    return this.getUserNotifications(userId).filter((n) => !n.isRead).length;
  }

  public markNotificationAsRead(id: string): boolean {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(userId?: string): void {
    const userNotifs = this.getUserNotifications(userId);
    userNotifs.forEach((n) => {
      n.isRead = true;
    });
    this.saveToLocalStorage();
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

  // Cập nhật mẫu tin nhắn Zalo gửi phụ huynh
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
 * Chuẩn hóa và map ID / Email / Name của HLV về UUID thực tế trong Supabase
 */
export function resolveCanonicalCoachId(coachIdOrEmail?: string): string {
  if (!coachIdOrEmail) return "";
  const str = String(coachIdOrEmail).toLowerCase().trim();

  // GM Bùi Vinh (HLV 1)
  if (
    str === "user-coach-1" ||
    str === "c5d28630-d676-4746-adf3-481504084b3a" ||
    str === "hlv1@kttll.vn"
  ) {
    return "c5d28630-d676-4746-adf3-481504084b3a";
  }

  // HLV Trần Huyền Trang (HLV 2)
  if (
    str === "user-coach-2" ||
    str === "102dedb3-2dbe-4f91-a9dd-80ff4e31caa0" ||
    str === "00477341-c15a-430a-8d1f-a64e39c03a9c" ||
    str === "fc5ecc9d-e553-4e36-bf88-82705d032da0" ||
    str === "hlv2@kttll.vn" ||
    str === "trantrang66c@gmail.com" ||
    str === "trantrang.cv.chess@gmail.com"
  ) {
    return "00477341-c15a-430a-8d1f-a64e39c03a9c";
  }

  // Ban Chủ Nhiệm (Admin)
  if (
    str === "user-admin" ||
    str === "2054bdb5-6e30-4d7b-b6f5-b041ccc6cb77" ||
    str === "admin@kttll.vn"
  ) {
    return "2054bdb5-6e30-4d7b-b6f5-b041ccc6cb77";
  }

  return coachIdOrEmail;
}

/**
 * Kiểm tra xem lớp học có thuộc về HLV này hay không (hỗ trợ cả UUID, email và danh sách user Supabase)
 */
export function isClassOwnedByCoach(cls: ClassroomData, coachId?: string, coachEmail?: string): boolean {
  if (!cls) return false;
  if (!coachId && !coachEmail) return false;

  // 1. Khớp trực tiếp ID (UUID của Supabase)
  if (coachId && cls.coachId === coachId) return true;

  // 2. Khớp trực tiếp Email
  if (coachEmail && (cls.coachId === coachEmail || (cls as any).coachEmail === coachEmail)) return true;

  // 3. Khớp qua danh sách người dùng trong hệ thống (Supabase users)
  if (dataStore && dataStore.users) {
    const coachUser = dataStore.users.find(
      (u) => (coachId && u.id === coachId) || (coachEmail && u.email?.toLowerCase() === coachEmail.toLowerCase())
    );
    if (coachUser) {
      if (cls.coachId === coachUser.id || cls.coachId === coachUser.email) return true;
    }
    const classCoach = dataStore.users.find(
      (u) => u.id === cls.coachId || (u.email && u.email.toLowerCase() === cls.coachId?.toLowerCase())
    );
    if (classCoach) {
      if (coachEmail && classCoach.email?.toLowerCase() === coachEmail.toLowerCase()) return true;
      if (coachId && classCoach.id === coachId) return true;
    }
  }

  // 4. Khớp fallback cho ID demo/lịch sử
  const classCanonical = resolveCanonicalCoachId(cls.coachId);
  const userCanonical = resolveCanonicalCoachId(coachId || coachEmail);
  if (classCanonical && userCanonical && classCanonical === userCanonical) return true;

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
