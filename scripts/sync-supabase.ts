import prisma from "../src/lib/prisma";

async function main() {
  console.log("🚀 Bắt đầu đồng bộ dữ liệu vào Supabase PostgreSQL...");

  // 1. Cập nhật tên chuẩn cho các tài khoản nòng cốt
  await prisma.user.updateMany({
    where: { email: "hlv1@kttll.vn" },
    data: { name: "GM Bùi Vinh", title: "Đại Kiện Tướng Quốc Tế", hasAdminAccess: true },
  });
  await prisma.user.updateMany({
    where: { email: { in: ["hlv2@kttll.vn", "trantrang66c@gmail.com"] } },
    data: { name: "HLV Trần Huyền Trang", title: "HLV Quốc gia", hasAdminAccess: true },
  });
  await prisma.user.updateMany({
    where: { email: "admin@kttll.vn" },
    data: { name: "Ban Chủ Nhiệm CLB", title: "Chủ nhiệm CLB", hasAdminAccess: true },
  });

  const hlv1User = await prisma.user.findUnique({ where: { email: "hlv1@kttll.vn" } });
  const hlv2User = await prisma.user.findUnique({ where: { email: "trantrang66c@gmail.com" } }) 
    || await prisma.user.findUnique({ where: { email: "hlv2@kttll.vn" } });
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@kttll.vn" } });

  if (!hlv1User || !hlv2User || !adminUser) {
    throw new Error("Không tìm thấy các user nòng cốt trong DB");
  }

  // 2. Tạo hoặc cập nhật 8 Cơ sở chuẩn kientuongtuonglai.com
  const branchConfigs = [
    { id: "branch-1", name: "Cơ sở Bạch Mai", address: "Số 257 Bạch Mai, Phường Bạch Mai, TP Hà Nội", phone: "0968.543.141" },
    { id: "branch-2", name: "Cơ sở Thái Hà", address: "Số 111 ngõ 98 Thái Hà, Phường Trung Liệt, Quận Đống Đa, TP Hà Nội", phone: "0968.543.141" },
    { id: "branch-3", name: "Cơ sở Cầu Giấy", address: "Số 1 ngách 42, ngõ 106 Hoàng Quốc Việt, Quận Cầu Giấy, TP Hà Nội", phone: "0983.585.499" },
    { id: "branch-4", name: "Cơ sở Trương Định", address: "Tầng 2, Tòa CT2B, KĐT Nam Đô, 609 Trương Định, Hoàng Mai, Hà Nội", phone: "0916.611.258" },
    { id: "branch-5", name: "Cơ sở Láng Hạ", address: "Nhà 101B ngõ 111 Láng Hạ, Phường Láng Hạ, Quận Đống Đa, TP Hà Nội", phone: "0342.666.688" },
    { id: "branch-6", name: "Cơ sở Hà Đông", address: "Liền kề 07 Lô 4, KĐT Nam La Khê, 368B Quang Trung, Quận Hà Đông, TP Hà Nội", phone: "0968.543.141" },
    { id: "branch-7", name: "Cơ sở Gamuda Gardens", address: "Tầng 4, Số 10 đường 2.2, Gamuda Gardens, Phường Trần Phú, Hoàng Mai, Hà Nội", phone: "0869.310.200" },
    { id: "branch-8", name: "Cơ sở Nguyễn Tuân", address: "Liền kề 03-32 KĐT số 90 Nguyễn Tuân, Phường Thanh Xuân Trung, Thanh Xuân, Hà Nội", phone: "0968.543.141" },
  ];

  const branchIdMap: Record<string, string> = {};
  for (const b of branchConfigs) {
    const existing = await prisma.branch.findFirst({
      where: { OR: [{ id: b.id }, { name: { contains: b.name.slice(0, 8) } }] },
    });
    if (existing) {
      await prisma.branch.update({
        where: { id: existing.id },
        data: { name: b.name, address: b.address, phone: b.phone },
      });
      branchIdMap[b.id] = existing.id;
    } else {
      const created = await prisma.branch.create({
        data: { id: b.id, name: b.name, address: b.address, phone: b.phone },
      });
      branchIdMap[b.id] = created.id;
    }
  }
  console.log("✅ Đã đồng bộ 8 cơ sở:", Object.keys(branchIdMap).length);

  // 3. Tạo các Lớp học chuẩn
  const classConfigs = [
    { id: "class-1", name: "Cờ vua Nhập Môn - K01", level: "Nhập môn", feePerSession: 150000, schedule: "Thứ 3 & Thứ 6 (18:00 - 19:30)", branchKey: "branch-1", coachId: hlv1User.id, shareWithAdmin: true },
    { id: "class-2", name: "Cờ vua Nhập Môn - K02", level: "Nhập môn", feePerSession: 160000, schedule: "Thứ 2 & Thứ 5 (18:00 - 19:30)", branchKey: "branch-2", coachId: hlv1User.id, shareWithAdmin: true },
    { id: "class-3", name: "Cờ vua Nâng Cao - N01", level: "Nâng cao", feePerSession: 200000, schedule: "Thứ 7 & CN (08:30 - 10:00)", branchKey: "branch-3", coachId: hlv2User.id, shareWithAdmin: true },
    { id: "class-4", name: "Đội tuyển Kỳ Thủ Nhí - DT01", level: "Đội tuyển", feePerSession: 250000, schedule: "Thứ 7 & CN (15:00 - 17:00)", branchKey: "branch-4", coachId: hlv1User.id, shareWithAdmin: true },
    { id: "class-5", name: "Cờ vua Cơ Bản - B01", level: "Cơ bản", feePerSession: 160000, schedule: "Thứ 3 & Thứ 7 (18:00 - 19:30)", branchKey: "branch-5", coachId: hlv2User.id, shareWithAdmin: true },
    { id: "class-6", name: "Cờ vua Nâng Cao - N02", level: "Nâng cao", feePerSession: 200000, schedule: "Thứ 4 & CN (18:00 - 19:30)", branchKey: "branch-6", coachId: hlv1User.id, shareWithAdmin: true },
    { id: "class-7", name: "Cờ vua Cơ Bản - B02", level: "Cơ bản", feePerSession: 160000, schedule: "Thứ 2 & Thứ 6 (18:00 - 19:30)", branchKey: "branch-7", coachId: hlv2User.id, shareWithAdmin: false },
    { id: "class-8", name: "Cờ vua Nâng Cao - N03", level: "Nâng cao", feePerSession: 200000, schedule: "Thứ 5 & CN (09:00 - 10:30)", branchKey: "branch-8", coachId: hlv1User.id, shareWithAdmin: true },
  ];

  const classIdMap: Record<string, string> = {};
  for (const c of classConfigs) {
    const branchId = branchIdMap[c.branchKey];
    const existing = await prisma.classroom.findFirst({
      where: { OR: [{ id: c.id }, { name: c.name }] },
    });
    if (existing) {
      await prisma.classroom.update({
        where: { id: existing.id },
        data: {
          name: c.name,
          level: c.level,
          feePerSession: c.feePerSession,
          schedule: c.schedule,
          branchId,
          coachId: c.coachId,
          shareWithAdmin: c.shareWithAdmin,
          isActive: true,
        },
      });
      classIdMap[c.id] = existing.id;
    } else {
      const created = await prisma.classroom.create({
        data: {
          id: c.id,
          name: c.name,
          level: c.level,
          feePerSession: c.feePerSession,
          schedule: c.schedule,
          branchId,
          coachId: c.coachId,
          shareWithAdmin: c.shareWithAdmin,
          isActive: true,
        },
      });
      classIdMap[c.id] = created.id;
    }
  }
  console.log("✅ Đã đồng bộ 8 lớp học:", Object.keys(classIdMap).length);

  // 4. Đồng bộ 41 học viên
  const studentConfigs = [
    // Lớp 1 (K01) - 7 học viên
    { id: "std-1", code: "HS001", fullName: "Nguyễn Minh Khang", birthYear: 2018, parentName: "Nguyễn Hoàng Nam", parentPhone: "0912111222", currentLevel: "Nhập môn", notes: "Tiếp thu nhanh, đam mê cờ vua", classKey: "class-1" },
    { id: "std-2", code: "HS002", fullName: "Trần Bảo An", birthYear: 2019, parentName: "Lê Thị Thu", parentPhone: "0983222333", currentLevel: "Nhập môn", notes: "Chăm chú nghe giảng", classKey: "class-1" },
    { id: "std-3", code: "HS003", fullName: "Lê Hoàng Phúc", birthYear: 2018, parentName: "Lê Văn Hùng", parentPhone: "0904333444", currentLevel: "Nhập môn", notes: "Thích thi đấu giao hữu", classKey: "class-1" },
    { id: "std-4", code: "HS004", fullName: "Phạm Gia Huy", birthYear: 2017, parentName: "Phạm Quốc Tuấn", parentPhone: "0975444555", currentLevel: "Nhập môn", notes: "Chiến thuật tấn công tốt", classKey: "class-1" },
    { id: "std-5", code: "HS005", fullName: "Vũ Tuệ Lâm", birthYear: 2018, parentName: "Nguyễn Hương Giang", parentPhone: "0966555666", currentLevel: "Nhập môn", notes: "Tính toán nước cờ cẩn thận", classKey: "class-1" },
    { id: "std-6", code: "HS006", fullName: "Đặng Quang Minh", birthYear: 2019, parentName: "Đặng Đình Trọng", parentPhone: "0917666777", currentLevel: "Nhập môn", notes: "Thích giải cờ thế", classKey: "class-1" },
    { id: "std-7", code: "HS007", fullName: "Bùi Khánh An", birthYear: 2018, parentName: "Bùi Văn Long", parentPhone: "0988777888", currentLevel: "Nhập môn", notes: "Hòa đồng, ham học hỏi", classKey: "class-1" },

    // Lớp 2 (K02) - 6 học viên
    { id: "std-8", code: "HS008", fullName: "Hoàng Nhật Nam", birthYear: 2017, parentName: "Hoàng Văn Bách", parentPhone: "0909888999", currentLevel: "Nhập môn", notes: "Khả năng quan sát bàn cờ nhạy bén", classKey: "class-2" },
    { id: "std-9", code: "HS009", fullName: "Đỗ Thùy Chi", birthYear: 2018, parentName: "Đỗ Mạnh Cường", parentPhone: "0934999000", currentLevel: "Nhập môn", notes: "Rất kiên nhẫn khi đánh cờ", classKey: "class-2" },
    { id: "std-10", code: "HS010", fullName: "Ngô Đức Trí", birthYear: 2017, parentName: "Ngô Quang Huy", parentPhone: "0945000111", currentLevel: "Nhập môn", notes: "Tư duy không gian tốt", classKey: "class-2" },
    { id: "std-11", code: "HS011", fullName: "Dương Minh Châu", birthYear: 2018, parentName: "Dương Văn Hậu", parentPhone: "0976111222", currentLevel: "Nhập môn", notes: "Học bài tập về nhà rất chăm", classKey: "class-2" },
    { id: "std-12", code: "HS012", fullName: "Lý Gia Kiệt", birthYear: 2017, parentName: "Lý Quốc Bảo", parentPhone: "0987222333", currentLevel: "Nhập môn", notes: "Đánh cờ có phong cách rõ ràng", classKey: "class-2" },
    { id: "std-13", code: "HS013", fullName: "Mai Phương Linh", birthYear: 2019, parentName: "Mai Thanh Tùng", parentPhone: "0918333444", currentLevel: "Nhập môn", notes: "Học thuộc mặt quân nhanh", classKey: "class-2" },

    // Lớp 3 (N01) - 6 học viên (Lớp của HLV Huyền Trang)
    { id: "std-14", code: "HS014", fullName: "Trương Quốc An", birthYear: 2016, parentName: "Trương Văn Thái", parentPhone: "0969444555", currentLevel: "Nâng cao", notes: "Đã đạt giải Ba cờ nhanh cấp Quận", classKey: "class-3" },
    { id: "std-15", code: "HS015", fullName: "Phan Đình Khôi", birthYear: 2015, parentName: "Phan Văn Đức", parentPhone: "0904555666", currentLevel: "Nâng cao", notes: "Mục tiêu thi giải Vô địch Trẻ Quốc gia", classKey: "class-3" },
    { id: "std-16", code: "HS016", fullName: "Nguyễn Hà My", birthYear: 2016, parentName: "Nguyễn Tiến Đạt", parentPhone: "0985666777", currentLevel: "Nâng cao", notes: "Khai cuộc bài bản, tâm lý vững", classKey: "class-3" },
    { id: "std-17", code: "HS017", fullName: "Vũ Hải Đăng", birthYear: 2015, parentName: "Vũ Đình Trọng", parentPhone: "0916777888", currentLevel: "Nâng cao", notes: "Tàn cuộc xử lý rất khéo", classKey: "class-3" },
    { id: "std-18", code: "HS018", fullName: "Lê Cát Tường", birthYear: 2016, parentName: "Lê Minh Tuấn", parentPhone: "0977888999", currentLevel: "Nâng cao", notes: "Tấn công cánh Vua rất sắc sảo", classKey: "class-3" },
    { id: "std-19", code: "HS019", fullName: "Đinh Bảo Long", birthYear: 2015, parentName: "Đinh Văn Hiếu", parentPhone: "0938999000", currentLevel: "Nâng cao", notes: "Tập trung cao độ trong các ván đấu", classKey: "class-3" },

    // Lớp 4 (DT01) - 6 học viên
    { id: "std-20", code: "HS020", fullName: "Tạ Minh Quân", birthYear: 2014, parentName: "Tạ Quang Dũng", parentPhone: "0912345678", currentLevel: "Đội tuyển", notes: "Huy chương Vàng Hội khỏe Phù Đổng", classKey: "class-4" },
    { id: "std-21", code: "HS021", fullName: "Nguyễn Trọng Nghĩa", birthYear: 2013, parentName: "Nguyễn Trọng Hùng", parentPhone: "0987654321", currentLevel: "Đội tuyển", notes: "Thi đấu chuyên nghiệp, phong độ ổn định", classKey: "class-4" },
    { id: "std-22", code: "HS022", fullName: "Trần Đăng Khoa", birthYear: 2014, parentName: "Trần Văn Toàn", parentPhone: "0903112233", currentLevel: "Đội tuyển", notes: "Khả năng tính toán nước cờ sâu", classKey: "class-4" },
    { id: "std-23", code: "HS023", fullName: "Bùi Nguyên Khang", birthYear: 2013, parentName: "Bùi Đình Tuấn", parentPhone: "0968445566", currentLevel: "Đội tuyển", notes: "Lối đánh chủ động, sáng tạo", classKey: "class-4" },
    { id: "std-24", code: "HS024", fullName: "Lê Hoàng Yến", birthYear: 2014, parentName: "Lê Văn Hưng", parentPhone: "0915778899", currentLevel: "Đội tuyển", notes: "Hạng Nhì giải Trẻ Thành phố", classKey: "class-4" },
    { id: "std-25", code: "HS025", fullName: "Phạm Anh Dũng", birthYear: 2013, parentName: "Phạm Văn Sơn", parentPhone: "0979001122", currentLevel: "Đội tuyển", notes: "Kiên trì, nghiên cứu cờ nhiều giờ", classKey: "class-4" },

    // Lớp 5 (B01) - 4 học viên (Lớp của HLV Huyền Trang)
    { id: "std-26", code: "HS026", fullName: "Nguyễn Hải Phong", birthYear: 2017, parentName: "Nguyễn Văn Hùng", parentPhone: "0913223344", currentLevel: "Cơ bản", notes: "Chăm chỉ, tiến bộ nhanh", classKey: "class-5" },
    { id: "std-27", code: "HS027", fullName: "Trần Ngọc Mai", birthYear: 2018, parentName: "Trần Văn Bình", parentPhone: "0984334455", currentLevel: "Cơ bản", notes: "Nắm luật tốt", classKey: "class-5" },
    { id: "std-28", code: "HS028", fullName: "Lê Tuấn Hưng", birthYear: 2017, parentName: "Lê Văn Cường", parentPhone: "0905445566", currentLevel: "Cơ bản", notes: "Thích chơi cờ", classKey: "class-5" },
    { id: "std-29", code: "HS029", fullName: "Phạm Diệu Linh", birthYear: 2018, parentName: "Phạm Văn Dũng", parentPhone: "0967556677", currentLevel: "Cơ bản", notes: "Tập trung", classKey: "class-5" },

    // Lớp 6 (N02) - 4 học viên
    { id: "std-30", code: "HS030", fullName: "Bùi Tuấn Kiệt", birthYear: 2015, parentName: "Bùi Văn Thành", parentPhone: "0912889900", currentLevel: "Nâng cao", notes: "Đánh cờ chắc chắn", classKey: "class-6" },
    { id: "std-31", code: "HS031", fullName: "Đỗ Phương Thảo", birthYear: 2016, parentName: "Đỗ Minh Đức", parentPhone: "0983112244", currentLevel: "Nâng cao", notes: "Tập trung cao", classKey: "class-6" },
    { id: "std-32", code: "HS032", fullName: "Hoàng Gia Hưng", birthYear: 2015, parentName: "Hoàng Văn Nam", parentPhone: "0904223355", currentLevel: "Nâng cao", notes: "Lực cờ tốt", classKey: "class-6" },
    { id: "std-33", code: "HS033", fullName: "Phạm Ngọc Diệp", birthYear: 2016, parentName: "Phạm Quốc Toản", parentPhone: "0968334466", currentLevel: "Nâng cao", notes: "Chăm giải cờ thế", classKey: "class-6" },

    // Lớp 7 (B02) - 4 học viên (Lớp riêng của HLV Huyền Trang)
    { id: "std-34", code: "HS034", fullName: "Trịnh Minh Trí", birthYear: 2018, parentName: "Trịnh Văn Tuấn", parentPhone: "0916445577", currentLevel: "Cơ bản", notes: "Rất thích cờ vua", classKey: "class-7" },
    { id: "std-35", code: "HS035", fullName: "Ngô Thảo Vy", birthYear: 2019, parentName: "Ngô Văn Kiên", parentPhone: "0987556688", currentLevel: "Cơ bản", notes: "Học luật đi quân nhanh", classKey: "class-7" },
    { id: "std-36", code: "HS036", fullName: "Đặng Quốc Bảo", birthYear: 2018, parentName: "Đặng Văn Hùng", parentPhone: "0905667799", currentLevel: "Cơ bản", notes: "Tư duy tốt", classKey: "class-7" },
    { id: "std-37", code: "HS037", fullName: "Nguyễn Thùy Trang", birthYear: 2018, parentName: "Nguyễn Văn Thắng", parentPhone: "0978778800", currentLevel: "Cơ bản", notes: "Ngoan ngoãn", classKey: "class-7" },

    // Lớp 8 (N03) - 4 học viên
    { id: "std-38", code: "HS038", fullName: "Mai Đức Anh", birthYear: 2015, parentName: "Mai Văn Long", parentPhone: "0918889911", currentLevel: "Nâng cao", notes: "Chiến thuật tốt", classKey: "class-8" },
    { id: "std-39", code: "HS039", fullName: "Phan Khánh Linh", birthYear: 2016, parentName: "Phan Văn Hậu", parentPhone: "0989990022", currentLevel: "Nâng cao", notes: "Tàn cuộc hay", classKey: "class-8" },
    { id: "std-40", code: "HS040", fullName: "Lê Minh Hoàng", birthYear: 2015, parentName: "Lê Văn Sơn", parentPhone: "0906001133", currentLevel: "Nâng cao", notes: "Khai cuộc tốt", classKey: "class-8" },
    { id: "std-41", code: "HS041", fullName: "Vũ Bảo Trâm", birthYear: 2016, parentName: "Vũ Đình Chiến", parentPhone: "0977112244", currentLevel: "Nâng cao", notes: "Rất cố gắng", classKey: "class-8" },
  ];

  let studentSyncedCount = 0;
  for (const s of studentConfigs) {
    const classId = classIdMap[s.classKey];
    let student = await prisma.student.findFirst({
      where: { OR: [{ id: s.id }, { fullName: s.fullName, parentPhone: s.parentPhone }] },
    });
    if (!student) {
      student = await prisma.student.create({
        data: {
          id: s.id,
          code: s.code,
          fullName: s.fullName,
          birthYear: s.birthYear,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
          currentLevel: s.currentLevel,
          notes: s.notes,
          status: "ACTIVE",
        },
      });
    }

    if (classId) {
      const existingLink = await prisma.classStudent.findUnique({
        where: { classId_studentId: { classId, studentId: student.id } },
      });
      if (!existingLink) {
        await prisma.classStudent.create({
          data: { classId, studentId: student.id },
        });
      }
    }
    studentSyncedCount++;
  }
  console.log("✅ Đã đồng bộ học viên:", studentSyncedCount);

  console.log("🎉 Hoàn tất đồng bộ toàn diện Supabase PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
