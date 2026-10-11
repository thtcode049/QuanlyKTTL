import { PrismaClient, Role, AttendanceStatus, InvoiceStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu seed dữ liệu cho CLB Cờ vua Kiện Tướng Tương Lai...");

  // 1. Xóa dữ liệu cũ (nếu có)
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.monthlyInvoice.deleteMany();
  await prisma.studentEvaluation.deleteMany();
  await prisma.classStudent.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  // 2. Tạo 4 Cơ sở Hà Nội
  const b1 = await prisma.branch.create({
    data: {
      name: "Cơ sở 1 - Bạch Mai",
      address: "187 Bạch Mai, Q. Hai Bà Trưng, Hà Nội",
      phone: "0988.123.456",
    },
  });

  const b2 = await prisma.branch.create({
    data: {
      name: "Cơ sở 2 - Thái Hà",
      address: "45 Thái Hà, Q. Đống Đa, Hà Nội",
      phone: "0988.654.321",
    },
  });

  const b3 = await prisma.branch.create({
    data: {
      name: "Cơ sở 3 - Hoàng Quốc Việt",
      address: "120 Hoàng Quốc Việt, Q. Cầu Giấy, Hà Nội",
      phone: "0977.888.999",
    },
  });

  const b4 = await prisma.branch.create({
    data: {
      name: "Cơ sở 4 - Trương Định",
      address: "254 Trương Định, Q. Hoàng Mai, Hà Nội",
      phone: "0966.555.444",
    },
  });

  console.log("✅ Đã tạo 4 cơ sở Hà Nội.");

  // 3. Tạo tài khoản Admin và HLV
  const admin = await prisma.user.create({
    data: {
      name: "Ban Chủ Nhiệm CLB",
      email: "admin@kttll.vn",
      phone: "0904.555.666",
      passwordHash: "admin123", // Cho demo/test
      role: Role.ADMIN,
      baseRate: 0,
    },
  });

  const hlv1 = await prisma.user.create({
    data: {
      name: "GM Bùi Vinh",
      email: "hlv1@kttll.vn",
      phone: "0912.345.678",
      passwordHash: "coach123",
      role: Role.COACH,
      branchId: b1.id,
      baseRate: 250000,
    },
  });

  const hlv2 = await prisma.user.create({
    data: {
      name: "HLV Trần Huyền Trang",
      email: "hlv2@kttll.vn",
      phone: "0983.112.233",
      passwordHash: "coach123",
      role: Role.COACH,
      branchId: b3.id,
      baseRate: 200000,
    },
  });

  console.log("✅ Đã tạo Admin và 2 Huấn luyện viên.");

  // 4. Tạo 4 Lớp học
  const c1 = await prisma.classroom.create({
    data: {
      name: "Cờ vua Vỡ Lòng - K01",
      level: "Vỡ lòng",
      feePerSession: 150000,
      schedule: "Thứ 3 & Thứ 6 (18:00 - 19:30)",
      branchId: b1.id,
      coachId: hlv1.id,
    },
  });

  const c2 = await prisma.classroom.create({
    data: {
      name: "Cờ vua Nhập Môn - K02",
      level: "Nhập môn",
      feePerSession: 160000,
      schedule: "Thứ 2 & Thứ 5 (18:00 - 19:30)",
      branchId: b2.id,
      coachId: hlv1.id,
    },
  });

  const c3 = await prisma.classroom.create({
    data: {
      name: "Cờ vua Nâng Cao - N01",
      level: "Nâng cao",
      feePerSession: 200000,
      schedule: "Thứ 7 & CN (08:30 - 10:00)",
      branchId: b3.id,
      coachId: hlv2.id,
    },
  });

  const c4 = await prisma.classroom.create({
    data: {
      name: "Đội tuyển Kỳ Thủ Nhí - DT01",
      level: "Đội tuyển",
      feePerSession: 250000,
      schedule: "Thứ 7 & CN (15:00 - 17:00)",
      branchId: b4.id,
      coachId: hlv1.id,
    },
  });

  console.log("✅ Đã tạo 4 lớp học các cấp độ.");

  // 5. Tạo 25 Học viên
  const studentData = [
    { fullName: "Nguyễn Minh Khang", birthYear: 2018, parentName: "Nguyễn Hoàng Nam", parentPhone: "0912111222", currentLevel: "Vỡ lòng", eloRating: 1020, classId: c1.id },
    { fullName: "Trần Bảo An", birthYear: 2019, parentName: "Lê Thị Thu", parentPhone: "0983222333", currentLevel: "Vỡ lòng", eloRating: 980, classId: c1.id },
    { fullName: "Lê Hoàng Phúc", birthYear: 2018, parentName: "Lê Văn Hùng", parentPhone: "0904333444", currentLevel: "Vỡ lòng", eloRating: 1050, classId: c1.id },
    { fullName: "Phạm Gia Huy", birthYear: 2017, parentName: "Phạm Quốc Tuấn", parentPhone: "0975444555", currentLevel: "Vỡ lòng", eloRating: 1010, classId: c1.id },
    { fullName: "Vũ Tuệ Lâm", birthYear: 2018, parentName: "Nguyễn Hương Giang", parentPhone: "0966555666", currentLevel: "Vỡ lòng", eloRating: 1040, classId: c1.id },
    { fullName: "Đỗ Đăng Khoa", birthYear: 2019, parentName: "Đỗ Xuân Bách", parentPhone: "0918666777", currentLevel: "Vỡ lòng", eloRating: 990, classId: c1.id },
    { fullName: "Bùi Ngọc Hân", birthYear: 2018, parentName: "Bùi Đình Trọng", parentPhone: "0949777888", currentLevel: "Vỡ lòng", eloRating: 1030, classId: c1.id },

    { fullName: "Hoàng Đức Anh", birthYear: 2017, parentName: "Hoàng Văn Tuấn", parentPhone: "0982888999", currentLevel: "Nhập môn", eloRating: 1120, classId: c2.id },
    { fullName: "Đặng Quỳnh Chi", birthYear: 2017, parentName: "Trần Mai Phương", parentPhone: "0933999000", currentLevel: "Nhập môn", eloRating: 1100, classId: c2.id },
    { fullName: "Ngô Nhật Minh", birthYear: 2016, parentName: "Ngô Quang Huy", parentPhone: "0915123456", currentLevel: "Nhập môn", eloRating: 1150, classId: c2.id },
    { fullName: "Lý Khánh An", birthYear: 2017, parentName: "Lý Văn Toàn", parentPhone: "0978234567", currentLevel: "Nhập môn", eloRating: 1080, classId: c2.id },
    { fullName: "Trương Hải Đăng", birthYear: 2016, parentName: "Trương Quốc Đạt", parentPhone: "0909345678", currentLevel: "Nhập môn", eloRating: 1140, classId: c2.id },
    { fullName: "Phan Thảo My", birthYear: 2018, parentName: "Phan Văn Quân", parentPhone: "0967456789", currentLevel: "Nhập môn", eloRating: 1090, classId: c2.id },

    { fullName: "Vũ Gia Bảo", birthYear: 2015, parentName: "Vũ Đình Khiêm", parentPhone: "0981567890", currentLevel: "Nâng cao", eloRating: 1280, classId: c3.id },
    { fullName: "Lê Minh Triết", birthYear: 2015, parentName: "Lê Hải Bình", parentPhone: "0913678901", currentLevel: "Nâng cao", eloRating: 1310, classId: c3.id },
    { fullName: "Nguyễn Phương Linh", birthYear: 2016, parentName: "Nguyễn Thanh Tùng", parentPhone: "0934789012", currentLevel: "Nâng cao", eloRating: 1250, classId: c3.id },
    { fullName: "Phạm Quang Dũng", birthYear: 2015, parentName: "Phạm Quốc Hùng", parentPhone: "0972890123", currentLevel: "Nâng cao", eloRating: 1290, classId: c3.id },
    { fullName: "Đinh Thái Sơn", birthYear: 2014, parentName: "Đinh Văn Long", parentPhone: "0903901234", currentLevel: "Nâng cao", eloRating: 1330, classId: c3.id },
    { fullName: "Trần Mai Anh", birthYear: 2016, parentName: "Trần Đình Khang", parentPhone: "0968012345", currentLevel: "Nâng cao", eloRating: 1270, classId: c3.id },

    { fullName: "Bùi Quốc Anh", birthYear: 2014, parentName: "Bùi Thế Huynh", parentPhone: "0919123888", currentLevel: "Đội tuyển", eloRating: 1460, classId: c4.id },
    { fullName: "Nguyễn Khánh Nam", birthYear: 2013, parentName: "Nguyễn Minh Đức", parentPhone: "0985234999", currentLevel: "Đội tuyển", eloRating: 1420, classId: c4.id },
    { fullName: "Lê Tuấn Kiệt", birthYear: 2014, parentName: "Lê Văn Hùng", parentPhone: "0936345000", currentLevel: "Đội tuyển", eloRating: 1390, classId: c4.id },
    { fullName: "Hoàng Thảo Nguyên", birthYear: 2015, parentName: "Hoàng Minh Tâm", parentPhone: "0974456111", currentLevel: "Đội tuyển", eloRating: 1410, classId: c4.id },
    { fullName: "Trần Đức Minh", birthYear: 2013, parentName: "Trần Văn Toàn", parentPhone: "0907567222", currentLevel: "Đội tuyển", eloRating: 1480, classId: c4.id },
    { fullName: "Võ Minh Khôi", birthYear: 2014, parentName: "Võ Đình Trọng", parentPhone: "0962678333", currentLevel: "Đội tuyển", eloRating: 1430, classId: c4.id },
  ];

  const createdStudents = [];
  for (const s of studentData) {
    const student = await prisma.student.create({
      data: {
        fullName: s.fullName,
        birthYear: s.birthYear,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        currentLevel: s.currentLevel,
        eloRating: s.eloRating,
        notes: `Học viên xuất sắc của lớp ${s.currentLevel}`,
      },
    });

    await prisma.classStudent.create({
      data: {
        classId: s.classId,
        studentId: student.id,
      },
    });

    createdStudents.push({ ...student, classId: s.classId });
  }

  console.log(`✅ Đã tạo ${createdStudents.length} học sinh và ghi danh vào các lớp.`);

  // 6. Tạo buổi điểm danh mẫu cho lớp 1
  const s1 = await prisma.attendanceSession.create({
    data: {
      classId: c1.id,
      date: new Date("2026-10-02T18:00:00Z"),
      topic: "Ôn tập luật đi quân và Quy tắc Nhập thành an toàn",
    },
  });

  const c1Students = createdStudents.filter((s) => s.classId === c1.id);
  for (let i = 0; i < c1Students.length; i++) {
    const std = c1Students[i];
    await prisma.attendanceRecord.create({
      data: {
        sessionId: s1.id,
        studentId: std.id,
        status: i === 3 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
        coachNote: i === 3 ? "Nghỉ có phép" : "Tiếp thu tốt",
      },
    });
  }

  console.log("✅ Đã tạo buổi điểm danh mẫu kèm dữ liệu điểm danh thực tế.");
  console.log("🚀 Hoàn thành seed dữ liệu thành công!");
}

main()
  .catch((e) => {
    console.error("Lỗi khi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
