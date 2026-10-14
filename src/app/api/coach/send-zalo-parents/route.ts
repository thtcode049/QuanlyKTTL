import { NextRequest, NextResponse } from "next/server";
import { dataStore } from "@/lib/data-store";
import { generateVietQrUrl } from "@/lib/vietqr";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const month = parseInt(searchParams.get("month") || "10", 10);
  const year = parseInt(searchParams.get("year") || "2026", 10);

  // Tính toán lại học phí
  dataStore.recalculateAllInvoices(month, year);

  const action = searchParams.get("action");
  const studentCode = searchParams.get("studentCode");

  if (action === "open_tool") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const { exec } = await import("child_process");
      const exePath = path.join(process.cwd(), "tools", "zalo-sender", "dist", "Zalo_Bulk_Sender", "Zalo_Bulk_Sender.exe");
      if (fs.existsSync(exePath)) {
        const workDir = path.dirname(exePath);
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '${exePath}' -WorkingDirectory '${workDir}'"`);
        return NextResponse.json({ success: true, message: "Đã khởi động Tool Zalo Bulk Sender trên máy tính!" });
      }
      const batPath = path.join(process.cwd(), "Chay_Tool_Zalo_EXE.bat");
      if (fs.existsSync(batPath)) {
        exec(`cmd /c "${batPath}"`);
        return NextResponse.json({ success: true, message: "Đã khởi động Tool Zalo Bulk Sender trên máy tính!" });
      }
      return NextResponse.json({ success: false, message: "Không tìm thấy file Zalo_Bulk_Sender.exe trên máy chủ." });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message || String(e) });
    }
  }

  if (action === "open_folder") {
    try {
      const path = await import("path");
      const { exec } = await import("child_process");
      const folderPath = path.join(process.cwd(), "tools", "zalo-sender", "dist", "Zalo_Bulk_Sender");
      exec(`explorer "${folderPath}"`);
      return NextResponse.json({ success: true, message: "Đã mở thư mục chứa Tool Zalo." });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message || String(e) });
    }
  }

  if (action === "download" && studentCode) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const outDir = path.join(process.cwd(), "invoices_output", `Thang_${month}_${year}`);
      if (fs.existsSync(outDir)) {
        const classDirs = fs.readdirSync(outDir);
        for (const cd of classDirs) {
          const fullDir = path.join(outDir, cd);
          if (fs.statSync(fullDir).isDirectory()) {
            const files = fs.readdirSync(fullDir);
            const matched = files.find((f) => f.startsWith(`${studentCode}_`) && f.endsWith(".png"));
            if (matched) {
              const fileBuffer = fs.readFileSync(path.join(fullDir, matched));
              return new NextResponse(fileBuffer, {
                headers: {
                  "Content-Type": "image/png",
                  "Content-Disposition": `attachment; filename="${matched}"`,
                },
              });
            }
          }
        }
      }
    } catch (e) {}
  }

  const bank = dataStore.bankConfig;
  const targetClass = dataStore.classes.find((c) => c.id === classId);
  const branch = dataStore.branches.find((b) => b.id === targetClass?.branchId);

  const invoices = dataStore.invoices.filter(
    (inv) => inv.classId === classId && inv.month === month && inv.year === year
  );

  const sessions = dataStore.sessions.filter((s) => {
    if (s.classId !== classId) return false;
    const d = new Date(s.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const studentsList = invoices.map((inv) => {
    const student = dataStore.students.find((s) => s.id === inv.studentId);
    const presentDates: string[] = [];
    sessions.forEach((sess) => {
      const rec = sess.records.find((r) => r.studentId === student?.id);
      if (rec && rec.status === "PRESENT") {
        const d = new Date(sess.date);
        presentDates.push(`${d.getDate()}/${d.getMonth() + 1}`);
      }
    });

    const transferContent = `HP ${student?.code || "HS"} T${month}`;
    const vietQrUrl = bank.useCustomQr && bank.customQrImage
      ? bank.customQrImage
      : generateVietQrUrl({
          bankId: bank.bankId,
          accountNo: bank.bankAccount,
          accountName: bank.accountHolder,
          template: "compact2",
          amount: inv.totalAmount,
          description: transferContent,
        });

    const cleanPhone = (student?.parentPhone || "").replace(/[^0-9]/g, "");

    return {
      invoiceId: inv.id,
      studentId: student?.id,
      studentCode: student?.code,
      studentName: student?.fullName,
      parentName: student?.parentName,
      parentPhone: student?.parentPhone,
      cleanParentPhone: cleanPhone,
      className: targetClass?.name,
      branchName: branch?.name,
      month,
      year,
      presentCount: inv.presentCount,
      presentDates,
      feePerSession: inv.feePerSession,
      totalAmount: inv.totalAmount,
      status: inv.status,
      transferContent,
      vietQrUrl,
      zaloChatUrl: `https://zalo.me/${cleanPhone}`,
    };
  });

  return NextResponse.json({
    success: true,
    class: targetClass,
    branch,
    month,
    year,
    totalStudents: studentsList.length,
    totalAmount: studentsList.reduce((sum, s) => sum + s.totalAmount, 0),
    students: studentsList,
  });
}

export async function POST(req: NextRequest) {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const body = await req.json();
    const { classId, studentCode, dryRun, customStudents } = body;

    // Lưu danh sách học viên của lớp hiện tại vào file queue để bot đọc chính xác
    if (customStudents && Array.isArray(customStudents) && customStudents.length > 0) {
      try {
        const queueFile = path.join(process.cwd(), "scripts", "custom_queue.json");
        fs.writeFileSync(queueFile, JSON.stringify(customStudents, null, 2), "utf-8");
      } catch (e) {}
    }

    const scriptPath = path.join(process.cwd(), "scripts", "send-invoices-to-parents.js");
    const scriptExists = fs.existsSync(scriptPath);

    // Nếu chạy trên môi trường serverless/cloud hoặc không tìm thấy script Puppeteer desktop
    if (!scriptExists || process.cwd().startsWith("/var/task") || process.env.VERCEL) {
      return NextResponse.json({
        success: true,
        mode: "web_queue",
        message: "Hệ thống sẵn sàng gửi tự động trên trình duyệt web.",
        dryRun: !!dryRun,
      });
    }

    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    let cmd = `node "${scriptPath}"`;
    if (classId) {
      cmd += ` --class=${classId}`;
    }
    if (studentCode) {
      cmd += ` --student=${studentCode}`;
    }
    if (dryRun) {
      cmd += ` --dry-run`;
    }

    try {
      // Thực thi script Puppeteer tự động trên desktop cục bộ (nếu có môi trường Chrome GUI)
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 120000,
      });

      return NextResponse.json({
        success: true,
        mode: "puppeteer",
        message: dryRun
          ? "Đã chạy thử nghiệm (Dry-Run) và chuẩn bị xong toàn bộ thẻ học phí!"
          : "Đã kích hoạt tool tự động gửi thẻ học phí đến phụ huynh!",
        command: cmd,
        output: stdout || stderr,
      });
    } catch (execErr: any) {
      // Nếu Puppeteer máy chủ không thể khởi động Chrome GUI, chuyển mượt mà sang chế độ web_queue
      return NextResponse.json({
        success: true,
        mode: "web_queue",
        message: "Chuyển sang chế độ tiến trình gửi tự động trực tiếp trên trình duyệt.",
        notice: execErr.message || String(execErr),
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      mode: "web_queue",
      message: "Chuyển sang chế độ tiến trình gửi tự động trực tiếp trên trình duyệt.",
      error: error.message || String(error),
    });
  }
}
