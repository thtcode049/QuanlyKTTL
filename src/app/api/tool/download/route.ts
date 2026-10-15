import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const candidatePaths = [
      path.join(process.cwd(), "Zalo_Bulk_Sender.exe"),
      path.join(process.cwd(), "tools", "zalo-sender", "dist", "Zalo_Bulk_Sender.exe"),
      path.join(process.cwd(), "tools", "zalo-sender", "dist", "Zalo_Bulk_Sender", "Zalo_Bulk_Sender.exe"),
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
        { success: false, error: "Không tìm thấy file phần mềm Zalo_Bulk_Sender.exe trên máy chủ." },
        { status: 404 }
      );
    }

    const stat = fs.statSync(foundPath);
    const stream = fs.createReadStream(foundPath);

    const readableStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "application/vnd.microsoft.portable-executable",
        "Content-Disposition": 'attachment; filename="Zalo_Bulk_Sender.exe"',
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Lỗi khi tải file tool Zalo_Bulk_Sender.exe:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi máy chủ khi tải tool" },
      { status: 500 }
    );
  }
}
