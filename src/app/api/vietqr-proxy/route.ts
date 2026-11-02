import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing 'url' query parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/png,image/svg+xml,image/*;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "";

    // Nếu trả về SVG từ VietQR (img.vietqr.io), trích xuất PNG base64 nhúng bên trong
    if (contentType.includes("svg") || contentType.includes("xml")) {
      const text = await res.text();
      const base64Match =
        text.match(/href=["']data:image\/png;base64,([^"']+)["']/i) ||
        text.match(/xlink:href=["']data:image\/png;base64,([^"']+)["']/i) ||
        text.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);

      if (base64Match && base64Match[1]) {
        const buffer = Buffer.from(base64Match[1], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          },
        });
      }

      // Nếu không có base64 nhúng, trả về SVG data
      return new NextResponse(text, {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Nếu là ảnh thông thường (PNG/JPEG/WEBP)
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": contentType || "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      },
    });
  } catch (err: any) {
    console.error("Lỗi proxy VietQR:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
