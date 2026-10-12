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
