import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { coachId, hasAdminAccess } = await request.json();

    if (!coachId) {
      return NextResponse.json({ error: "Thiếu coachId" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: coachId }, { email: coachId }],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        hasAdminAccess: Boolean(hasAdminAccess),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        hasAdminAccess: updated.hasAdminAccess,
      },
      message: updated.hasAdminAccess
        ? `Đã cấp quyền Admin cho ${updated.name}`
        : `Đã hạ quyền Admin của ${updated.name}`,
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật quyền Admin:", error);
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
