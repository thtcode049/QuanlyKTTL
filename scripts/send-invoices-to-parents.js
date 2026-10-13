/**
 * Tool Tự Động HLV Gửi Thẻ Học Phí Trực Tiếp Đến Phụ Huynh Qua Zalo Cá Nhân (Puppeteer)
 * CLB Cờ vua Kiện Tướng Tương Lai (KTTLL)
 * 
 * Hướng dẫn sử dụng:
 * 1. Chạy thử nghiệm xem trước (Dry-Run, KHÔNG gửi thật):
 *    node scripts/send-invoices-to-parents.js --dry-run --class=class-1
 * 
 * 2. Gửi thật hàng loạt cho toàn bộ phụ huynh trong lớp:
 *    node scripts/send-invoices-to-parents.js --class=class-1
 * 
 * 3. Gửi riêng cho 1 học sinh cụ thể:
 *    node scripts/send-invoices-to-parents.js --student=HS001
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { getBrowserExecutablePath, renderInvoiceToImage } = require('./render-invoice-card');

// Thư mục lưu phiên đăng nhập Zalo cá nhân của HLV
const ZALO_USER_DATA_DIR = path.join(process.cwd(), 'zalo_user_data');

function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('84')) {
    cleaned = '0' + cleaned.substring(2);
  }
  return cleaned;
}

function sanitizeFileName(name) {
  if (!name) return 'Unknown';
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').trim();
}

/**
 * Lấy danh sách học viên và hóa đơn cần gửi của lớp từ file dữ liệu
 */
function getTargetStudentsForSending(options = {}) {
  const customQueuePath = path.join(__dirname, 'custom_queue.json');
  if (fs.existsSync(customQueuePath)) {
    try {
      const customList = JSON.parse(fs.readFileSync(customQueuePath, 'utf-8'));
      if (Array.isArray(customList) && customList.length > 0) {
        return customList.map((st) => ({
          coachName: st.coachName || 'HLV Kiện Tướng Tương Lai',
          coachPhone: st.coachPhone || '',
          className: st.className || 'Lớp cờ vua',
          classId: st.classId || '',
          branchName: st.branchName || '',
          ...st,
          cleanParentPhone: cleanPhoneNumber(st.parentPhone || st.cleanParentPhone),
        }));
      }
    } catch (e) {}
  }

  const coachDataPath = path.join(__dirname, 'coach_invoices_data.json');
  if (!fs.existsSync(coachDataPath)) {
    // Nếu chưa có, tự động xuất dữ liệu mới
    const { execSync } = require('child_process');
    execSync('node ./node_modules/tsx/dist/cli.mjs scripts/export-coach-invoices.ts', { stdio: 'inherit' });
  }

  const raw = fs.readFileSync(coachDataPath, 'utf-8');
  const coachBundles = JSON.parse(raw);

  let targetStudents = [];

  for (const coach of coachBundles) {
    if (options.coachId && options.coachId !== 'all' && coach.coachId !== options.coachId) {
      continue;
    }

    for (const cls of coach.classes) {
      if (options.classId && options.classId !== 'all' && cls.classId !== options.classId) {
        continue;
      }

      for (const st of cls.students) {
        if (options.studentCode && st.studentCode !== options.studentCode) {
          continue;
        }

        targetStudents.push({
          coachName: coach.coachName,
          coachPhone: coach.coachPhone,
          className: cls.className,
          classId: cls.classId,
          branchName: cls.branchName,
          ...st,
          cleanParentPhone: cleanPhoneNumber(st.parentPhone),
        });
      }
    }
  }

  return targetStudents;
}

/**
 * Đảm bảo file ảnh Thẻ Báo Học Phí của học sinh đã tồn tại, nếu chưa có thì render ngay
 */
async function ensureStudentCardImage(student, browserInstance = null) {
  const folderMonth = `Thang_${student.month}_${student.year}`;
  const classFolder = sanitizeFileName(student.className);
  const outDir = path.join(process.cwd(), 'invoices_output', folderMonth, classFolder);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const fileName = `${student.studentCode}_${sanitizeFileName(student.studentName)}.png`;
  const outPath = path.join(outDir, fileName);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    return outPath;
  }

  // Render ảnh mới
  await renderInvoiceToImage(student, outPath, browserInstance);
  return outPath;
}

/**
 * Tìm kiếm phụ huynh trên Zalo Web và mở cuộc trò chuyện
 */
