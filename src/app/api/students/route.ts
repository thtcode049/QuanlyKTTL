import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    const where: any = {};
    if (classId) {
      where.classes = { some: { classId } };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        classes: { select: { classId: true } },
      },
      orderBy: { fullName: "asc" },
    });

    const data = students.map((s) => ({
      id: s.id,
      code: s.code || (s.birthYear ? `HS${String(s.birthYear).slice(-2)}` : "HS00"),
      fullName: s.fullName,
      birthYear: s.birthYear ?? undefined,
      gender: s.gender || "",
      parentName: s.parentName || "",
      parentPhone: s.parentPhone,
      currentLevel: s.currentLevel,
      notes: s.notes || "",
      classIds: s.classes.map((cs) => cs.classId),
      customFeePerSession: s.customFeePerSession || undefined,
      avatar: s.avatar || undefined,
      address: s.address || undefined,
      school: s.school || undefined,
      status: s.status || "ACTIVE",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Lỗi GET /api/students:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      code,
      fullName,
      birthYear,
      parentName,
      parentPhone,
      currentLevel = "Nhập môn",
      notes,
      classIds = [],
      gender,
      avatar,
      address,
      school,
      customFeePerSession,
    } = body;

    const trimmedName = String(fullName || "").trim();
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: "Họ và tên học viên là bắt buộc" },
        { status: 400 }
      );
    }

    const cleanPhone = String(parentPhone || "").trim();
    const parsedBirthYear = birthYear ? parseInt(String(birthYear)) : null;
    const computedCode = code
      ? String(code).trim()
      : (parsedBirthYear ? `HS${String(parsedBirthYear).slice(-2)}` : "HS00");

    const newStudent = await prisma.student.create({
      data: {
        ...(id && !id.startsWith("std-") ? { id } : {}),
        code: computedCode,
        fullName: trimmedName,
        birthYear: parsedBirthYear,
        parentName: parentName ? String(parentName).trim() : "",
        parentPhone: cleanPhone,
        currentLevel: currentLevel || "Nhập môn",
        notes: notes ? String(notes).trim() : "",
        gender: gender ? String(gender).trim() : null,
        avatar: avatar || null,
        address: address ? String(address).trim() : null,
        school: school ? String(school).trim() : null,
        customFeePerSession: customFeePerSession !== undefined && customFeePerSession !== null && customFeePerSession !== ""
          ? parseFloat(String(customFeePerSession))
          : null,
        status: "ACTIVE",
      },
    });

    // Tạo liên kết với các lớp học
    const linkedClassIds: string[] = [];
    if (Array.isArray(classIds) && classIds.length > 0) {
      for (const cid of classIds) {
        if (!cid) continue;
        const classExists = await prisma.classroom.findUnique({ where: { id: cid } });
        if (classExists) {
          await prisma.classStudent.create({
            data: {
              classId: cid,
              studentId: newStudent.id,
            },
          });
          linkedClassIds.push(cid);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newStudent.id,
        code: newStudent.code,
        fullName: newStudent.fullName,
        birthYear: newStudent.birthYear ?? undefined,
        gender: newStudent.gender || "",
        parentName: newStudent.parentName || "",
        parentPhone: newStudent.parentPhone || "",
        currentLevel: newStudent.currentLevel || "Nhập môn",
        notes: newStudent.notes || "",
        classIds: linkedClassIds,
        customFeePerSession: newStudent.customFeePerSession ?? undefined,
        avatar: newStudent.avatar ?? undefined,
        address: newStudent.address ?? undefined,
        school: newStudent.school ?? undefined,
        status: newStudent.status || "ACTIVE",
      },
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/students:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      code,
      fullName,
      birthYear,
      parentName,
      parentPhone,
      currentLevel,
      notes,
      classIds,
      gender,
      avatar,
      address,
      school,
      customFeePerSession,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID học sinh" }, { status: 400 });
    }

    // Kiểm tra học sinh có trong CSDL không
    let targetStudent = await prisma.student.findUnique({ where: { id } });

    // Fallback: nếu id dạng std-... chưa có trong DB, thử tìm theo fullName và parentPhone
    if (!targetStudent && fullName) {
      targetStudent = await prisma.student.findFirst({
        where: {
          fullName: String(fullName).trim(),
          ...(parentPhone ? { parentPhone: String(parentPhone).trim() } : {}),
        },
      });
    }

    if (!targetStudent) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh với ID này trong CSDL" }, { status: 404 });
    }

    const realId = targetStudent.id;
    const updateData: any = {};
    if (code !== undefined) updateData.code = code ? String(code).trim() : null;
    if (fullName !== undefined) updateData.fullName = String(fullName).trim();
    if (birthYear !== undefined) updateData.birthYear = birthYear ? parseInt(String(birthYear)) : null;
    if (parentName !== undefined) updateData.parentName = String(parentName).trim();
    if (parentPhone !== undefined) updateData.parentPhone = String(parentPhone).trim();
    if (currentLevel !== undefined) updateData.currentLevel = currentLevel;
    if (notes !== undefined) updateData.notes = String(notes).trim();
    if (gender !== undefined) updateData.gender = gender ? String(gender).trim() : null;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (address !== undefined) updateData.address = address ? String(address).trim() : null;
    if (school !== undefined) updateData.school = school ? String(school).trim() : null;
    if (customFeePerSession !== undefined) {
      updateData.customFeePerSession = customFeePerSession !== null && customFeePerSession !== "" ? parseFloat(String(customFeePerSession)) : null;
    }
    if (status !== undefined) updateData.status = status;

    let updated = targetStudent;
    if (Object.keys(updateData).length > 0) {
      updated = await prisma.student.update({
        where: { id: realId },
        data: updateData,
      });
    }

    // Cập nhật lại danh sách lớp nếu có truyền classIds
    let linkedClassIds = undefined;
    if (Array.isArray(classIds)) {
      await prisma.classStudent.deleteMany({ where: { studentId: realId } });
      linkedClassIds = [];
      for (const cid of classIds) {
        if (!cid) continue;
        const classExists = await prisma.classroom.findUnique({ where: { id: cid } });
        if (classExists) {
          await prisma.classStudent.create({
            data: {
              classId: cid,
              studentId: realId,
            },
          });
          linkedClassIds.push(cid);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        code: updated.code,
        fullName: updated.fullName,
        birthYear: updated.birthYear ?? undefined,
        gender: updated.gender || "",
        parentName: updated.parentName || "",
        parentPhone: updated.parentPhone || "",
        currentLevel: updated.currentLevel || "Nhập môn",
        notes: updated.notes || "",
        classIds: linkedClassIds !== undefined ? linkedClassIds : undefined,
        customFeePerSession: updated.customFeePerSession ?? undefined,
        avatar: updated.avatar ?? undefined,
        address: updated.address ?? undefined,
        school: updated.school ?? undefined,
        status: updated.status || "ACTIVE",
      },
    });
  } catch (error: any) {
    console.error("Lỗi PUT /api/students:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const classId = searchParams.get("classId");

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID học sinh cần xóa" }, { status: 400 });
    }

    // Nếu chỉ truyền classId -> Xóa học sinh khỏi lớp đó
    if (classId) {
      await prisma.classStudent.deleteMany({
        where: { studentId: id, classId },
      });
      return NextResponse.json({ success: true, message: "Đã xóa học sinh khỏi lớp thành công" });
    }

    // Nếu không truyền classId -> Xóa hoàn toàn học sinh
    await prisma.classStudent.deleteMany({ where: { studentId: id } });
    await prisma.attendanceRecord.deleteMany({ where: { studentId: id } });
    await prisma.monthlyInvoice.deleteMany({ where: { studentId: id } });
    await prisma.studentEvaluation.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } }).catch((err) => {
      console.warn("Học sinh có thể đã bị xóa trước đó:", err);
    });

    return NextResponse.json({ success: true, message: "Đã xóa học sinh thành công" });
  } catch (error: any) {
    console.error("Lỗi DELETE /api/students:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
