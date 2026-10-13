/**
 * Export Invoices Grouped by Coach for Zalo Bot Automation
 * CLB Cờ vua Kiện Tướng Tương Lai (KTTLL)
 */

import { dataStore } from '../src/lib/data-store';
import { generateVietQrUrl } from '../src/lib/vietqr';
import fs from 'fs';
import path from 'path';

export interface StudentInvoiceDetail {
  invoiceId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  parentName: string;
  parentPhone: string;
  className: string;
  classId: string;
  branchName: string;
  month: number;
  year: number;
  presentCount: number;
  presentDates: string[];
  feePerSession: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID';
  transferContent: string;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  vietQrUrl: string;
  cardImagePath?: string;
}

export interface ClassInvoiceGroup {
  classId: string;
  className: string;
  branchName: string;
  studentCount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  students: StudentInvoiceDetail[];
}

export interface CoachInvoiceBundle {
  coachId: string;
  coachName: string;
  coachPhone: string;
  cleanPhone: string; // Số điện thoại chuẩn hóa để tìm kiếm trên Zalo
  title?: string;
  email?: string;
  month: number;
  year: number;
  totalClasses: number;
  totalStudents: number;
  totalTuitionAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  classes: ClassInvoiceGroup[];
  allStudents: StudentInvoiceDetail[];
  zaloSummaryText: string;
}

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('84')) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

export function buildZaloCoachMessage(bundle: {
  coachName: string;
  month: number;
  year: number;
  classes: ClassInvoiceGroup[];
  totalTuitionAmount: number;
  totalStudents: number;
}): string {
  const lines: string[] = [
    `🥋 [KTTLL] BẢNG TỔNG HỢP HỌC PHÍ THÁNG ${bundle.month}/${bundle.year}`,
    `Kính gửi Thầy/Cô: ${bundle.coachName}`,
    `CLB Cờ vua Kiện Tướng Tương Lai gửi Thầy/Cô bảng tổng hợp học phí các lớp Thầy/Cô đang phụ trách:\n`,
  ];

  bundle.classes.forEach((cls, idx) => {
    lines.push(`📚 ${idx + 1}. ${cls.className} (${cls.branchName})`);
    lines.push(`- Sĩ số: ${cls.studentCount} học viên | Tổng học phí: ${cls.totalAmount.toLocaleString('vi-VN')} đ`);
    
    cls.students.forEach((st) => {
      const statusIcon = st.status === 'PAID' ? '✅ Đã đóng' : '⏳ Chờ thu';
      lines.push(`  • ${st.studentCode} - ${st.studentName}: ${st.presentCount} buổi = ${st.totalAmount.toLocaleString('vi-VN')} đ (${statusIcon})`);
    });
    lines.push('');
  });

  lines.push(`📊 TỔNG CỘNG: ${bundle.classes.length} lớp | ${bundle.totalStudents} học viên | Tổng học phí: ${bundle.totalTuitionAmount.toLocaleString('vi-VN')} VNĐ`);
  lines.push(`\n📎 CLB gửi kèm đầy đủ file ảnh Thẻ Báo Học Phí (có sẵn mã VietQR của từng học viên) ngay bên dưới để Thầy/Cô chuyển tiếp cho phụ huynh hoặc theo dõi đối soát.`);
  lines.push(`Mọi thắc mắc về số buổi học, Thầy/Cô vui lòng phản hồi lại với Ban Quản Trị CLB. Trân trọng cảm ơn Thầy/Cô! 🙏`);

  return lines.join('\n');
}

