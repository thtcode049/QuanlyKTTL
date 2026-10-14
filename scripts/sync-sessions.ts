import prisma from "../src/lib/prisma";
import { initialSessions } from "../src/lib/data-store";

async function main() {
  console.log("🚀 Đồng bộ các buổi điểm danh mẫu vào Supabase...");

  for (const s of initialSessions) {
    // Tìm lớp học trong DB
    const cls = await prisma.classroom.findFirst({
      where: { OR: [{ id: s.classId }, { name: { contains: s.classId } }] },
    });

    if (!cls) continue;

    const sessionDate = new Date(s.date);
    const startOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 23, 59, 59);

    let session = await prisma.attendanceSession.findFirst({
      where: {
        classId: cls.id,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          classId: cls.id,
          date: sessionDate,
          topic: s.topic,
        },
      });
    }

    // Đồng bộ records
    for (const r of s.records) {
      // Tìm học viên trong DB
      const student = await prisma.student.findFirst({
        where: { id: r.studentId },
      });

      if (!student) continue;

      const existingRecord = await prisma.attendanceRecord.findFirst({
        where: {
          sessionId: session.id,
          studentId: student.id,
        },
      });

      if (!existingRecord) {
        await prisma.attendanceRecord.create({
          data: {
            sessionId: session.id,
            studentId: student.id,
            status: r.status === "ABSENT" ? "ABSENT" : "PRESENT",
            coachNote: r.coachNote || null,
            bookTitle: r.bookTitle || null,
            bookPrice: r.bookPrice || null,
          },
        });
      }
    }
  }

  const sessionCount = await prisma.attendanceSession.count();
  const recordCount = await prisma.attendanceRecord.count();
  console.log(`✅ Hoàn thành: Có ${sessionCount} buổi học và ${recordCount} bản ghi điểm danh trong Supabase!`);
}

main()
  .catch((e) => {
    console.error("Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
