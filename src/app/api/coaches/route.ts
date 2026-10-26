import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const coaches = await prisma.user.findMany({
      where: { role: "COACH" },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, coaches });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id") || searchParams.get("coachId");

    if (!id) {
      try {
        const body = await request.json();
        id = body.id || body.coachId;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID người dùng cần xóa" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: id }],
      },
    });

    if (!user) {
      return NextResponse.json({ success: true, message: "Người dùng không tồn tại hoặc đã xóa" });
    }

    const actualId = user.id;

    // Gán lại lớp học sang admin
    const fallbackAdmin = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
        id: { not: actualId },
      },
    });

    if (fallbackAdmin) {
      await prisma.classroom.updateMany({
        where: { coachId: actualId },
        data: { coachId: fallbackAdmin.id },
      });
    }

    await prisma.task.deleteMany({
      where: {
        OR: [{ assigneeId: actualId }, { creatorId: actualId }],
      },
    });

    await prisma.notification.deleteMany({
      where: { userId: actualId },
    });

    await prisma.user.delete({
      where: { id: actualId },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa HLV ${user.name}`,
    });
  } catch (error: any) {
    console.error("Lỗi khi xóa HLV:", error);
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
