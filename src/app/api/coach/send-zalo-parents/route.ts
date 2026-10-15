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
      const os = await import("os");
      const { spawn } = await import("child_process");

      const home = os.homedir();
      const candidatePaths = [
        path.join(home, "Desktop", "Zalo_Bulk_Sender.exe"),
        path.join(home, "Downloads", "Zalo_Bulk_Sender.exe"),
        path.join(home, "Downloads", "Zalo_Bulk_Sender", "Zalo_Bulk_Sender.exe"),
        path.join(process.cwd(), "Zalo_Bulk_Sender.exe"),
        path.join(process.cwd(), "public", "downloads", "Zalo_Bulk_Sender.exe"),
        path.join(process.cwd(), "tools", "zalo-sender", "dist", "Zalo_Bulk_Sender.exe"),
        path.join(process.cwd(), "tools", "zalo-sender", "dist", "Zalo_Bulk_Sender", "Zalo_Bulk_Sender.exe"),
        path.join(home, ".kttl_zalo_sender", "Zalo_Bulk_Sender.exe"),
      ];

      let foundExe = "";
      for (const exePath of candidatePaths) {
        if (fs.existsSync(exePath)) {
          foundExe = exePath;
          break;
        }
      }

      if (!foundExe) {
        return NextResponse.json({
          success: false,
          message: "Không tìm thấy file Zalo_Bulk_Sender.exe trên máy. Vui lòng bấm nút 'Tải Tool (.exe)' để tải về!",
        });
      }

      const workDir = path.dirname(foundExe);
      const args: string[] = [];

      // Nếu có classId, tự động kết xuất dữ liệu hóa đơn của lớp này và truyền đường dẫn vào tool
      if (classId) {
        try {
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
            const vietQrUrl =
              dataStore.bankConfig.useCustomQr && dataStore.bankConfig.customQrImage
                ? dataStore.bankConfig.customQrImage
                : generateVietQrUrl({
                    bankId: dataStore.bankConfig.bankId,
                    accountNo: dataStore.bankConfig.bankAccount,
                    accountName: dataStore.bankConfig.accountHolder,
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
              bankName: dataStore.bankConfig.bankName,
              bankAccount: dataStore.bankConfig.bankAccount,
              accountHolder: dataStore.bankConfig.accountHolder,
            };
          });

          const exportBundle = {
            exportTime: new Date().toISOString(),
            classInfo: {
              classId,
              className: targetClass?.name,
              branchName: branch?.name,
              month,
              year,
              totalSessions: sessions.length,
            },
            bankConfig: {
              bankName: dataStore.bankConfig.bankName,
              bankAccount: dataStore.bankConfig.bankAccount,
              accountHolder: dataStore.bankConfig.accountHolder,
            },
            totalStudents: studentsList.length,
            totalAmount: studentsList.reduce((sum, s) => sum + s.totalAmount, 0),
            students: studentsList,
          };

          const kttlDir = path.join(os.homedir(), ".kttl_zalo_sender");
          if (!fs.existsSync(kttlDir)) {
            fs.mkdirSync(kttlDir, { recursive: true });
          }
          const jsonTempPath = path.join(kttlDir, "invoices_auto_launch.json");
          fs.writeFileSync(jsonTempPath, JSON.stringify(exportBundle, null, 2), "utf-8");
          args.push(jsonTempPath);
        } catch (jsonErr) {
          console.warn("Không thể chuẩn bị file JSON tự động:", jsonErr);
        }
      }

      // Khởi động trực tiếp EXE qua spawn với start trên Windows để hiển thị cửa sổ GUI trên Desktop
      if (process.platform === "win32") {
        const cmdArgs = ["/c", "start", '""', foundExe];
        if (args.length > 0) {
          cmdArgs.push(...args);
        }
        const child = spawn("cmd.exe", cmdArgs, {
          cwd: workDir,
          detached: true,
          stdio: "ignore",
          windowsVerbatimArguments: true,
        });
        child.unref();
      } else {
        const child = spawn(foundExe, args, {
          cwd: workDir,
          detached: true,
          stdio: "ignore",
        });
        child.unref();
      }

      return NextResponse.json({
        success: true,
        message: "Đã khởi động Tool Zalo Bulk Sender trên máy tính thành công!",
      });
    } catch (e: any) {
      console.error("Lỗi khởi động tool Zalo:", e);
      return NextResponse.json({ success: false, error: e.message || String(e) });
    }
  }

  if (action === "open_folder") {
    try {
      const path = await import("path");
      const { exec } = await import("child_process");
      const folderPath = process.cwd();
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
    const body = await req.json();
    const { action, studentId, studentIds, month, year } = body;

    // Đánh dấu học viên đã gửi thẻ học phí qua Tool Zalo
    if (action === "mark_sent") {
      const now = new Date().toISOString();
      if (studentId) {
        dataStore.invoices.forEach((inv) => {
          if (inv.studentId === studentId && (!month || inv.month === month) && (!year || inv.year === year)) {
            inv.zaloSentAt = now;
          }
        });
      } else if (Array.isArray(studentIds)) {
        dataStore.invoices.forEach((inv) => {
          if (studentIds.includes(inv.studentId) && (!month || inv.month === month) && (!year || inv.year === year)) {
            inv.zaloSentAt = now;
          }
        });
      }
      dataStore.saveToLocalStorage();
      return NextResponse.json({ success: true, message: "Đã cập nhật trạng thái gửi thẻ học phí qua Tool Zalo!" });
    }

    return NextResponse.json({
      success: true,
      message: "Phương thức gửi thẻ học phí tiêu chuẩn hiện tại là Tool Zalo Bulk Sender (EXE).",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || String(error),
    }, { status: 500 });
  }
}
