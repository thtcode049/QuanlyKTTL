/**
 * Tool Tự Động Gửi Học Phí Đến Từng Huấn Luyện Viên Qua Zalo Cá Nhân (Puppeteer)
 * CLB Cờ vua Kiện Tướng Tương Lai (KTTLL)
 * 
 * Hướng dẫn sử dụng:
 * 1. Chạy thử nghiệm (Dry-Run - Xem trước không gửi):
 *    node scripts/send-to-coaches.js --dry-run
 * 
 * 2. Gửi thật cho 1 HLV cụ thể:
 *    node scripts/send-to-coaches.js --coach=user-coach-1
 * 
 * 3. Gửi thật cho toàn bộ các HLV:
 *    node scripts/send-to-coaches.js
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { getBrowserExecutablePath } = require('./render-invoice-card');
const { batchGenerateCoachInvoiceCards } = require('./batch-generate-cards');

// Thư mục lưu phiên đăng nhập Zalo cá nhân (Cookies, LocalStorage, Token)
const ZALO_USER_DATA_DIR = path.join(process.cwd(), 'zalo_user_data');

/**
 * Hàm nhập nội dung tin nhắn nhiều dòng + emoji vào ô chat Zalo Web
 */
async function pasteMessageToZalo(page, text) {
  await page.waitForSelector('#richInput', { timeout: 10000 });
  await page.click('#richInput');

  // Đặt nội dung tin nhắn vào ô chat và kích hoạt event
  await page.evaluate((msg) => {
    const el = document.querySelector('#richInput');
    if (!el) return;
    el.focus();
    // Xóa nội dung cũ nếu có
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    // Chèn văn bản giữ nguyên format xuống dòng và emoji
    document.execCommand('insertText', false, msg);
  }, text);

  await new Promise((r) => setTimeout(r, 800));
}

/**
 * Hàm tìm và click kết quả tìm kiếm trên Zalo Web
 */
