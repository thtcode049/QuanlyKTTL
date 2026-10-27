import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const [branches, users, classes, students, sessions] = await Promise.all([
      prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          systemRole: true,
          title: true,
          branchId: true,
          branchIds: true,
          managedBranchIds: true,
          baseRate: true,
          tuitionRatePercent: true,
          bookRatePercent: true,
          hasAdminAccess: true,
          bankAccount: true,
          bankName: true,
          accountHolder: true,
          bio: true,
          experience: true,
          elo: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.classroom.findMany({
        include: {
          students: { select: { studentId: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.student.findMany({
        include: {
          classes: { select: { classId: true } },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.attendanceSession.findMany({
        include: {
          records: true,
        },
        orderBy: { date: "desc" },
      }),
    ]);

    const formattedClasses = classes.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      feePerSession: c.feePerSession,
      schedule: c.schedule,
      branchId: c.branchId,
      coachId: c.coachId,
      isActive: c.isActive,
      shareWithAdmin: c.shareWithAdmin,
      studentIds: c.students.map((cs) => cs.studentId),
    }));

    const formattedStudents = students.map((s) => ({
      id: s.id,
      code: s.code || `HS${String(s.birthYear).slice(-2)}`,
      fullName: s.fullName,
      birthYear: s.birthYear,
      gender: (s.gender as any) || "Nam",
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      currentLevel: s.currentLevel,
      notes: s.notes || "",
      classIds: s.classes.map((cs) => cs.classId),
      customFeePerSession: s.customFeePerSession || undefined,
      avatar: s.avatar || undefined,
      address: s.address || undefined,
      school: s.school || undefined,
      status: (s.status as any) || "ACTIVE",
    }));

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
      data: {
        branches,
        users,
        classes: formattedClasses,
        students: formattedStudents,
        sessions: formattedSessions,
      },
    });
  } catch (error: any) {
    console.error("Lỗi lấy dữ liệu đồng bộ từ Supabase:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi đồng bộ: " + (error.message || error) },
      { status: 500 }
    );
  }
}
