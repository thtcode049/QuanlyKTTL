import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get("coachId");

    const where: any = {};
    if (coachId) {
      where.coachId = coachId;
    }

    const classes = await prisma.classroom.findMany({
      where,
      include: {
        branch: true,
        coach: { select: { id: true, name: true, email: true, phone: true } },
        students: { select: { studentId: true } },
      },
      orderBy: { name: "asc" },
    });

    const data = classes.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      feePerSession: c.feePerSession,
      schedule: c.schedule,
      branchId: c.branchId,
      branchName: c.branch?.name,
      coachId: c.coachId,
      coachName: c.coach?.name,
      isActive: c.isActive,
      shareWithAdmin: c.shareWithAdmin,
      studentIds: c.students.map((cs) => cs.studentId),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Lỗi GET /api/classes:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, level, feePerSession, schedule, branchId, coachId, shareWithAdmin = true } = body;

    if (!name || !branchId || !coachId) {
      return NextResponse.json(
        { success: false, error: "Tên lớp, Cơ sở và Huấn luyện viên là bắt buộc" },
        { status: 400 }
      );
    }

    // Kiểm tra branchId có tồn tại trong DB không, nếu không lấy branch đầu tiên
    let validBranchId = branchId;
    const branchExists = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branchExists) {
      const firstBranch = await prisma.branch.findFirst();
      if (firstBranch) validBranchId = firstBranch.id;
    }

    // Kiểm tra coachId có tồn tại trong DB không
    let validCoachId = coachId;
    const coachExists = await prisma.user.findUnique({ where: { id: coachId } });
    if (!coachExists) {
      const firstCoach = await prisma.user.findFirst({ where: { role: "COACH" } });
      if (firstCoach) validCoachId = firstCoach.id;
    }

    const newClass = await prisma.classroom.create({
      data: {
        ...(id && !id.startsWith("class-") ? { id } : {}),
        name,
        level: level || "Nhập môn",
        feePerSession: parseFloat(feePerSession) || 150000,
        schedule: schedule || "Thứ 2 & Thứ 4 (18:00 - 19:30)",
        branchId: validBranchId,
        coachId: validCoachId,
        shareWithAdmin: shareWithAdmin !== false,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: newClass });
  } catch (error: any) {
    console.error("Lỗi POST /api/classes:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, level, feePerSession, schedule, branchId, coachId, shareWithAdmin, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID lớp học" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (level) updateData.level = level;
    if (feePerSession !== undefined) updateData.feePerSession = parseFloat(feePerSession);
    if (schedule) updateData.schedule = schedule;
    if (branchId) updateData.branchId = branchId;
    if (coachId) updateData.coachId = coachId;
    if (shareWithAdmin !== undefined) updateData.shareWithAdmin = shareWithAdmin;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.classroom.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Lỗi PUT /api/classes:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID lớp học cần xóa" }, { status: 400 });
    }

    // Xóa liên kết học sinh và điểm danh trước khi xóa lớp
    await prisma.classStudent.deleteMany({ where: { classId: id } });
    await prisma.monthlyInvoice.deleteMany({ where: { classId: id } });
    const sessions = await prisma.attendanceSession.findMany({ where: { classId: id }, select: { id: true } });
    const sessionIds = sessions.map((s) => s.id);
    await prisma.attendanceRecord.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.attendanceSession.deleteMany({ where: { classId: id } });

    await prisma.classroom.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Đã xóa lớp học thành công" });
  } catch (error: any) {
    console.error("Lỗi DELETE /api/classes:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
