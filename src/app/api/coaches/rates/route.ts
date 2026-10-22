import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { coachId, tuitionRatePercent, bookRatePercent, systemRole, branchId } = body;

    if (!coachId) {
      return NextResponse.json({ error: "Thiếu coachId" }, { status: 400 });
    }

    if (tuitionRatePercent !== undefined && bookRatePercent !== undefined) {
      dataStore.updateCoachSalaryRates(coachId, Number(tuitionRatePercent), Number(bookRatePercent));
    }

    if (systemRole) {
      dataStore.updateUserRole(coachId, systemRole, branchId);
    }

    try {
      await prisma.user.update({
        where: { id: coachId },
        data: {
          ...(tuitionRatePercent !== undefined ? { tuitionRatePercent: Number(tuitionRatePercent) } : {}),
          ...(bookRatePercent !== undefined ? { bookRatePercent: Number(bookRatePercent) } : {}),
          ...(systemRole ? { systemRole } : {}),
          ...(branchId ? { branchId } : {}),
        },
      });
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
