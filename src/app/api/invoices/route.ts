import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";

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
    const { invoiceId, status } = body;

    const inv = dataStore.invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      return NextResponse.json({ success: false, error: "Không tìm thấy hóa đơn" }, { status: 404 });
    }

    inv.status = status;
    return NextResponse.json({ success: true, data: inv });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
