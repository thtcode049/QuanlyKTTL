import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      phone,
      role = "COACH",
      adminSecretCode,
      title,
      elo,
      experience,
      branchId,
      bankName,
      bankAccount,
      accountHolder,
      bio,
    } = body;

    // Validate
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ các thông tin bắt buộc (họ tên, email, mật khẩu, SĐT)" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Nếu đăng ký vai trò ADMIN, kiểm tra mã xác thực quản trị viên
    const isAdmin = role === "ADMIN";
    if (isAdmin) {
      const validCodes = ["KTTLL2026", "ADMIN2026", "admin123"];
      if (adminSecretCode && !validCodes.includes(adminSecretCode.trim())) {
        return NextResponse.json(
          { error: "Mã xác thực Quản trị viên (Admin Secret Code) không chính xác." },
          { status: 400 }
        );
      }
    }

    // Kiểm tra email đã tồn tại trong DB chưa
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập." },
        { status: 400 }
      );
    }

    // Resolve branchId nếu branchId là id hợp lệ trong DB
    let validBranchId: string | null = null;
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
      });
      if (branch) {
        validBranchId = branch.id;
      } else {
        // Tìm cơ sở đầu tiên nếu branchId truyền vào là mock id (như branch-1)
        const firstBranch = await prisma.branch.findFirst();
        validBranchId = firstBranch ? firstBranch.id : null;
      }
    }

    const formattedName = isAdmin
      ? name.trim()
      : name.startsWith("HLV") || name.startsWith("GM") || name.startsWith("IM")
      ? name.trim()
      : `HLV ${name.trim()}`;

    // Tạo User thật trong Database Supabase PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        name: formattedName,
        email: cleanEmail,
        phone: phone.trim(),
        passwordHash: password, // Mật khẩu của người dùng
        role: isAdmin ? "ADMIN" : "COACH",
        title: title || (isAdmin ? "Chủ nhiệm CLB" : "HLV Quốc gia"),
        experience: experience || (isAdmin ? "Ban Quản Trị" : "3 năm"),
        bio: bio || "",
        bankAccount: bankAccount || "",
        bankName: bankName || "MBBank",
        accountHolder: (accountHolder || name).toUpperCase().trim(),
        elo: elo ? parseInt(elo) : (isAdmin ? undefined : 2000),
        branchId: validBranchId,
        baseRate: isAdmin ? 0 : 200000,
        hasAdminAccess: isAdmin ? true : false,
      },
    });

    return NextResponse.json({
      success: true,
      message: isAdmin
        ? "Đăng ký tài khoản Ban Quản Trị CLB thành công!"
        : "Đăng ký tài khoản Huấn luyện viên thành công!",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        title: newUser.title,
        branchId: newUser.branchId,
        hasAdminAccess: isAdmin ? true : false,
      },
    });
  } catch (error: any) {
    console.error("Lỗi đăng ký tài khoản:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo tài khoản trong DB: " + (error.message || error) },
      { status: 500 }
    );
  }
}