export function getCoachInvoices(month = 10, year = 2026): CoachInvoiceBundle[] {
  // Tính toán lại học phí theo đúng thực học thực trả
  dataStore.recalculateAllInvoices(month, year);

  const bank = dataStore.bankConfig;
  const coaches = dataStore.users.filter((u) => u.role === 'COACH');
  const result: CoachInvoiceBundle[] = [];

  for (const coach of coaches) {
    const coachClasses = dataStore.classes.filter(
      (c) => c.coachId === coach.id && c.isActive
    );

    if (coachClasses.length === 0) continue;

    const classGroups: ClassInvoiceGroup[] = [];
    const allStudentsList: StudentInvoiceDetail[] = [];
    let coachTotalTuition = 0;
    let coachTotalPaid = 0;
    let coachTotalPending = 0;

    for (const cls of coachClasses) {
      const branch = dataStore.branches.find((b) => b.id === cls.branchId);
      const sessions = dataStore.sessions.filter((s) => {
        if (s.classId !== cls.id) return false;
        const d = new Date(s.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });

      const classInvoices = dataStore.invoices.filter(
        (inv) => inv.classId === cls.id && inv.month === month && inv.year === year
      );

      const studentDetails: StudentInvoiceDetail[] = [];
      let classTotalAmount = 0;
      let classPaidAmount = 0;
      let classPendingAmount = 0;

      for (const inv of classInvoices) {
        const student = dataStore.students.find((s) => s.id === inv.studentId);
        if (!student) continue;

        // Ngày có mặt
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

        const detail: StudentInvoiceDetail = {
          invoiceId: inv.id,
          studentId: student.id,
          studentName: student.fullName,
          studentCode: student.code,
          parentName: student.parentName,
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
        };

        studentDetails.push(detail);
        allStudentsList.push(detail);

        classTotalAmount += inv.totalAmount;
        if (inv.status === 'PAID') {
          classPaidAmount += inv.totalAmount;
        } else {
          classPendingAmount += inv.totalAmount;
        }
      }

      classGroups.push({
        classId: cls.id,
        className: cls.name,
        branchName: branch?.name || 'Cơ sở CLB',
        studentCount: studentDetails.length,
        totalAmount: classTotalAmount,
        paidAmount: classPaidAmount,
        pendingAmount: classPendingAmount,
        students: studentDetails,
      });

      coachTotalTuition += classTotalAmount;
      coachTotalPaid += classPaidAmount;
      coachTotalPending += classPendingAmount;
    }

    const zaloSummaryText = buildZaloCoachMessage({
      coachName: coach.name,
      month,
      year,
      classes: classGroups,
      totalTuitionAmount: coachTotalTuition,
      totalStudents: allStudentsList.length,
    });

    result.push({
      coachId: coach.id,
      coachName: coach.name,
      coachPhone: coach.phone,
      cleanPhone: cleanPhoneNumber(coach.phone),
      title: coach.title,
      email: coach.email,
      month,
      year,
      totalClasses: classGroups.length,
      totalStudents: allStudentsList.length,
      totalTuitionAmount: coachTotalTuition,
      totalPaidAmount: coachTotalPaid,
      totalPendingAmount: coachTotalPending,
      classes: classGroups,
      allStudents: allStudentsList,
      zaloSummaryText,
    });
  }

  return result;
}

// Nếu chạy từ CLI
if (require.main === module || process.argv[1]?.includes('export-coach-invoices')) {
  const month = parseInt(process.env.MONTH || '10', 10);
  const year = parseInt(process.env.YEAR || '2026', 10);

  const data = getCoachInvoices(month, year);
  const outputPath = path.join(__dirname, 'coach_invoices_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

  // Cũng xuất flat queue để tương thích các tool cũ nếu cần
  const flatQueue: StudentInvoiceDetail[] = [];
  data.forEach((c) => flatQueue.push(...c.allStudents));
  const queuePath = path.join(__dirname, 'invoices_queue.json');
  fs.writeFileSync(queuePath, JSON.stringify(flatQueue, null, 2), 'utf-8');

  console.log(`\n======================================================`);
  console.log(`📊 ĐÃ XUẤT DỮ LIỆU HỌC PHÍ THEO ${data.length} HUẤN LUYỆN VIÊN (THÁNG ${month}/${year})`);
  console.log(`======================================================`);
  data.forEach((c) => {
    console.log(`👤 HLV: ${c.coachName} (SĐT: ${c.cleanPhone}) - ${c.totalClasses} lớp, ${c.totalStudents} HS, Tổng HP: ${c.totalTuitionAmount.toLocaleString('vi-VN')} đ`);
  });
  console.log(`\n📁 File dữ liệu HLV: ${outputPath}`);
  console.log(`📁 File danh sách thẻ: ${queuePath}\n`);
}
