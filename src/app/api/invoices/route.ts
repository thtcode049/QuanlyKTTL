import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const month = Number(searchParams.get("month")) || 10;
  const year = Number(searchParams.get("year")) || 2026;

  dataStore.recalculateAllInvoices(month, year);

  let result = dataStore.invoices.filter((i) => i.month === month && i.year === year);
  if (classId) {
    result = result.filter((i) => i.classId === classId);
  }

  return NextResponse.json({
    success: true,
    data: result,
  });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId, classId, studentId, month, year, status } = body;

    // 1. Cập nhật trong in-memory dataStore
    let inv = dataStore.invoices.find((i) => i.id === invoiceId);
    if (!inv && classId && studentId && month && year) {
      inv = dataStore.invoices.find(
        (i) => i.classId === classId && i.studentId === studentId && i.month === Number(month) && i.year === Number(year)
      );
    }

    if (inv) {
      dataStore.updateInvoiceStatus(inv.id, status);
    } else if (invoiceId) {
      dataStore.updateInvoiceStatus(invoiceId, status);
    }

    // 2. Lưu bền vững vào CSDL PostgreSQL (Prisma)
    try {
      const cId = classId || inv?.classId;
      const sId = studentId || inv?.studentId;
      const m = Number(month || inv?.month || 10);
      const y = Number(year || inv?.year || 2026);

      if (cId && sId) {
        const [clsExists, stdExists] = await Promise.all([
          prisma.classroom.findUnique({ where: { id: cId } }),
          prisma.student.findUnique({ where: { id: sId } }),
        ]);

        if (clsExists && stdExists) {
          const existingDb = await prisma.monthlyInvoice.findFirst({
            where: {
              classId: cId,
              studentId: sId,
              month: m,
              year: y,
            },
          });

          if (existingDb) {
            await prisma.monthlyInvoice.update({
              where: { id: existingDb.id },
              data: {
                status: status as any,
                tuitionAmount: inv?.tuitionAmount ?? existingDb.tuitionAmount,
                surchargeAmount: inv?.surchargeAmount ?? existingDb.surchargeAmount,
                surchargesDetail: inv?.surcharges ? (inv.surcharges as any) : existingDb.surchargesDetail,
                totalAmount: inv?.totalAmount ?? existingDb.totalAmount,
              },
            });
          } else {
            const paddedMonth = m.toString().padStart(2, "0");
            const invoiceCode = `HP-${y}${paddedMonth}-${stdExists.code || sId.slice(0, 4)}`;
            await prisma.monthlyInvoice.create({
              data: {
                invoiceCode,
                classId: cId,
                studentId: sId,
                month: m,
                year: y,
                presentCount: inv?.presentCount || 0,
                feePerSession: inv?.feePerSession || clsExists.feePerSession,
                tuitionAmount: inv?.tuitionAmount || 0,
                surchargeAmount: inv?.surchargeAmount || 0,
                surchargesDetail: inv?.surcharges ? (inv.surcharges as any) : undefined,
                totalAmount: inv?.totalAmount || 0,
                status: status as any,
              },
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn("Lỗi lưu hóa đơn vào Prisma DB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      data: inv || { id: invoiceId, status },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