async function searchAndOpenChat(page, searchQuery) {
  const searchInputSelector = '#contact-search-input';
  await page.waitForSelector(searchInputSelector, { timeout: 10000 });
  
  // Focus và xóa nội dung cũ ô tìm kiếm
  await page.click(searchInputSelector);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.value = '';
  }, searchInputSelector);

  // Gõ số điện thoại hoặc tên
  await page.type(searchInputSelector, searchQuery, { delay: 60 });
  await new Promise((r) => setTimeout(r, 2000));

  // Tìm các kết quả trả về trong danh sách tìm kiếm
  // Selector trên Zalo Web: .conv-item, .contact-item, div[data-id]
  const clicked = await page.evaluate(() => {
    // Ưu tiên kết quả trong danh mục Bạn bè hoặc Tin nhắn
    const items = document.querySelectorAll('.conv-item, .contact-item, .friend-item, div[data-id^="conv_"], .search-item');
    if (items && items.length > 0) {
      for (const item of items) {
        // Tránh click các nút header
        if (item.offsetParent !== null) {
          item.click();
          return true;
        }
      }
    }
    return false;
  });

  if (!clicked) {
    // Thử nhấn phím Enter trên ô tìm kiếm
    await page.keyboard.press('Enter');
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Đợi ô chat xuất hiện để xác nhận đã mở được chat
  try {
    await page.waitForSelector('#richInput', { timeout: 4000 });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Upload danh sách file ảnh thẻ học phí vào khung chat
 */
async function uploadInvoiceImages(page, imagePaths) {
  if (!imagePaths || imagePaths.length === 0) return 0;

  // Tìm tất cả thẻ input file trong giao diện Zalo Web
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
    console.log('   ⚠️ Không tìm thấy nút đính kèm ảnh trên giao diện Zalo.');
    return 0;
  }

  // Upload các file ảnh
  await targetInput.uploadFile(...imagePaths);
  await new Promise((r) => setTimeout(r, 2500));

  // Kiểm tra xem có xuất hiện Modal xác nhận gửi ảnh (nút Gửi / Send) không
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
  return imagePaths.length;
}

/**
 * Chạy tiến trình gửi học phí đến các HLV qua Zalo cá nhân
 */
async function sendInvoicesToCoaches(options = {}) {
  const isDryRun = options.dryRun || false;
  const isHeadless = options.headless || false;
  const targetCoachId = options.coachId || 'all';
  const delaySec = options.delay || 4;

  console.log(`\n================================================================`);
  console.log(`🚀 TOOL GỬI HỌC PHÍ ĐẾN TỪNG HLV QUA ZALO CÁ NHÂN (PUPPETEER)`);
  console.log(`CLB Cờ vua Kiện Tướng Tương Lai (KTTLL)`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Chế độ: ${isDryRun ? '🔍 DRY-RUN (Xem trước, KHÔNG gửi)' : '⚡ LIVE (Gửi thật)'}`);
  console.log(`Mục tiêu: ${targetCoachId === 'all' ? 'Tất cả Huấn luyện viên' : 'HLV ID: ' + targetCoachId}`);
  console.log(`Thư mục Profile Zalo: ${ZALO_USER_DATA_DIR}`);
  console.log(`================================================================\n`);

  // 1. Đọc dữ liệu HLV đã xuất
  const dataPath = path.join(__dirname, 'coach_invoices_data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('⏳ Chưa tìm thấy coach_invoices_data.json, đang xuất dữ liệu mới...');
    const { execSync } = require('child_process');
    execSync('node ./node_modules/tsx/dist/cli.mjs scripts/export-coach-invoices.ts', { stdio: 'inherit' });
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  let coaches = JSON.parse(rawData);

  if (targetCoachId !== 'all') {
    coaches = coaches.filter((c) => c.coachId === targetCoachId || c.cleanPhone === targetCoachId);
  }

  if (coaches.length === 0) {
    console.log(`❌ Không tìm thấy HLV nào phù hợp với bộ lọc: ${targetCoachId}`);
    return;
  }

  // 2. Kiểm tra và render ảnh thẻ học phí nếu chưa đủ
  let missingImages = false;
  for (const c of coaches) {
    for (const st of c.allStudents) {
      if (!st.cardImagePath || !fs.existsSync(st.cardImagePath)) {
        missingImages = true;
        break;
      }
    }
    if (missingImages) break;
  }

  if (missingImages) {
    console.log(`\n🎨 Phát hiện một số thẻ học phí chưa có ảnh. Đang tiến hành vẽ thẻ học phí...`);
    await batchGenerateCoachInvoiceCards({ coachId: targetCoachId });
    // Đọc lại dữ liệu sau khi cập nhật đường dẫn ảnh
    const updatedRaw = fs.readFileSync(dataPath, 'utf-8');
    coaches = JSON.parse(updatedRaw);
    if (targetCoachId !== 'all') {
      coaches = coaches.filter((c) => c.coachId === targetCoachId || c.cleanPhone === targetCoachId);
    }
  }

  // 3. Nếu là DRY-RUN: In chi tiết xem trước và kết thúc (không cần mở trình duyệt Zalo)
  if (isDryRun) {
    console.log(`\n================================================================`);
    console.log(`📋 XEM TRƯỚC NỘI DUNG GỬI ZALO CHO ${coaches.length} HUẤN LUYỆN VIÊN`);
    console.log(`================================================================\n`);

    for (let i = 0; i < coaches.length; i++) {
      const coach = coaches[i];
      console.log(`----------------------------------------------------------------`);
      console.log(`[${i + 1}/${coaches.length}] 👤 Huấn Luyện Viên: ${coach.coachName}`);
      console.log(`📞 Số điện thoại Zalo: ${coach.coachPhone} (Số tìm kiếm: ${coach.cleanPhone})`);
      console.log(`🔗 Link mở nhanh chat Zalo cá nhân: https://zalo.me/${coach.cleanPhone}`);
      console.log(`📚 Quản lý: ${coach.totalClasses} lớp | 👥 ${coach.totalStudents} học sinh | 💰 ${coach.totalTuitionAmount.toLocaleString('vi-VN')} VNĐ`);
      console.log(`----------------------------------------------------------------`);
      console.log(`\n💬 [NỘI DUNG TIN NHẮN SOẠN SẴN GỬI ZALO]:`);
      console.log(coach.zaloSummaryText);
      console.log(`\n📎 [DANH SÁCH FILE ẢNH THẺ HỌC PHÍ ĐÍNH KÈM]:`);
      let imgCount = 0;
      coach.classes.forEach((cls) => {
        cls.students.forEach((st) => {
          if (st.cardImagePath && fs.existsSync(st.cardImagePath)) {
            imgCount++;
            console.log(`   ${imgCount}. [${cls.className}] ${st.studentCode} - ${st.studentName} (${path.basename(st.cardImagePath)})`);
          }
        });
      });
      console.log(`\n✨ Tổng cộng: ${imgCount} ảnh thẻ học phí đã sẵn sàng gửi đính kèm.\n`);
    }

    console.log(`================================================================`);
    console.log(`🎉 KIỂM TRA DRY-RUN HOÀN TẤT THÀNH CÔNG!`);
    console.log(`👉 Để bắt đầu gửi thật qua Zalo cá nhân, hãy chạy lệnh:`);
    console.log(`   node scripts/send-to-coaches.js`);
    console.log(`   (hoặc thêm --coach=user-coach-1 để gửi trước cho 1 HLV)`);
    console.log(`================================================================\n`);
    return;
  }

  // 4. Khởi động Google Chrome / Edge với Zalo Profile (Chế độ Gửi Thật)
  const chromePath = getBrowserExecutablePath();
  if (!fs.existsSync(ZALO_USER_DATA_DIR)) {
    fs.mkdirSync(ZALO_USER_DATA_DIR, { recursive: true });
  }

  console.log(`\n🌐 Đang mở trình duyệt kết nối Zalo Web: https://chat.zalo.me/ ...`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: isHeadless,
    userDataDir: ZALO_USER_DATA_DIR, // Lưu đăng nhập vĩnh viễn
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

  // 5. Kiểm tra trạng thái đăng nhập
  console.log('🔍 Đang kiểm tra trạng thái đăng nhập Zalo...');
  let isLoggedIn = false;
  try {
    await page.waitForSelector('#contact-search-input', { timeout: 6000 });
    isLoggedIn = true;
  } catch (e) {
    isLoggedIn = false;
  }

  if (!isLoggedIn) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`📱 CHƯA ĐĂNG NHẬP ZALO CÁ NHÂN!`);
    console.log(`👉 Vui lòng mở ứng dụng Zalo trên điện thoại:`);
    console.log(`   1. Nhấn biểu tượng Quét mã QR ở góc trên.`);
    console.log(`   2. Quét mã QR đang hiển thị trên cửa sổ trình duyệt Chrome vừa mở.`);
    console.log(`   3. Nhấn Xác nhận đăng nhập trên điện thoại.`);
    console.log(`⏳ Đang chờ bạn quét mã QR (tối đa 120 giây)...`);
    console.log(`----------------------------------------------------------------\n`);

    try {
      await page.waitForSelector('#contact-search-input', { timeout: 120000 });
      console.log(`✅ Đăng nhập Zalo thành công! Phiên đăng nhập đã được lưu.`);
    } catch (err) {
      console.error(`❌ Hết thời gian chờ quét QR. Vui lòng chạy lại lệnh và quét QR kịp thời.`);
      await browser.close();
      return;
    }
  } else {
    console.log(`✅ Đã nhận diện phiên đăng nhập Zalo trước đó!`);
  }

  // 5. Tiến hành gửi đến từng Huấn Luyện Viên
  const report = [];

  for (let i = 0; i < coaches.length; i++) {
    const coach = coaches[i];
    console.log(`\n----------------------------------------------------------------`);
    console.log(`[${i + 1}/${coaches.length}] 👤 Huấn Luyện Viên: ${coach.coachName}`);
    console.log(`📞 Số điện thoại: ${coach.coachPhone} (Chuẩn: ${coach.cleanPhone})`);
    console.log(`📚 Quản lý: ${coach.totalClasses} lớp | 👥 ${coach.totalStudents} học sinh | 💰 ${coach.totalTuitionAmount.toLocaleString('vi-VN')} đ`);

    // Thu thập các ảnh thẻ học phí
    const imagePaths = [];
    coach.classes.forEach((cls) => {
      cls.students.forEach((st) => {
        if (st.cardImagePath && fs.existsSync(st.cardImagePath)) {
          imagePaths.push(st.cardImagePath);
        }
      });
    });

    console.log(`🖼️  Tổng số ảnh thẻ học phí đính kèm: ${imagePaths.length} ảnh`);

    if (isDryRun) {
      console.log(`\n📝 [DRY-RUN NỘI DUNG TIN NHẮN TỔNG HỢP]:\n`);
      console.log(coach.zaloSummaryText);
      console.log(`\n📂 [DRY-RUN DANH SÁCH ẢNH SẼ GỬI]:`);
      imagePaths.forEach((p, idx) => console.log(`   ${idx + 1}. ${path.basename(p)}`));
      console.log(`\n✨ [DRY-RUN] Hoàn thành kiểm tra cho HLV: ${coach.coachName} (Không gửi thật).`);

      report.push({
        coachName: coach.coachName,
        phone: coach.cleanPhone,
        status: 'DRY_RUN_OK',
        imagesCount: imagePaths.length,
      });
      continue;
    }

    // GỬI THẬT
    // A. Tìm kiếm HLV trên Zalo
    process.stdout.write(`🔎 Đang tìm kiếm trên Zalo bằng SĐT ${coach.cleanPhone}... `);
    let chatOpened = await searchAndOpenChat(page, coach.cleanPhone);

    if (!chatOpened) {
      // Thử tìm bằng tên HLV
      process.stdout.write(`Thử tìm bằng tên "${coach.coachName}"... `);
      chatOpened = await searchAndOpenChat(page, coach.coachName);
    }

    if (!chatOpened) {
      console.log(`❌ KHÔNG TÌM THẤY HLV trên Zalo.`);
      console.log(`   💡 Gợi ý: Hãy thêm SĐT ${coach.cleanPhone} vào danh bạ hoặc nhắn tin trước 1 lần trên Zalo để hiển thị.`);
      report.push({
        coachName: coach.coachName,
        phone: coach.cleanPhone,
        status: 'NOT_FOUND',
        imagesCount: 0,
      });
      continue;
    }

    console.log(`✅ Đã mở cuộc trò chuyện!`);

    // B. Gửi tin nhắn text tổng hợp
    process.stdout.write(`✉️ Đang gửi bảng tổng hợp học phí... `);
    await pasteMessageToZalo(page, coach.zaloSummaryText);
    await page.keyboard.press('Enter');
    console.log(`✅ Đã gửi tin nhắn.`);

    await new Promise((r) => setTimeout(r, 1500));

    // C. Gửi các ảnh thẻ học phí
    if (imagePaths.length > 0) {
      process.stdout.write(`📎 Đang tải lên và gửi ${imagePaths.length} ảnh thẻ học phí... `);
      const sentCount = await uploadInvoiceImages(page, imagePaths);
      console.log(`✅ Đã gửi ${sentCount} ảnh thẻ học phí.`);
    }

    report.push({
      coachName: coach.coachName,
      phone: coach.cleanPhone,
      status: 'SENT_SUCCESS',
      imagesCount: imagePaths.length,
    });

    // Nghỉ ngơi an toàn giữa các HLV
    if (i < coaches.length - 1) {
      console.log(`⏳ Nghỉ ${delaySec}s trước khi chuyển sang HLV tiếp theo để an toàn tài khoản...`);
      await new Promise((r) => setTimeout(r, delaySec * 1000));
    }
  }

  // 6. Tổng kết
  console.log(`\n================================================================`);
  console.log(`🏁 BÁO CÁO KẾT QUẢ TIẾN TRÌNH`);
  console.log(`================================================================`);
  report.forEach((r, idx) => {
    const icon = r.status === 'SENT_SUCCESS' ? '✅' : r.status === 'DRY_RUN_OK' ? '🔍' : '⚠️';
    console.log(`${idx + 1}. ${icon} ${r.coachName} (${r.phone}): ${r.status} (${r.imagesCount} ảnh)`);
  });

  const logPath = path.join(__dirname, 'zalo_send_log.json');
  fs.writeFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), report }, null, 2), 'utf-8');
  console.log(`\n📋 Đã ghi file log tại: ${logPath}\n`);

  if (!isHeadless && !isDryRun) {
    console.log(`💡 Trình duyệt vẫn đang mở để bạn kiểm tra kết quả tin nhắn trên Zalo. Bạn có thể đóng cửa sổ bất cứ lúc nào.`);
  } else {
    await browser.close();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    headless: args.includes('--headless'),
  };

  args.forEach((arg) => {
    if (arg.startsWith('--coach=')) {
      options.coachId = arg.split('=')[1];
    } else if (arg.startsWith('--delay=')) {
      options.delay = parseInt(arg.split('=')[1], 10);
    }
  });

  sendInvoicesToCoaches(options).catch((err) => {
    console.error('❌ Lỗi tiến trình gửi Zalo:', err);
    process.exit(1);
  });
}

module.exports = {
  sendInvoicesToCoaches,
};