async function searchAndOpenParentChat(page, phone, parentName) {
  const searchInputSelector = '#contact-search-input';
  await page.waitForSelector(searchInputSelector, { timeout: 10000 });

  // Focus và xóa nội dung cũ
  await page.click(searchInputSelector);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.value = '';
  }, searchInputSelector);

  // Gõ số điện thoại phụ huynh
  await page.type(searchInputSelector, phone, { delay: 60 });
  await new Promise((r) => setTimeout(r, 2000));

  // Click vào kết quả tìm kiếm đầu tiên
  const clicked = await page.evaluate(() => {
    const items = document.querySelectorAll('.conv-item, .contact-item, .friend-item, div[data-id^="conv_"], .search-item');
    if (items && items.length > 0) {
      for (const item of items) {
        if (item.offsetParent !== null) {
          item.click();
          return true;
        }
      }
    }
    return false;
  });

  if (!clicked) {
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Chờ ô chat hiển thị để xác nhận đã mở được chat
  try {
    await page.waitForSelector('#richInput', { timeout: 4500 });
    return true;
  } catch (e) {
    // Nếu tìm bằng SĐT không thấy, thử tìm bằng tên phụ huynh nếu có
    if (parentName) {
      await page.click(searchInputSelector);
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.value = '';
      }, searchInputSelector);
      await page.type(searchInputSelector, parentName, { delay: 60 });
      await new Promise((r) => setTimeout(r, 2000));
      await page.keyboard.press('Enter');
      try {
        await page.waitForSelector('#richInput', { timeout: 4000 });
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }
}

/**
 * Upload và gửi ảnh Thẻ Học Phí vào ô chat Zalo của Phụ Huynh
 */
async function sendInvoiceCardImageToParent(page, imagePath, student) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`File ảnh thẻ học phí không tồn tại: ${imagePath}`);
  }

  // 1. Gửi tin nhắn chào ngắn kèm theo ảnh
  const greetingText = `CLB Cờ vua Kiện Tướng Tương Lai gửi Quý phụ huynh Thẻ Báo Học Phí tháng ${student.month}/${student.year} của em ${student.studentName} (${student.studentCode}).`;
  
  try {
    await page.waitForSelector('#richInput', { timeout: 5000 });
    await page.click('#richInput');
    await page.evaluate((msg) => {
      const el = document.querySelector('#richInput');
      if (!el) return;
      el.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, msg);
    }, greetingText);
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1200));
  } catch (e) {
    // Không bắt buộc gửi lời chào text nếu lỗi
  }

  // 2. Upload file ảnh thẻ học phí chuẩn mẫu mocktest
  const fileInputs = await page.$$('input[type="file"]');
  let targetInput = null;

  for (const input of fileInputs) {
    const accept = await page.evaluate((el) => el.getAttribute('accept') || '', input);
    if (accept.includes('image') || accept === '*' || accept === '') {
      targetInput = input;
      break;
    }
  }

  if (!targetInput && fileInputs.length > 0) {
    targetInput = fileInputs[0];
  }

  if (!targetInput) {
    throw new Error('Không tìm thấy nút đính kèm ảnh trên giao diện chat Zalo.');
  }

  await targetInput.uploadFile(imagePath);
  await new Promise((r) => setTimeout(r, 2500));

  // Kiểm tra popup modal xác nhận gửi ảnh (nếu Zalo hiển thị)
  await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, div[role="button"], .btn-primary, div[data-id="btn_SendMedia"]');
    for (const b of buttons) {
      const txt = (b.innerText || '').trim().toLowerCase();
      if (txt === 'gửi' || txt === 'send' || b.getAttribute('data-id') === 'btn_SendMedia') {
        b.click();
        break;
      }
    }
  });

  await new Promise((r) => setTimeout(r, 2000));
}

/**
 * Tiến trình chính: HLV gửi hàng loạt ảnh thẻ học phí đến từng phụ huynh
 */
