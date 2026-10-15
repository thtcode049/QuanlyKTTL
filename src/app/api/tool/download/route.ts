import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isZip = searchParams.get("format") === "zip";
    const filename = isZip ? "Zalo_Bulk_Sender.zip" : "Zalo_Bulk_Sender.exe";
    const mimeType = isZip ? "application/zip" : "application/octet-stream";

    const candidatePaths = [
      path.join(process.cwd(), "public", "downloads", filename),
      path.join(process.cwd(), "public", filename),
      path.join(process.cwd(), filename),
      path.join(process.cwd(), "tools", "zalo-sender", "dist", filename),
      path.join(process.cwd(), "tools", "zalo-sender", "dist", "Zalo_Bulk_Sender", filename),
    ];

    let foundPath = "";
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      return NextResponse.json(
        { success: false, error: `Không tìm thấy file ${filename} trên máy chủ.` },
        { status: 404 }
      );
    }

    const stat = fs.statSync(foundPath);
    const fileBuffer = fs.readFileSync(foundPath);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": stat.size.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Lỗi khi tải file tool Zalo_Bulk_Sender:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ khi tải tool" },
      { status: 500 }
    );
  }
}
