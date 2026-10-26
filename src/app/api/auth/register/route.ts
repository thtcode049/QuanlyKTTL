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
      systemRole = "COACH",
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

    // Xác định vai trò quản trị (Admin access)
    const isAdminRole =
      systemRole === "CHUNHIEM" ||
      systemRole === "PHOCHUNHIEM" ||
      systemRole === "CHUCOSO" ||
      role === "ADMIN";

    const userRole = systemRole === "CHUNHIEM" || systemRole === "PHOCHUNHIEM" || role === "ADMIN" ? "ADMIN" : "COACH";

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
        const firstBranch = await prisma.branch.findFirst();
        validBranchId = firstBranch ? firstBranch.id : null;
      }
    }

    const defaultTitle =
      systemRole === "CHUNHIEM"
        ? "Chủ nhiệm CLB"
        : systemRole === "PHOCHUNHIEM"
        ? "Phó chủ nhiệm CLB"
        : systemRole === "CHUCOSO"
        ? "Chủ nhiệm cơ sở"
        : "HLV Quốc gia";

    const formattedName = systemRole === "CHUNHIEM" || systemRole === "PHOCHUNHIEM"
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
        role: userRole,
        systemRole: systemRole || "COACH",
        title: title || defaultTitle,
        experience: experience || (isAdminRole ? "Ban Quản Trị" : "3 năm"),
        bio: bio || "",
        bankAccount: bankAccount || "",
        bankName: bankName || "MBBank",
        accountHolder: (accountHolder || name).toUpperCase().trim(),
        elo: elo ? parseInt(elo) : (isAdminRole ? undefined : 2000),
        branchId: validBranchId,
        baseRate: systemRole === "CHUNHIEM" ? 0 : 200000,
        hasAdminAccess: isAdminRole,
      },
    });

    // Đồng bộ vào Supabase Authentication (auth.users)
    try {
      await prisma.$queryRawUnsafe(`
        INSERT INTO auth.users (
          id,
          instance_id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          is_sso_user,
          is_anonymous
        ) VALUES (
          $1::uuid,
          '00000000-0000-0000-0000-000000000000'::uuid,
          'authenticated',
          'authenticated',
          $2,
          crypt($3, gen_salt('bf')),
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          json_build_object('name', $4, 'role', $5, 'phone', $6)::jsonb,
          NOW(),
          NOW(),
          false,
          false
        )
        ON CONFLICT (id) DO NOTHING;
      `, newUser.id, cleanEmail, password, formattedName, isAdminRole ? "ADMIN" : "COACH", phone.trim());
    } catch (authErr) {
      console.warn("Lưu ý: Không thể chèn vào auth.users:", authErr);
    }

    return NextResponse.json({
      success: true,
      message: isAdminRole
        ? "Đăng ký tài khoản Ban Quản Trị CLB thành công!"
        : "Đăng ký tài khoản Huấn luyện viên thành công!",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        title: newUser.title,
        branchId: newUser.branchId,
        hasAdminAccess: isAdminRole ? true : false,
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
