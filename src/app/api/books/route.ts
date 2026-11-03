import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { dataStore, resolveCanonicalCoachId } from "@/lib/data-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get("coachId") || undefined;
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

    // Lấy toàn bộ sách (cả sách HLV lấy ngoài + tự động từ điểm danh các lớp)
    const allBooks = dataStore.getAllBookDistributions(coachId, month, year);

    return NextResponse.json({
      success: true,
      data: allBooks,
    });
  } catch (error: any) {
    console.error("Lỗi GET /api/books:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { coachId, bookTitle, quantity, unitPrice, totalPrice, takenDate, classId, className, note } = body;

    if (!bookTitle) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập tên sách" }, { status: 400 });
    }

    const qty = Number(quantity) > 0 ? Number(quantity) : 1;
    const price = Number(unitPrice) >= 0 ? Number(unitPrice) : 60000;
    const total = totalPrice !== undefined ? Number(totalPrice) : qty * price;

    // Tìm coach tương ứng
    const coach = dataStore.users.find(
      (u) => u.id === coachId || resolveCanonicalCoachId(u.id) === resolveCanonicalCoachId(coachId)
    );

    // 1. Lưu vào dataStore
    const newDist = dataStore.addBookDistribution({
      coachId: coachId || coach?.id || "user-coach-1",
      coachName: coach?.name || "Huấn Luyện Viên",
      bookTitle,
      quantity: qty,
      unitPrice: price,
      totalPrice: total,
      takenDate: takenDate || undefined,
      classId: classId || undefined,
      className: className || undefined,
      note: note || undefined,
      source: "DIRECT_PURCHASE",
    });

    // 2. Thử lưu vào Prisma DB nếu có thể
    try {
      if (coach?.id) {
        await prisma.bookDistribution.create({
          data: {
            id: newDist.id,
            coachId: coach.id,
            bookTitle,
            quantity: qty,
            unitPrice: price,
            totalPrice: total,
            takenDate: takenDate ? new Date(takenDate) : null,
            classId: classId || null,
            className: className || null,
            note: note || null,
          },
        });
      }
    } catch (dbErr) {
      console.warn("Lỗi lưu BookDistribution vào DB:", dbErr);
    }

    return NextResponse.json({
      success: true,
      data: newDist,
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/books:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, bookTitle, quantity, unitPrice, totalPrice, takenDate, classId, className, note } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID bản ghi phân phối sách" }, { status: 400 });
    }

    const qty = quantity !== undefined ? Number(quantity) : undefined;
    const price = unitPrice !== undefined ? Number(unitPrice) : undefined;
    const total = totalPrice !== undefined ? Number(totalPrice) : (qty && price ? qty * price : undefined);

    const updated = dataStore.updateBookDistribution(id, {
      bookTitle,
      quantity: qty,
      unitPrice: price,
      totalPrice: total,
      takenDate,
      classId,
      className,
      note,
    });

    try {
      await prisma.bookDistribution.update({
        where: { id },
        data: {
          bookTitle: bookTitle || undefined,
          quantity: qty,
          unitPrice: price,
          totalPrice: total,
          takenDate: takenDate ? new Date(takenDate) : null,
          classId: classId || null,
          className: className || null,
          note: note || null,
        },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("Lỗi PUT /api/books:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID bản ghi phân phối sách" }, { status: 400 });
    }

    const ok = dataStore.deleteBookDistribution(id);

    try {
      await prisma.bookDistribution.delete({
        where: { id },
      });
    } catch (e) {}

    return NextResponse.json({
      success: ok,
      data: { id },
    });
  } catch (error: any) {
    console.error("Lỗi DELETE /api/books:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

