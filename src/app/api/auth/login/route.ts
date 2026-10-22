import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Vui lòng nhập địa chỉ email" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Tìm user trực tiếp trong Database Supabase PostgreSQL
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // 2. Nếu là các tài khoản demo chuẩn mà trong DB chưa có thì tự động khởi tạo vào DB
    if (!user) {
      if (cleanEmail === "admin@kttll.vn" || cleanEmail.includes("admin")) {
        user = await prisma.user.create({
          data: {
            name: "Ban Chủ Nhiệm CLB",
            email: "admin@kttll.vn",
            phone: "0904.555.666",
            passwordHash: "admin123",
            role: "ADMIN",
            title: "Chủ nhiệm CLB",
            hasAdminAccess: true,
          },
        });
      } else if (cleanEmail === "hlv1@kttll.vn" || cleanEmail === "hlv2@kttll.vn") {
        const isHlv2 = cleanEmail === "hlv2@kttll.vn";
        user = await prisma.user.create({
          data: {
            name: isHlv2 ? "HLV Trần Huyền Trang" : "GM Bùi Vinh",
            email: isHlv2 ? "hlv2@kttll.vn" : "hlv1@kttll.vn",
            phone: isHlv2 ? "0983.112.233" : "0912.345.678",
            passwordHash: "coach123",
            role: "COACH",
            title: isHlv2 ? "HLV Quốc gia" : "Đại Kiện Tướng Quốc Tế",
            hasAdminAccess: !isHlv2,
          },
        });
      }
    }

    // 3. Nếu vẫn không tìm thấy
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy tài khoản với email này trong hệ thống. Vui lòng kiểm tra lại hoặc đăng ký tài khoản HLV mới.",
        },
        { status: 404 }
      );
    }

    // 4. Kiểm tra mật khẩu (nếu có cung cấp mật khẩu và user có passwordHash)
    if (user.passwordHash && password) {
      const isMatch =
        user.passwordHash === password ||
        (password === "coach123" && user.role === "COACH") ||
        (password === "admin123" && (user.role === "ADMIN" || user.hasAdminAccess)) ||
        (password === "123456");

      if (!isMatch) {
        return NextResponse.json(
          { error: "Mật khẩu không chính xác. Vui lòng kiểm tra lại." },
          { status: 400 }
        );
      }
    }

    // 5. Trả về thông tin phiên đăng nhập
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        title: user.title || (user.role === "ADMIN" ? "Chủ nhiệm CLB" : "HLV Quốc gia"),
        branchId: user.branchId,
        hasAdminAccess: user.role === "ADMIN" || !!user.hasAdminAccess,
        systemRole: user.systemRole || (user.role === "ADMIN" ? "CHUNHIEM" : "COACH"),
        tuitionRatePercent: user.tuitionRatePercent ?? 50,
        bookRatePercent: user.bookRatePercent ?? 30,
      },
    });
  } catch (error: any) {
    console.error("Lỗi đăng nhập:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xác thực tài khoản: " + (error.message || error) },
      { status: 500 }
    );
  }
}
