import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { dataStore } from "@/lib/data-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    const where: any = {};
    if (classId) {
      where.classId = classId;
    }

    const sessions = await prisma.attendanceSession.findMany({
      where,
      include: {
        records: true,
      },
      orderBy: { date: "desc" },
    });

    const formattedSessions = sessions.map((sess) => ({
      id: sess.id,
      classId: sess.classId,
      date: typeof sess.date === "string" ? sess.date : sess.date.toISOString().split("T")[0],
      topic: sess.topic || "Buổi học cờ vua",
      records: sess.records.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        studentId: r.studentId,
        status: r.status as "PRESENT" | "ABSENT",
        coachNote: r.coachNote || "",
        bookTitle: r.bookTitle || undefined,
        bookPrice: r.bookPrice || undefined,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formattedSessions,
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/attendance:", error);
    // Fallback to dataStore in case of network issue
    return NextResponse.json({
      success: true,
      data: dataStore.sessions,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, date, topic, records } = body;

    if (!classId || !date) {
      return NextResponse.json(
        { success: false, error: "Thiếu classId hoặc ngày điểm danh" },
        { status: 400 }
      );
    }

    const sessionDate = new Date(date);
    const startOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 23, 59, 59);

    // 1. Kiểm tra lớp học trong Supabase DB
    const classExists = await prisma.classroom.findUnique({
      where: { id: classId },
    });

    let dbSessionId = `sess-${classId}-${date}`;

    if (classExists) {
      // Tìm buổi học đã tồn tại trong ngày này của lớp
      const existingSession = await prisma.attendanceSession.findFirst({
        where: {
          classId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (existingSession) {
        dbSessionId = existingSession.id;
        // Cập nhật chủ đề
        await prisma.attendanceSession.update({
          where: { id: existingSession.id },
          data: { topic: topic || "Buổi học cờ vua" },
        });

        // Xóa các bản ghi điểm danh cũ của buổi này
        await prisma.attendanceRecord.deleteMany({
          where: { sessionId: existingSession.id },
        });
      } else {
        // Tạo buổi điểm danh mới
        const createdSession = await prisma.attendanceSession.create({
          data: {
            classId,
            date: sessionDate,
            topic: topic || "Buổi học cờ vua",
          },
        });
        dbSessionId = createdSession.id;
      }

      // Thêm các bản ghi điểm danh cho học viên
      if (Array.isArray(records) && records.length > 0) {
        for (const r of records) {
          // Xác thực studentId có trong DB không
          const studentExists = await prisma.student.findUnique({
            where: { id: r.studentId },
          });

          if (studentExists) {
            await prisma.attendanceRecord.create({
              data: {
                sessionId: dbSessionId,
                studentId: r.studentId,
                status: r.status === "ABSENT" ? "ABSENT" : "PRESENT",
                coachNote: r.coachNote || null,
                bookTitle: r.bookTitle || null,
                bookPrice: r.bookPrice ? parseFloat(r.bookPrice) : null,
              },
            });
          }
        }
      }
    }

    // 2. Cập nhật đồng thời vào dataStore để hiển thị tức thì
    const formattedRecords = (records || []).map((r: any) => ({
      id: r.id || `rec-${classId}-${date}-${r.studentId}`,
      sessionId: dbSessionId,
      studentId: r.studentId,
      status: r.status as "PRESENT" | "ABSENT",
      coachNote: r.coachNote || "",
      bookTitle: r.bookTitle || undefined,
      bookPrice: r.bookPrice || undefined,
    }));

    const newSession = {
      id: dbSessionId,
      classId,
      date: typeof date === "string" ? date : sessionDate.toISOString().split("T")[0],
      topic: topic || "Buổi học cờ vua",
      records: formattedRecords,
    };

    const existingIndex = dataStore.sessions.findIndex(
      (s) => s.classId === classId && (s.date === date || s.id === dbSessionId)
    );

    if (existingIndex >= 0) {
      dataStore.sessions[existingIndex] = newSession;
    } else {
      dataStore.sessions.push(newSession);
    }

    dataStore.recalculateAllInvoices(sessionDate.getMonth() + 1, sessionDate.getFullYear());
    dataStore.saveToLocalStorage();

    return NextResponse.json({
      success: true,
      data: newSession,
    });
  } catch (e: any) {
    console.error("Lỗi POST /api/attendance:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
