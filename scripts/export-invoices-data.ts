/**
 * Helper xuất dữ liệu học phí từ dataStore thành file JSON cho Zalo Bot
 */

import { dataStore } from '../src/lib/data-store';
import { generateVietQrUrl } from '../src/lib/vietqr';
import fs from 'fs';
import path from 'path';

export function getInvoicesForMonth(month = 10, year = 2026, classId?: string) {
  // Tính toán lại học phí
  dataStore.recalculateAllInvoices(month, year);

  let targetClasses = dataStore.classes;
  if (classId) {
    targetClasses = targetClasses.filter((c) => c.id === classId);
  }

  const result: any[] = [];
  const bank = dataStore.bankConfig;

  for (const cls of targetClasses) {
    const branch = dataStore.branches.find((b) => b.id === cls.branchId);
    const sessions = dataStore.sessions.filter((s) => {
      if (s.classId !== cls.id) return false;
      const d = new Date(s.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const classInvoices = dataStore.invoices.filter(
      (inv) => inv.classId === cls.id && inv.month === month && inv.year === year
    );

    for (const inv of classInvoices) {
      const student = dataStore.students.find((s) => s.id === inv.studentId);
      if (!student) continue;

      // Danh sách ngày có mặt
      const presentDates: string[] = [];
      sessions.forEach((sess) => {
        const rec = sess.records.find((r) => r.studentId === student.id);
        if (rec && rec.status === 'PRESENT') {
          const d = new Date(sess.date);
          presentDates.push(`${d.getDate()}/${d.getMonth() + 1}`);
        }
      });

      const transferContent = `HP ${student.code} T${month}`;
      const vietQrUrl = bank.useCustomQr && bank.customQrImage
        ? bank.customQrImage
        : generateVietQrUrl({
            bankId: bank.bankId,
            accountNo: bank.bankAccount,
            accountName: bank.accountHolder,
            template: 'compact2',
            amount: inv.totalAmount,
            description: transferContent,
          });

      result.push({
        invoiceId: inv.id,
        studentId: student.id,
        studentName: student.fullName,
        studentCode: student.code,
        parentName: student.parentName || '',
        parentPhone: student.parentPhone,
        className: cls.name,
        classId: cls.id,
        branchName: branch?.name || 'Cơ sở CLB',
        month,
        year,
        presentCount: inv.presentCount,
        presentDates,
        feePerSession: inv.feePerSession,
        totalAmount: inv.totalAmount,
        status: inv.status,
        transferContent,
        bankName: bank.bankName,
        bankAccount: bank.bankAccount,
        accountHolder: bank.accountHolder,
        vietQrUrl,
      });
    }
  }

  return result;
}

// Nếu chạy trực tiếp
if (require.main === module || process.argv[1]?.includes('export-invoices-data')) {
  const month = parseInt(process.env.MONTH || '10', 10);
  const year = parseInt(process.env.YEAR || '2026', 10);
  const classId = process.env.CLASS_ID;

  const data = getInvoicesForMonth(month, year, classId);
  const outputPath = path.join(__dirname, 'invoices_queue.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Đã xuất ${data.length} phiếu học phí vào: ${outputPath}`);
}
