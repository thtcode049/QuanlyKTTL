import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        title: true,
        branchId: true,
        baseRate: true,
        elo: true,
        experience: true,
        bio: true,
        bankAccount: true,
        bankName: true,
        accountHolder: true,
        hasAdminAccess: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách users:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách users: " + (error.message || error) },
      { status: 500 }
    );
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

    // Tìm người dùng theo ID hoặc Email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { email: id }],
      },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Người dùng không tồn tại hoặc đã được xóa trước đó",
      });
    }

    const actualId = user.id;

    // Tìm Admin mặc định để gán lại các lớp học nhằm tránh lỗi khóa ngoại Foreign Key
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

    // Xóa tasks và notifications liên quan
    await prisma.task.deleteMany({
      where: {
        OR: [{ assigneeId: actualId }, { creatorId: actualId }],
      },
    });

    await prisma.notification.deleteMany({
      where: { userId: actualId },
    });

    // Xóa người dùng khỏi database
    await prisma.user.delete({
      where: { id: actualId },
    });

    return NextResponse.json({
      success: true,
      message: `Đã xóa vĩnh viễn người dùng ${user.name}`,
    });
  } catch (error: any) {
    console.error("Lỗi khi xóa người dùng:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa người dùng: " + (error.message || error) },
      { status: 500 }
    );
  }
}
