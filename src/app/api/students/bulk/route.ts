import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { students = [], defaultClassId } = body;

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: "Danh sách học viên rỗng" },
        { status: 400 }
      );
    }

    const createdStudents: any[] = [];
    const errors: any[] = [];

    // Lấy danh sách lớp hiện có để kiểm tra hợp lệ
    const existingClasses = await prisma.classroom.findMany({ select: { id: true } });
    const validClassIds = new Set(existingClasses.map((c) => c.id));

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      try {
        const fullName = String(s.fullName || "").trim();
        const parentPhone = String(s.parentPhone || "").trim();

        if (!fullName || !parentPhone) {
          errors.push({
            index: i + 1,
            name: fullName || "Không tên",
            error: "Thiếu Họ tên hoặc Số điện thoại phụ huynh",
          });
          continue;
        }

        const birthYear = s.birthYear ? parseInt(s.birthYear) : null;
        const parentName = String(s.parentName || "").trim();
        const currentLevel = String(s.currentLevel || "");
        const gender = s.gender ? String(s.gender).trim() : null;
        const code = s.code ? String(s.code).trim() : (birthYear ? `HS${String(birthYear).slice(-2)}` : "HS00");
        const notes = s.notes ? String(s.notes).trim() : "";
        const school = s.school ? String(s.school).trim() : null;
        const address = s.address ? String(s.address).trim() : null;
        const customFee = s.customFeePerSession ? parseFloat(s.customFeePerSession) : null;

        // Xác định danh sách classId cần liên kết
        let targetClassIds: string[] = [];
        if (Array.isArray(s.classIds) && s.classIds.length > 0) {
          targetClassIds = s.classIds;
        } else if (s.matchedClassId) {
          targetClassIds = [s.matchedClassId];
        } else if (defaultClassId && defaultClassId !== "NONE" && defaultClassId !== "AUTO") {
          targetClassIds = [defaultClassId];
        }

        // Lọc chỉ giữ các classId thực sự tồn tại trong DB
        const verifiedClassIds = targetClassIds.filter((cid) => validClassIds.has(cid));

        // Tạo học viên mới trong DB
        const newStudent = await prisma.student.create({
          data: {
            fullName,
            birthYear,
            gender,
            parentName,
            parentPhone,
            currentLevel,
            notes,
            code,
            school,
            address,
            customFeePerSession: customFee,
            status: "ACTIVE",
          },
        });

        // Ghi danh vào các lớp học
        for (const cid of verifiedClassIds) {
          await prisma.classStudent.create({
            data: {
              classId: cid,
              studentId: newStudent.id,
            },
          });
        }

        createdStudents.push({
          ...newStudent,
          classIds: verifiedClassIds,
        });
      } catch (rowError: any) {
        console.error(`Lỗi khi tạo học viên dòng ${i + 1}:`, rowError);
        errors.push({
          index: i + 1,
          name: s.fullName,
          error: rowError.message || "Lỗi lưu vào cơ sở dữ liệu",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalReceived: students.length,
      count: createdStudents.length,
      created: createdStudents,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Lỗi POST /api/students/bulk:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ nội bộ" },
      { status: 500 }
    );
  }
}
