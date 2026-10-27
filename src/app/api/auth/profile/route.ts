import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    if (!id && !email) {
      return NextResponse.json({ error: "Thiếu ID hoặc Email" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(id ? [{ id }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        systemRole: user.systemRole,
        title: user.title,
        experience: user.experience,
        bio: user.bio,
        bankAccount: user.bankAccount,
        bankName: user.bankName,
        accountHolder: user.accountHolder,
        elo: user.elo,
        hasAdminAccess: user.role === "ADMIN" || !!user.hasAdminAccess,
        branchId: user.branchId,
        branchIds: user.branchIds || [],
        managedBranchIds: user.managedBranchIds || [],
        tuitionRatePercent: user.tuitionRatePercent,
        bookRatePercent: user.bookRatePercent,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      email,
      name,
      phone,
      title,
      bio,
      experience,
      bankAccount,
      bankName,
      accountHolder,
      elo,
      hasAdminAccess,
      branchIds,
      managedBranchIds,
      branchId,
      adminSecretKey,
    } = body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(id ? [{ id }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    let grantAdmin = user.hasAdminAccess;
    if (hasAdminAccess !== undefined) {
      if (hasAdminAccess === true) {
        if (adminSecretKey) {
          if (adminSecretKey !== "admin123" && adminSecretKey !== "kttll2026") {
            return NextResponse.json(
              { error: "Mã bí mật xác nhận quyền Admin không chính xác!" },
              { status: 400 }
            );
          }
        }
        grantAdmin = true;
      } else {
        grantAdmin = false;
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(experience !== undefined ? { experience } : {}),
        ...(bankAccount !== undefined ? { bankAccount } : {}),
        ...(bankName !== undefined ? { bankName } : {}),
        ...(accountHolder !== undefined ? { accountHolder } : {}),
        ...(elo !== undefined ? { elo: Number(elo) } : {}),
        ...(hasAdminAccess !== undefined ? { hasAdminAccess: grantAdmin } : {}),
        ...(branchIds !== undefined ? { branchIds } : {}),
        ...(managedBranchIds !== undefined ? { managedBranchIds } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        systemRole: updated.systemRole,
        title: updated.title,
        experience: updated.experience,
        bio: updated.bio,
        bankAccount: updated.bankAccount,
        bankName: updated.bankName,
        accountHolder: updated.accountHolder,
        elo: updated.elo,
        hasAdminAccess: updated.role === "ADMIN" || !!updated.hasAdminAccess,
        branchId: updated.branchId,
        branchIds: updated.branchIds,
        managedBranchIds: updated.managedBranchIds,
        tuitionRatePercent: updated.tuitionRatePercent,
        bookRatePercent: updated.bookRatePercent,
      },
      message: "Cập nhật hồ sơ thành công!",
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật hồ sơ cá nhân:", error);
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
