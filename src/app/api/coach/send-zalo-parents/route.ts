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