async function sendInvoicesToParents(options = {}) {
  const isDryRun = options.dryRun || false;
  const isHeadless = options.headless || false;
  const delaySec = options.delay || 4;

  console.log(`\n================================================================`);
  console.log(`🥋 TOOL HLV GỬI THẺ HỌC PHÍ HÀNG LOẠT ĐẾN PHỤ HUYNH (ZALO BOT)`);
  console.log(`CLB Cờ vua Kiện Tướng Tương Lai (KTTLL)`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Chế độ: ${isDryRun ? '🔍 DRY-RUN (Xem trước, KHÔNG gửi)' : '⚡ LIVE (Tự động gửi thật)'}`);
  console.log(`Bộ lọc lớp: ${options.classId || 'Tất cả các lớp'}`);
  console.log(`Thư mục lưu phiên Zalo cá nhân: ${ZALO_USER_DATA_DIR}`);
  console.log(`================================================================\n`);

  // 1. Lấy danh sách học sinh cần gửi
  const students = getTargetStudentsForSending(options);

  if (students.length === 0) {
    console.log(`❌ Không tìm thấy học viên nào phù hợp với bộ lọc.`);
    return;
  }

  console.log(`📋 Tìm thấy ${students.length} học viên cần gửi Thẻ Báo Học Phí.\n`);

  // 2. Đảm bảo toàn bộ ảnh thẻ học phí đã được render sẵn
  console.log(`🎨 Đang kiểm tra và chuẩn bị ảnh Thẻ Báo Học Phí (chuẩn Retina 2x VietQR)...`);
  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    process.stdout.write(`[${i + 1}/${students.length}] Chuẩn bị thẻ: ${st.studentCode} - ${st.studentName}... `);
    const imgPath = await ensureStudentCardImage(st);
    st.imagePath = imgPath;
    console.log(`✅ ${path.basename(imgPath)}`);
  }

  // 3. Nếu là DRY-RUN: In thông tin và kết thúc (không mở trình duyệt gửi)
  if (isDryRun) {
    console.log(`\n================================================================`);
    console.log(`🔍 [DRY-RUN] DANH SÁCH HỌC VIÊN & PHỤ HUYNH SẼ NHẬN THẺ HỌC PHÍ`);
    console.log(`================================================================\n`);

    students.forEach((st, idx) => {
      console.log(`[${idx + 1}/${students.length}] 🎓 Học viên: ${st.studentName} (${st.studentCode})`);
      console.log(`   👨‍👩‍👧 Phụ huynh: ${st.parentName || 'Chưa cập nhật'} - SĐT: ${st.parentPhone} (Zalo: ${st.cleanParentPhone})`);
      console.log(`   📚 Lớp: ${st.className} (${st.branchName})`);
      console.log(`   💰 Thực học: ${st.presentCount} buổi | Tổng học phí: ${st.totalAmount.toLocaleString('vi-VN')} VNĐ`);
      console.log(`   🖼️  Ảnh thẻ gửi đính kèm: ${st.imagePath}`);
      console.log(`   🔗 Link mở chat Zalo phụ huynh: https://zalo.me/${st.cleanParentPhone}`);
      console.log(`----------------------------------------------------------------`);
    });

    console.log(`\n✨ Tổng cộng: ${students.length} phụ huynh đã sẵn sàng nhận ảnh thẻ học phí.`);
    console.log(`👉 Để HLV gửi thật tự động qua Zalo cá nhân, hãy chạy lệnh:`);
    console.log(`   node scripts/send-invoices-to-parents.js --class=${options.classId || 'class-1'}\n`);
    return;
  }

  // 4. Mở Google Chrome / Edge kết nối Zalo cá nhân của HLV
  const chromePath = getBrowserExecutablePath();
  if (!fs.existsSync(ZALO_USER_DATA_DIR)) {
    fs.mkdirSync(ZALO_USER_DATA_DIR, { recursive: true });
  }

  console.log(`\n🌐 Đang mở trình duyệt Zalo Web: https://chat.zalo.me/ ...`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: isHeadless,
    userDataDir: ZALO_USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,850',
      '--disable-infobars',
    ],
    defaultViewport: null,
  });

  const page = (await browser.pages())[0] || (await browser.newPage());
  await page.goto('https://chat.zalo.me/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 5. Kiểm tra đăng nhập Zalo cá nhân của HLV
  console.log('🔍 Đang kiểm tra phiên đăng nhập Zalo của HLV...');
  let isLoggedIn = false;
  try {
    await page.waitForSelector('#contact-search-input', { timeout: 6000 });
    isLoggedIn = true;
  } catch (e) {
    isLoggedIn = false;
  }

  if (!isLoggedIn) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`📱 CHƯA ĐĂNG NHẬP ZALO CÁ NHÂN CỦA HLV!`);
    console.log(`👉 HLV vui lòng mở ứng dụng Zalo trên điện thoại:`);
    console.log(`   1. Nhấn Quét mã QR ở góc trên app Zalo.`);
    console.log(`   2. Quét mã QR đang hiển thị trên màn hình trình duyệt Chrome vừa mở.`);
    console.log(`   3. Nhấn Xác nhận đăng nhập.`);
    console.log(`⏳ Đang chờ HLV quét mã QR (tối đa 120 giây)...`);
    console.log(`----------------------------------------------------------------\n`);

    try {
      await page.waitForSelector('#contact-search-input', { timeout: 120000 });
      console.log(`✅ HLV đã đăng nhập Zalo thành công! Phiên làm việc đã được lưu vĩnh viễn.`);
    } catch (err) {
      console.error(`❌ Hết thời gian chờ quét QR. Vui lòng chạy lại lệnh.`);
      await browser.close();
      return;
    }
  } else {
    console.log(`✅ Nhận diện phiên đăng nhập Zalo thành công!`);
  }

  // 6. Gửi hàng loạt ảnh thẻ học phí đến từng phụ huynh
  const report = [];

  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    console.log(`\n----------------------------------------------------------------`);
    console.log(`[${i + 1}/${students.length}] 🎓 Gửi học phí: ${st.studentName} (${st.studentCode})`);
    console.log(`👨‍👩‍👧 Phụ huynh: ${st.parentName} | SĐT: ${st.parentPhone} (Zalo: ${st.cleanParentPhone})`);
    console.log(`💰 Số tiền: ${st.totalAmount.toLocaleString('vi-VN')} VNĐ (${st.presentCount} buổi)`);
    console.log(`🖼️  File ảnh: ${path.basename(st.imagePath)}`);

    if (!st.cleanParentPhone) {
      console.log(`⚠️ Bỏ qua: Học viên chưa có số điện thoại phụ huynh.`);
      report.push({
        studentCode: st.studentCode,
        studentName: st.studentName,
        phone: '',
        status: 'SKIPPED_NO_PHONE',
      });
      continue;
    }

    // A. Tìm kiếm phụ huynh trên Zalo
    process.stdout.write(`🔎 Đang tìm phụ huynh trên Zalo (${st.cleanParentPhone})... `);
    const chatOpened = await searchAndOpenParentChat(page, st.cleanParentPhone, st.parentName);

    if (!chatOpened) {
      console.log(`❌ KHÔNG TÌM THẤY phụ huynh trên Zalo.`);
      console.log(`   💡 HLV có thể lưu SĐT ${st.cleanParentPhone} vào danh bạ hoặc nhắn tin trước 1 lần.`);
      report.push({
        studentCode: st.studentCode,
        studentName: st.studentName,
        phone: st.cleanParentPhone,
        status: 'NOT_FOUND_ON_ZALO',
      });
      continue;
    }

    console.log(`✅ Đã mở cuộc trò chuyện!`);

    // B. Gửi ảnh thẻ học phí
    try {
      process.stdout.write(`📎 Đang gửi Thẻ Báo Học Phí dạng ảnh... `);
      await sendInvoiceCardImageToParent(page, st.imagePath, st);
      console.log(`✅ ĐÃ GỬI THÀNH CÔNG!`);

      report.push({
        studentCode: st.studentCode,
        studentName: st.studentName,
        phone: st.cleanParentPhone,
        status: 'SENT_SUCCESS',
        image: path.basename(st.imagePath),
      });
    } catch (sendErr) {
      console.log(`❌ Lỗi gửi ảnh: ${sendErr.message}`);
      report.push({
        studentCode: st.studentCode,
        studentName: st.studentName,
        phone: st.cleanParentPhone,
        status: 'ERROR_SENDING',
        error: sendErr.message,
      });
    }

    // C. Nghỉ ngơi an toàn giữa các phụ huynh (3 - 5s)
    if (i < students.length - 1) {
      console.log(`⏳ Nghỉ ${delaySec}s trước khi gửi phụ huynh tiếp theo để an toàn tài khoản Zalo...`);
      await new Promise((r) => setTimeout(r, delaySec * 1000));
    }
  }

  // 7. Báo cáo kết quả
  console.log(`\n================================================================`);
  console.log(`🏁 TỔNG KẾT TIẾN TRÌNH GỬI HỌC PHÍ ĐẾN PHỤ HUYNH`);
  console.log(`================================================================`);
  let successCount = 0;
  report.forEach((r, idx) => {
    const icon = r.status === 'SENT_SUCCESS' ? '✅' : '⚠️';
    if (r.status === 'SENT_SUCCESS') successCount++;
    console.log(`${idx + 1}. ${icon} ${r.studentCode} - ${r.studentName} (${r.phone}): ${r.status}`);
  });

  console.log(`\n🎉 Thành công: ${successCount}/${students.length} phụ huynh.`);

  const logPath = path.join(__dirname, 'zalo_parent_send_log.json');
  fs.writeFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), report }, null, 2), 'utf-8');
  console.log(`📋 File log: ${logPath}\n`);

  if (!isHeadless) {
    console.log(`💡 Cửa sổ Zalo vẫn đang mở để HLV kiểm tra. HLV có thể đóng cửa sổ bất cứ lúc nào.`);
  } else {
    await browser.close();
  }
}

// Chạy trực tiếp từ CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    headless: args.includes('--headless'),
  };

  args.forEach((arg) => {
    if (arg.startsWith('--class=')) {
      options.classId = arg.split('=')[1];
    } else if (arg.startsWith('--coach=')) {
      options.coachId = arg.split('=')[1];
    } else if (arg.startsWith('--student=')) {
      options.studentCode = arg.split('=')[1];
    } else if (arg.startsWith('--delay=')) {
      options.delay = parseInt(arg.split('=')[1], 10);
    }
  });

  sendInvoicesToParents(options).catch((err) => {
    console.error('❌ Lỗi tiến trình gửi phụ huynh:', err);
    process.exit(1);
  });
}

module.exports = {
  sendInvoicesToParents,
};
