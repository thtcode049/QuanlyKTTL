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
      code: s.code || `HS${String(s.birthYear).slice(-2)}`,
      fullName: s.fullName,
      birthYear: s.birthYear,
      gender: s.gender || "Nam",
      parentName: s.parentName,
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

    if (!fullName || !parentPhone) {
      return NextResponse.json(
        { success: false, error: "Họ tên và Số điện thoại phụ huynh là bắt buộc" },
        { status: 400 }
      );
    }

    const newStudent = await prisma.student.create({
      data: {
        ...(id && !id.startsWith("std-") ? { id } : {}),
        fullName,
        birthYear: parseInt(birthYear) || 2018,
        parentName: parentName || "Phụ huynh",
        parentPhone,
        currentLevel,
        notes: notes || "",
        gender: gender || "Nam",
        avatar: avatar || null,
        address: address || null,
        school: school || null,
        customFeePerSession: customFeePerSession ? parseFloat(customFeePerSession) : null,
        status: "ACTIVE",
      },
    });

    // Tạo liên kết với các lớp
    if (Array.isArray(classIds) && classIds.length > 0) {
      for (const cid of classIds) {
        // Kiểm tra xem classId có trong DB không
        const classExists = await prisma.classroom.findUnique({ where: { id: cid } });
        if (classExists) {
          await prisma.classStudent.create({
            data: {
              classId: cid,
              studentId: newStudent.id,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...newStudent,
        classIds,
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

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (birthYear !== undefined) updateData.birthYear = parseInt(birthYear);
    if (parentName) updateData.parentName = parentName;
    if (parentPhone) updateData.parentPhone = parentPhone;
    if (currentLevel) updateData.currentLevel = currentLevel;
    if (notes !== undefined) updateData.notes = notes;
    if (gender) updateData.gender = gender;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (address !== undefined) updateData.address = address;
    if (school !== undefined) updateData.school = school;
    if (customFeePerSession !== undefined) {
      updateData.customFeePerSession = customFeePerSession ? parseFloat(customFeePerSession) : null;
    }
    if (status) updateData.status = status;

    const updated = await prisma.student.update({
      where: { id },
      data: updateData,
    });

    // Cập nhật lại danh sách lớp nếu có truyền classIds
    if (Array.isArray(classIds)) {
      await prisma.classStudent.deleteMany({ where: { studentId: id } });
      for (const cid of classIds) {
        const classExists = await prisma.classroom.findUnique({ where: { id: cid } });
        if (classExists) {
          await prisma.classStudent.create({
            data: {
              classId: cid,
              studentId: id,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: updated });
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
    await prisma.student.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Đã xóa học sinh thành công" });
  } catch (error: any) {
    console.error("Lỗi DELETE /api/students:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
