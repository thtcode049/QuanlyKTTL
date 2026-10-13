/**
 * Batch generate invoice card PNG images for students grouped by Coach & Class
 * CLB Cờ vua Kiện Tướng Tương Lai (KTTLL)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { buildInvoiceHtml, getBrowserExecutablePath } = require('./render-invoice-card');

function sanitizeFileName(name) {
  if (!name) return 'Unknown';
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').trim();
}

/**
 * Tạo ảnh thẻ học phí theo danh sách từng Huấn luyện viên
 */
async function batchGenerateCoachInvoiceCards(options = {}) {
  const coachDataPath = options.coachDataPath || path.join(__dirname, 'coach_invoices_data.json');
  if (!fs.existsSync(coachDataPath)) {
    throw new Error(`Không tìm thấy file dữ liệu HLV: ${coachDataPath}. Hãy chạy 'tsx scripts/export-coach-invoices.ts' trước.`);
  }

  const raw = fs.readFileSync(coachDataPath, 'utf-8');
  const allCoachBundles = JSON.parse(raw);

  const targetBundles = (options.coachId && options.coachId !== 'all')
    ? allCoachBundles.filter((b) => b.coachId === options.coachId)
    : allCoachBundles;

  // Thu thập tất cả thẻ cần render
  const tasks = [];
  targetBundles.forEach((coach) => {
    coach.classes.forEach((cls) => {
      cls.students.forEach((st) => {
        tasks.push({
          coach,
          cls,
          student: st,
        });
      });
    });
  });

  const totalTasks = options.limit ? Math.min(options.limit, tasks.length) : tasks.length;
  const executionTasks = tasks.slice(0, totalTasks);

  console.log(`\n======================================================`);
  console.log(`🎨 BẮT ĐẦU XUẤT THẺ HỌC PHÍ CHO ${targetBundles.length} HLV (${totalTasks} THẺ HỌC VIÊN)`);
  console.log(`======================================================\n`);

  const chromePath = getBrowserExecutablePath();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const generatedFiles = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 600, height: 950, deviceScaleFactor: 2 });

    for (let i = 0; i < executionTasks.length; i++) {
      const { coach, cls, student } = executionTasks[i];
      const folderMonth = `Thang_${student.month}_${student.year}`;
      const coachFolder = `HLV_${sanitizeFileName(coach.coachName)}`;
      const classFolder = sanitizeFileName(cls.className);

      // Thư mục phân cấp: invoices_output/Thang_10_2026/HLV_GM_Bui_Vinh/Co_vua_Vo_Long_K01/
      const outDir = path.join(process.cwd(), 'invoices_output', folderMonth, coachFolder, classFolder);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const fileName = `${student.studentCode}_${sanitizeFileName(student.studentName)}.png`;
      const outPath = path.join(outDir, fileName);

      process.stdout.write(`[${i + 1}/${totalTasks}] [${coach.coachName}] ${student.studentCode} - ${student.studentName}... `);

      const html = buildInvoiceHtml(student);
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });

      // Chờ ảnh QR VietQR tải xong (tối đa 2s)
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const img = document.getElementById('qrImg');
          if (img && img.complete) resolve(true);
          else if (img) {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
            setTimeout(() => resolve(true), 2000);
          } else resolve(true);
        });
      });

      const element = await page.waitForSelector('#invoiceCard', { timeout: 5000 });
      if (element) {
        await element.screenshot({
          path: outPath,
          type: 'png',
          omitBackground: true,
        });

        student.cardImagePath = outPath;
        generatedFiles.push({
          coachId: coach.coachId,
          coachName: coach.coachName,
          classId: cls.classId,
          className: cls.className,
          studentCode: student.studentCode,
          studentName: student.studentName,
          imagePath: outPath,
        });
        console.log(`✅ Xong`);
      } else {
        console.log(`❌ Lỗi element`);
      }
    }

    await page.close();
  } finally {
    await browser.close();
  }

  // Cập nhật lại file coach_invoices_data.json với đường dẫn ảnh đã render
  fs.writeFileSync(coachDataPath, JSON.stringify(allCoachBundles, null, 2), 'utf-8');

  // Ghi metadata manifest
  const manifestPath = path.join(process.cwd(), 'invoices_output', 'generated_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(generatedFiles, null, 2), 'utf-8');

  console.log(`\n🎉 HOÀN TẤT XUẤT ${generatedFiles.length} ẢNH THẺ HỌC PHÍ CHO CÁC HLV!`);
  console.log(`📁 Thư mục lưu ảnh: ${path.join(process.cwd(), 'invoices_output')}`);
  console.log(`📋 Cập nhật file dữ liệu: ${coachDataPath}\n`);

  return generatedFiles;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let limit = null;
  let coachId = 'all';

  args.forEach((arg) => {
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--coach=')) {
      coachId = arg.split('=')[1];
    }
  });

  // Mặc định render 6 thẻ đầu nếu không truyền param để kiểm thử nhanh, hoặc truyền --limit=0 để render tất cả
  const runLimit = limit === 0 ? null : (limit || 6);

  batchGenerateCoachInvoiceCards({ limit: runLimit, coachId }).catch((err) => {
    console.error('❌ Lỗi tạo thẻ học phí:', err);
    process.exit(1);
  });
}

module.exports = {
  batchGenerateCoachInvoiceCards,
};
