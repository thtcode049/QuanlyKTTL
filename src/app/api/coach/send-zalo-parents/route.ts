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
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const body = await req.json();
    const { classId, studentCode, dryRun } = body;

    let cmd = `node scripts/send-invoices-to-parents.js`;
    if (classId) {
      cmd += ` --class=${classId}`;
    }
    if (studentCode) {
      cmd += ` --student=${studentCode}`;
    }
    if (dryRun) {
      cmd += ` --dry-run`;
    }

    // Thực thi script Puppeteer tự động
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 120000,
    });

    return NextResponse.json({
      success: true,
      message: dryRun
        ? "Đã chạy thử nghiệm (Dry-Run) và chuẩn bị xong toàn bộ thẻ học phí!"
        : "Đã kích hoạt tool tự động gửi thẻ học phí đến phụ huynh!",
      command: cmd,
      output: stdout || stderr,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi khi kích hoạt tool gửi Zalo",
        output: error.stdout || error.stderr || String(error),
      },
      { status: 500 }
    );
  }
}
