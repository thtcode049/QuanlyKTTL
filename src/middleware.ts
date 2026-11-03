import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bảo vệ tất cả các route của Huấn Luyện Viên và Quản Trị Viên
  if (pathname.startsWith("/coach") || pathname.startsWith("/admin")) {
    const authCookie = request.cookies.get("kttll_logged_in");

    // Nếu chưa đăng nhập (không có cookie kttll_logged_in), lập tức chặn và điều hướng về trang đăng nhập
    if (!authCookie || !authCookie.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/coach/:path*", "/admin/:path*"],
};
