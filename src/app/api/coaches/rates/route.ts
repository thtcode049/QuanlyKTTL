import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      coachId,
      tuitionRatePercent,
      bookRatePercent,
      systemRole,
      branchId,
      branchIds,
      managedBranchIds,
      hasAdminAccess,
      name,
      title,
      phone,
      email,
    } = body;

    if (!coachId) {
      return NextResponse.json({ error: "Thiếu coachId" }, { status: 400 });
    }

    if (tuitionRatePercent !== undefined && bookRatePercent !== undefined) {
      dataStore.updateCoachSalaryRates(coachId, Number(tuitionRatePercent), Number(bookRatePercent));
    }

    if (systemRole) {
      dataStore.updateUserRole(coachId, systemRole, branchId);
    }

    if (hasAdminAccess !== undefined) {
      dataStore.setCoachAdminAccess(coachId, Boolean(hasAdminAccess));
    }

    try {
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ id: coachId }, { email: coachId }],
        },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(tuitionRatePercent !== undefined ? { tuitionRatePercent: Number(tuitionRatePercent) } : {}),
            ...(bookRatePercent !== undefined ? { bookRatePercent: Number(bookRatePercent) } : {}),
            ...(systemRole ? { systemRole } : {}),
            ...(branchId !== undefined ? { branchId } : {}),
            ...(branchIds !== undefined ? { branchIds } : {}),
            ...(managedBranchIds !== undefined ? { managedBranchIds } : {}),
            ...(hasAdminAccess !== undefined ? { hasAdminAccess: Boolean(hasAdminAccess) } : {}),
            ...(name ? { name } : {}),
            ...(title ? { title } : {}),
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
          },
        });
      }
    } catch (e) {
      console.warn("Lỗi lưu coach rate vào DB:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
