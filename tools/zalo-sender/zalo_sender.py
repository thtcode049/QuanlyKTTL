"""
Zalo Bulk Sender - CLB Cờ vua Kiện Tướng Tương Lai (KTTLL)
Gửi Thẻ Báo Học Phí (Dạng ảnh VietQR Napas 24/7) và Tin nhắn Zalo tự động.

Công nghệ: Python, Playwright (Sync API), CustomTkinter (đa luồng).
"""

from __future__ import annotations

import csv
import json
import os
import queue
import random
import re
import sys
import threading
import time
import urllib.parse
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk
from PIL import Image
from playwright.sync_api import Error as PWError
from playwright.sync_api import TimeoutError as PWTimeout
from playwright.sync_api import sync_playwright

# Đường dẫn thư mục làm việc cố định (giúp 1 file exe chạy ở bất kỳ đâu cũng lưu session ổn định)
DATA_DIR = Path.home() / ".kttl_zalo_sender"
DATA_DIR.mkdir(parents=True, exist_ok=True)

PROFILE_DIR = DATA_DIR / "zalo_profile"
CARDS_DIR = DATA_DIR / "cards_output"
LOG_DIR = DATA_DIR / "logs"
CONFIG_FILE = DATA_DIR / "config.json"
ZALO_URL = "https://chat.zalo.me/"

SEL_SEARCH = "input#contact-search-input"
SEL_FRIEND = "div[id^='friend-item-']"
SEL_INPUT = "div#richInput"
MAX_CONSECUTIVE_ERRORS = 3

# ----------------------------------------------------------------------------
# Đăng ký Windows Custom URL Protocol (kttl-zalo://)
# ----------------------------------------------------------------------------
def register_windows_protocol():
    """Đăng ký protocol kttl-zalo:// vào Windows Registry để Web có thể mở tool 1-click."""
    if sys.platform != "win32":
        return
    try:
        import winreg

        exe_path = sys.executable if getattr(sys, "frozen", False) else sys.executable
        script_arg = f' "{Path(__file__).resolve()}"' if not getattr(sys, "frozen", False) else ""
        cmd = f'"{exe_path}"{script_arg} "%1"'

        key_path = r"Software\Classes\kttl-zalo"
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path) as key:
            winreg.SetValueEx(key, "", 0, winreg.REG_SZ, "URL:KTTL Zalo Sender Protocol")
            winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")
            with winreg.CreateKey(key, r"shell\open\command") as cmd_key:
                winreg.SetValueEx(cmd_key, "", 0, winreg.REG_SZ, cmd)
    except Exception:
        pass


# ----------------------------------------------------------------------------
# Xử lý SĐT & Spintax
# ----------------------------------------------------------------------------
PHONE_FIND_RE = re.compile(r"(?<!\d)(?:\+?84|0084|0)?[ .\-]?[35789](?:[ .\-]?\d){8}(?!\d)")
PHONE_NORMAL_RE = re.compile(r"^(?:84|0084|0)?([35789]\d{8})$")
SPIN_RE = re.compile(r"\{([^{}]*)\}")


def normalize_phone(raw: str) -> str | None:
    if not raw:
        return None
    m = PHONE_NORMAL_RE.match(re.sub(r"\D", "", str(raw)))
    return "0" + m.group(1) if m else None


def spin(text: str) -> str:
    while True:
        new = SPIN_RE.sub(lambda m: random.choice(m.group(1).split("|")), text)
        if new == text:
            return new
        text = new


def format_money(val: int | float | None) -> str:
    if val is None:
        return "0 đ"
    return f"{int(val):,}".replace(",", ".") + " đ"


# ----------------------------------------------------------------------------
# Mẫu HTML Thẻ Báo Học Phí (Chuẩn 100% Mocktest KTTLL)
# ----------------------------------------------------------------------------
def build_invoice_html(data: dict) -> str:
    student_name = data.get("studentName", "Học viên")
    student_code = data.get("studentCode", "HS")
    class_name = data.get("className", "Lớp Cờ vua")
    branch_name = data.get("branchName", "CLB Kiện Tướng Tương Lai")
    month = data.get("month", datetime.now().month)
    year = data.get("year", datetime.now().year)
    present_count = data.get("presentCount", 0)
    present_dates = data.get("presentDates") or []
    dates_str = ", ".join(present_dates) if present_dates else "Chưa có buổi học"
    fee_per_session = format_money(data.get("feePerSession", 0))
    total_amount = format_money(data.get("totalAmount", 0))
    bank_name = data.get("bankName", "Ngân hàng TMCP Quân Đội (MBBank)")
    bank_account = data.get("bankAccount", "0987654321")
    account_holder = data.get("accountHolder", "CLB CO VUA KIEN TUONG TUONG LAI")
    transfer_content = data.get("transferContent", f"HP {student_code} T{month}")

    viet_qr_url = data.get("vietQrUrl")
    if not viet_qr_url:
        memo = urllib.parse.quote(transfer_content.strip())
        acc_holder = urllib.parse.quote(account_holder.strip())
        viet_qr_url = f"https://img.vietqr.io/image/MB-0987654321-compact2.png?amount={int(data.get('totalAmount', 0))}&addInfo={memo}&accountName={acc_holder}"

    return f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phiếu Báo Học Phí - {student_name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }}
    .invoice-card {{
      width: 480px;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 10px 35px -5px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.06);
      overflow: hidden;
      position: relative;
    }}
    .brand-stamp {{
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      align-items: center;
    }}
    .brand-logo {{
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #059669;
      color: white;
      font-size: 15px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
    }}
    .card-header {{
      padding: 24px 24px 16px 24px;
      border-bottom: 1px solid #f1f5f9;
    }}
    .badge-month {{
      display: inline-block;
      background: #ecfdf5;
      color: #059669;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 8px;
      text-transform: uppercase;
    }}
    .title {{
      margin-top: 8px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.35;
    }}
    .intro {{
      margin-top: 8px;
      font-size: 12.5px;
      color: #475569;
      line-height: 1.55;
    }}
    .details-table {{
      padding: 16px 24px;
    }}
    .row {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 9px 0;
      border-bottom: 1px solid #f8fafc;
      font-size: 12.5px;
    }}
    .row:last-child {{ border-bottom: none; }}
    .label {{
      color: #64748b;
      font-weight: 500;
      width: 38%;
      flex-shrink: 0;
    }}
    .value {{
      color: #0f172a;
      font-weight: 700;
      text-align: right;
      width: 62%;
      line-height: 1.4;
    }}
    .row-highlight {{
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 12px 14px;
      margin: 8px 0;
      align-items: center;
    }}
    .row-highlight .label {{
      color: #047857;
      font-weight: 700;
      font-size: 13px;
    }}
    .row-highlight .value {{
      color: #059669;
      font-size: 18px;
      font-weight: 800;
    }}
    .syntax-highlight {{
      color: #ea580c;
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }}
    .qr-container {{
      margin: 8px 24px 20px 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
    }}
    .qr-title {{
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }}
    .qr-box {{
      width: 190px;
      height: 190px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 14px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    .qr-box img {{
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
    }}
    .qr-footer-note {{
      margin-top: 10px;
      font-size: 10.5px;
      color: #64748b;
      font-style: italic;
      line-height: 1.45;
    }}
    .card-footer-cta {{
      margin: 0 24px 24px 24px;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff;
      font-size: 12.5px;
      font-weight: 700;
      text-align: center;
      padding: 11px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }}
  </style>
</head>
<body>
  <div class="invoice-card" id="invoiceCard">
    <div class="brand-stamp">
      <div class="brand-logo">♔</div>
    </div>
    <div class="card-header">
      <span class="badge-month">HỌC PHÍ THÁNG {month}/{year}</span>
      <h1 class="title">[KTTLL] THÔNG BÁO HỌC PHÍ THÁNG {month}/{year}</h1>
      <p class="intro">
        Kính gửi phụ huynh em <strong>{student_name}</strong>, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng {month}/{year} theo nguyên tắc <em>Thực học - Thực trả</em>.
      </p>
    </div>
    <div class="details-table">
      <div class="row">
        <span class="label">Học viên:</span>
        <span class="value">{student_name} ({student_code})</span>
      </div>
      <div class="row">
        <span class="label">Lớp học:</span>
        <span class="value">{class_name} – {branch_name}</span>
      </div>
      <div class="row">
        <span class="label">Số buổi thực học:</span>
        <span class="value">{present_count} buổi</span>
      </div>
      <div class="row">
        <span class="label">Các ngày có mặt:</span>
        <span class="value">{dates_str}</span>
      </div>
      <div class="row">
        <span class="label">Đơn giá:</span>
        <span class="value">{fee_per_session}/buổi</span>
      </div>
      <div class="row row-highlight">
        <span class="label">Tổng học phí:</span>
        <span class="value">{total_amount}</span>
      </div>
      <div class="row">
        <span class="label">Ngân hàng:</span>
        <span class="value">{bank_name} – {bank_account}</span>
      </div>
      <div class="row">
        <span class="label">Cú pháp CK:</span>
        <span class="value syntax-highlight">{transfer_content}</span>
      </div>
    </div>
    <div class="qr-container">
      <div class="qr-title">
        <span>⚡ Mã VietQR thanh toán Napas 247</span>
      </div>
      <div class="qr-box">
        <img src="{viet_qr_url}" alt="VietQR" id="qrImg">
      </div>
      <p class="qr-footer-note">Quét mã QR bằng App Ngân Hàng bất kỳ để chuyển khoản tự động chính xác.</p>
    </div>
    <div class="card-footer-cta">
      <span>📱 Quét mã QR bằng App Ngân Hàng để đóng học phí</span>
    </div>
  </div>
</body>
</html>
"""


@dataclass
class SendConfig:
    delay_min: float = 3.0
    delay_max: float = 6.0
    batch_size: int = 35
    batch_pause: float = 30.0
    search_timeout: float = 6.0
    send_greeting_text: bool = True


# ----------------------------------------------------------------------------
# Worker Playwright chạy trong thread riêng
# ----------------------------------------------------------------------------
class ZaloWorker(threading.Thread):
    def __init__(self, emit):
        super().__init__(daemon=True)
        self.emit = emit
        self.cmds: queue.Queue = queue.Queue()
        self.stop_event = threading.Event()
        self.pause_event = threading.Event()
        self.pw = None
        self.ctx = None
        self.page = None
        self._ctx_closed = True

    def submit(self, cmd: str, **kw):
        self.cmds.put((cmd, kw))

    def log(self, text: str, level: str = "info"):
        self.emit("log", (level, text))

    def run(self):
        try:
            with sync_playwright() as pw:
                self.pw = pw
                while True:
                    cmd, kw = self.cmds.get()
                    if cmd == "quit":
                        break
                    self.emit("busy", cmd)
                    try:
                        if cmd == "open":
                            self._ensure_logged_in()
                        elif cmd == "render_card":
                            self._render_single_card(**kw)
                        elif cmd == "send_cards":
                            self._send_cards_batch(**kw)
                        elif cmd == "send_text":
                            self._send_text_batch(**kw)
                    except Exception as e:
                        self.log(f"Lỗi: {e}", "error")
                    finally:
                        self.emit("idle", None)
                self._close()
        except Exception as e:
            self.emit("log", ("error", f"Không khởi động được Playwright: {e}"))

    def _launch(self):
        PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        args = ["--disable-blink-features=AutomationControlled", "--window-size=1280,860"]
        last_err = None
        for channel in ("chrome", "msedge", None):
            try:
                kw = dict(
                    user_data_dir=str(PROFILE_DIR),
                    headless=False,
                    args=args,
                    no_viewport=True,
                    ignore_default_args=["--enable-automation"],
                )
                if channel:
                    kw["channel"] = channel
                ctx = self.pw.chromium.launch_persistent_context(**kw)
                self.log(f"Đã mở trình duyệt: {channel or 'Chromium'}")
                return ctx
            except PWError as e:
                last_err = e
        raise RuntimeError(f"Không mở được trình duyệt: {last_err}")

    def _alive(self) -> bool:
        if self.ctx is None or self._ctx_closed or self.page is None:
            return False
        try:
            return not self.page.is_closed()
        except PWError:
            return False

    def _ensure_page(self):
        if self._alive():
            return
        self._close()
        self.ctx = self._launch()
        self._ctx_closed = False
        self.ctx.on("close", lambda _: self._on_ctx_close())
        self.page = self.ctx.pages[0] if self.ctx.pages else self.ctx.new_page()
        self.page.goto(ZALO_URL, wait_until="domcontentloaded", timeout=60000)

    def _on_ctx_close(self):
        self._ctx_closed = True
        self.emit("login", False)

    def _close(self):
        if self.ctx is not None and not self._ctx_closed:
            try:
                self.ctx.close()
            except PWError:
                pass
        self.ctx = None
        self.page = None
        self._ctx_closed = True

    def _ensure_logged_in(self, timeout: float = 300) -> bool:
        self._ensure_page()
        page = self.page
        if "chat.zalo.me" not in page.url:
            page.goto(ZALO_URL, wait_until="domcontentloaded", timeout=60000)
        self.emit("status", "Đang kiểm tra đăng nhập Zalo...")
        start = time.time()
        hinted = False
        while time.time() - start < timeout:
            if self.stop_event.is_set():
                return False
            try:
                if page.locator(SEL_SEARCH).first.is_visible():
                    self.emit("login", True)
                    self.emit("status", "Đã đăng nhập Zalo")
                    self.log("Đã kết nối Zalo Web thành công!", "ok")
                    return True
            except PWError:
                pass
            if not hinted and time.time() - start > 4:
                hinted = True
                self.log("Chưa đăng nhập: mở app Zalo trên điện thoại -> Quét mã QR trên trình duyệt.", "warn")
                self.emit("status", "Đang chờ quét mã QR...")
            page.wait_for_timeout(1000)
        self.log("Hết thời gian chờ đăng nhập.", "error")
        self.emit("status", "Chưa đăng nhập")
        return False

    def _checkpoint(self) -> bool:
        while self.pause_event.is_set() and not self.stop_event.is_set():
            self.stop_event.wait(0.2)
        return not self.stop_event.is_set()

    def _sleep(self, seconds: float) -> bool:
        end = time.time() + seconds
        while True:
            if self.stop_event.is_set():
                return False
            if self.pause_event.is_set():
                end += 0.2
            rem = end - time.time()
            if rem <= 0:
                return True
            self.stop_event.wait(min(0.2, rem))

    # --- RENDER ẢNH THẺ HỌC PHÍ ---
    def render_card_image(self, item: dict) -> Path:
        CARDS_DIR.mkdir(parents=True, exist_ok=True)
        code = item.get("studentCode", "HS")
        month = item.get("month", datetime.now().month)
        year = item.get("year", datetime.now().year)
        clean_name = re.sub(r"[^\w\d_-]", "_", item.get("studentName", ""))
        img_name = f"{code}_{clean_name}_T{month}_{year}.png"
        out_path = CARDS_DIR / img_name

        if out_path.exists() and out_path.stat().st_size > 15000:
            return out_path

        # Render bằng headless page
        html_code = build_invoice_html(item)
        render_page = self.ctx.new_page(device_scale_factor=2)
        try:
            render_page.set_content(html_code, wait_until="networkidle", timeout=12000)
            card = render_page.locator("#invoiceCard")
            card.screenshot(path=str(out_path))
        finally:
            render_page.close()
        return out_path

    def _render_single_card(self, item: dict):
        try:
            self._ensure_page()
            path = self.render_card_image(item)
            self.emit("card_rendered", {"studentCode": item.get("studentCode"), "path": str(path)})
        except Exception as e:
            self.log(f"Lỗi tạo ảnh cho {item.get('studentName')}: {e}", "error")

    # --- GỬI ẢNH THẺ VÀO ZALO ---
    def _send_card_to_phone(self, item: dict, img_path: Path, cfg: SendConfig):
        phone = item.get("cleanParentPhone") or normalize_phone(item.get("parentPhone", ""))
        if not phone:
            return "NO_PHONE", "Thiếu SĐT"

        page = self.page
        try:
            # 1. Tìm SĐT
            search = page.locator(SEL_SEARCH)
            search.click(timeout=5000)
            search.fill("")
            search.fill(phone)
            page.wait_for_timeout(600)

            # Chờ kết quả đầu tiên
            friend = None
            end_t = time.time() + cfg.search_timeout
            while time.time() < end_t:
                f = page.locator(SEL_FRIEND).first
                if f.count() and f.is_visible():
                    friend = f
                    break
                page.wait_for_timeout(200)

            if not friend:
                search.fill("")
                page.keyboard.press("Escape")
                return "NOT_FOUND", "Không tìm thấy trong bạn bè Zalo"

            friend.click()

            # 2. Chờ khung chat
            chat_input = page.locator(SEL_INPUT)
            chat_input.wait_for(state="visible", timeout=8000)

            # 3. Gửi lời chào ngắn nếu được bật
            if cfg.send_greeting_text:
                st_name = item.get("studentName", "")
                st_code = item.get("studentCode", "")
                month = item.get("month", "")
                year = item.get("year", "")
                msg = f"CLB Cờ vua Kiện Tướng Tương Lai gửi Quý phụ huynh Thẻ Báo Học Phí tháng {month}/{year} của em {student_name} ({st_code})."
                chat_input.click()
                page.keyboard.insert_text(msg)
                page.keyboard.press("Enter")
                page.wait_for_timeout(1000)

            # 4. Upload ảnh thẻ học phí
            # Tìm input type file
            file_input = page.locator("input[type='file']").first
            if not file_input.count():
                return "ERROR", "Không tìm thấy nút gửi ảnh Zalo"

            file_input.set_input_files(str(img_path))
            page.wait_for_timeout(2500)

            # Bấm gửi media nếu có popup xác nhận
            try:
                page.evaluate("""() => {
                    const btns = document.querySelectorAll('button, div[role="button"], .btn-primary, div[data-id="btn_SendMedia"]');
                    for (const b of btns) {
                        const txt = (b.innerText || '').trim().toLowerCase();
                        if (txt === 'gửi' || txt === 'send' || b.getAttribute('data-id') === 'btn_SendMedia') {
                            b.click();
                            break;
                        }
                    }
                }""")
            except Exception:
                pass

            page.wait_for_timeout(1500)
            return "OK", ""
        except PWTimeout as e:
            return "ERROR", f"Timeout: {str(e).splitlines()[0]}"
        except PWError as e:
            return "ERROR", str(e).splitlines()[0]

    def _send_cards_batch(self, items: list[dict], cfg: SendConfig):
        if not self._ensure_logged_in():
            return
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / f"zalo_the_hoc_phi_{datetime.now():%Y%m%d_%H%M%S}.csv"
        total = len(items)
        counts = {"OK": 0, "NOT_FOUND": 0, "ERROR": 0, "NO_PHONE": 0}
        sent_since_break = 0
        consecutive_err = 0

        self.log(f"Bắt đầu gửi {total} Thẻ Báo Học Phí. Nhật ký: {log_path.name}", "info")

        with open(log_path, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(["thoi_gian", "ma_hs", "ten_hs", "sdt", "so_tien", "trang_thai", "chi_tiet"])

            for i, item in enumerate(items, 1):
                if not self._checkpoint():
                    break
                if not self._alive():
                    self.log("Trình duyệt bị đóng, đang mở lại...", "warn")
                    if not self._ensure_logged_in():
                        break

                name = item.get("studentName", "")
                code = item.get("studentCode", "")
                phone = item.get("cleanParentPhone") or normalize_phone(item.get("parentPhone", "")) or ""
                amount = item.get("totalAmount", 0)

                self.emit("status", f"[{i}/{total}] Đang tạo thẻ & gửi cho em {name} ({phone})...")

                # A. Chuẩn bị ảnh
                try:
                    img_path = self.render_card_image(item)
                except Exception as img_err:
                    status, detail = "ERROR", f"Lỗi tạo ảnh: {img_err}"
                    counts["ERROR"] += 1
                    w.writerow([datetime.now().strftime("%H:%M:%S"), code, name, phone, amount, status, detail])
                    f.flush()
                    self.emit("result", {"i": i, "total": total, "phone": phone, "name": name, "status": status, "detail": detail})
                    continue

                # B. Gửi Zalo
                status, detail = self._send_card_to_phone(item, img_path, cfg)
                counts[status] += 1
                w.writerow([datetime.now().strftime("%H:%M:%S"), code, name, phone, amount, status, detail])
                f.flush()
                self.emit("result", {"i": i, "total": total, "phone": phone, "name": name, "status": status, "detail": detail})

                if status == "OK":
                    sent_since_break += 1
                    consecutive_err = 0
                elif status == "ERROR":
                    consecutive_err += 1
                    if consecutive_err >= MAX_CONSECUTIVE_ERRORS:
                        consecutive_err = 0
                        self.pause_event.set()
                        self.emit("paused", True)
                        self.log(f"Lỗi {MAX_CONSECUTIVE_ERRORS} lần liên tiếp -> TẠM DỪNG. Kiểm tra cửa sổ Zalo rồi bấm Tiếp tục.", "error")

                if i == total:
                    break

                # C. Nghỉ chống Captcha
                if cfg.batch_size > 0 and sent_since_break >= cfg.batch_size:
                    sent_since_break = 0
                    self.emit("status", f"Đã gửi {cfg.batch_size} thẻ, nghỉ {cfg.batch_pause:.0f}s chống Captcha...")
                    self.log(f"Nghỉ dài {cfg.batch_pause:.0f}s sau {cfg.batch_size} thẻ.", "warn")
                    if not self._sleep(cfg.batch_pause):
                        break
                else:
                    d = random.uniform(cfg.delay_min, cfg.delay_max)
                    self.emit("status", f"[{i}/{total}] Nghỉ {d:.1f}s...")
                    if not self._sleep(d):
                        break

        stopped = self.stop_event.is_set()
        self.emit("done", {"counts": counts, "log": str(log_path), "stopped": stopped})

    # --- GỬI TIN NHẮN VĂN BẢN THƯỜNG ---
    def _send_text_batch(self, phones: list[str], template: str, cfg: SendConfig):
        if not self._ensure_logged_in():
            return
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / f"zalo_send_text_{datetime.now():%Y%m%d_%H%M%S}.csv"
        total = len(phones)
        counts = {"OK": 0, "NOT_FOUND": 0, "ERROR": 0}
        sent_since_break = 0

        with open(log_path, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(["thoi_gian", "sdt", "trang_thai", "noi_dung"])
            for i, phone in enumerate(phones, 1):
                if not self._checkpoint():
                    break
                page = self.page
                self.emit("status", f"[{i}/{total}] Đang gửi {phone}...")
                msg = spin(template)

                try:
                    search = page.locator(SEL_SEARCH)
                    search.click(timeout=5000)
                    search.fill(phone)
                    page.wait_for_timeout(600)
                    friend = page.locator(SEL_FRIEND).first
                    if not friend.count():
                        search.fill("")
                        page.keyboard.press("Escape")
                        status = "NOT_FOUND"
                    else:
                        friend.click()
                        box = page.locator(SEL_INPUT)
                        box.wait_for(state="visible", timeout=7000)
                        box.click()
                        for k, line in enumerate(msg.split("\n")):
                            if k:
                                page.keyboard.press("Shift+Enter")
                            if line:
                                page.keyboard.insert_text(line)
                        page.keyboard.press("Enter")
                        status = "OK"
                except Exception as e:
                    status = "ERROR"

                counts[status] += 1
                w.writerow([datetime.now().strftime("%H:%M:%S"), phone, status, msg])
                f.flush()
                self.emit("result", {"i": i, "total": total, "phone": phone, "name": "", "status": status, "detail": ""})

                if i < total:
                    d = random.uniform(cfg.delay_min, cfg.delay_max)
                    if not self._sleep(d):
                        break

        self.emit("done", {"counts": counts, "log": str(log_path), "stopped": self.stop_event.is_set()})


# ----------------------------------------------------------------------------
# Giao diện người dùng CustomTkinter
# ----------------------------------------------------------------------------
C_BG = "#0d1117"
C_CARD = "#161b26"
C_BORDER = "#263043"
C_ACCENT = "#0068ff"
C_ACCENT_H = "#1a7dff"
C_OK = "#22c55e"
C_WARN = "#f59e0b"
C_ERR = "#ef4444"
C_MUTED = "#8b98ad"


class App(ctk.CTk):
    def __init__(self, initial_file: str | None = None):
        super().__init__(fg_color=C_BG)
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")
        self.title("Zalo Bulk Sender • CLB Cờ vua Kiện Tướng Tương Lai")
        self.geometry("1240x840")
        self.minsize(1050, 720)

        register_windows_protocol()

        self.ui_q: queue.Queue = queue.Queue()
        self.worker = ZaloWorker(lambda k, p: self.ui_q.put((k, p)))
        self.worker.start()

        self.busy = False
        self.invoice_items: list[dict] = []
        self.selected_item: dict | None = None
        self.preview_image_path: Path | None = None
        self.counts = {"OK": 0, "NOT_FOUND": 0, "ERROR": 0, "NO_PHONE": 0}

        self.f_title = ctk.CTkFont("Segoe UI", 20, "bold")
        self.f_h = ctk.CTkFont("Segoe UI", 13, "bold")
        self.f_body = ctk.CTkFont("Segoe UI", 12)
        self.f_mono = ctk.CTkFont("Consolas", 12)

        self._build_ui()
        self.after(100, self._poll)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

        # Nếu mở kèm file tham số
        if initial_file:
            self.after(500, lambda: self._load_file(initial_file))
        else:
            # Tự kiểm tra xem có file tải mới từ Downloads không
            self.after(1000, self._auto_check_downloads_silent)

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header Bar
        head = ctk.CTkFrame(self, fg_color="transparent")
        head.grid(row=0, column=0, sticky="ew", padx=18, pady=(12, 6))
        ctk.CTkLabel(head, text="⚡ Zalo Bulk Sender", font=self.f_title, text_color="#e6edf7").pack(side="left")
        ctk.CTkLabel(head, text="• Gửi Thẻ Báo Học Phí Tự Động", font=self.f_body, text_color=C_MUTED).pack(side="left", padx=8)

        self.lbl_login = ctk.CTkLabel(head, text="● Chưa kết nối Zalo", font=self.f_h, text_color=C_MUTED)
        self.lbl_login.pack(side="right")

        # Tabview Chính
        self.tabs = ctk.CTkTabview(self, fg_color=C_CARD, corner_radius=14, border_width=1, border_color=C_BORDER)
        self.tabs.grid(row=1, column=0, sticky="nsew", padx=18, pady=6)

        tab_invoices = self.tabs.add("🎓 Gửi Thẻ Báo Học Phí (Thẻ Ảnh + VietQR)")
        tab_text = self.tabs.add("💬 Gửi Tin Nhắn Văn Bản (Spintax)")

        self._build_invoices_tab(tab_invoices)
        self._build_text_tab(tab_text)

        # Thanh điều khiển chung & Tiến trình
        ctl = ctk.CTkFrame(self, fg_color=C_CARD, corner_radius=14, border_width=1, border_color=C_BORDER)
        ctl.grid(row=2, column=0, sticky="ew", padx=18, pady=(4, 8))
        ctl.grid_columnconfigure(5, weight=1)

        self.b_login = ctk.CTkButton(ctl, text="🔐 Mở Zalo / Đăng nhập", command=self._open_zalo,
                                     fg_color="#334155", hover_color="#475569", corner_radius=10, height=36, font=self.f_h)
        self.b_login.grid(row=0, column=0, padx=(12, 6), pady=8)

        self.b_start = ctk.CTkButton(ctl, text="🚀 BẮT ĐẦU GỬI", command=self._start_send,
                                     fg_color=C_ACCENT, hover_color=C_ACCENT_H, corner_radius=10, height=36, font=self.f_h, width=150)
        self.b_start.grid(row=0, column=1, padx=6, pady=8)

        self.b_pause = ctk.CTkButton(ctl, text="⏸ Tạm dừng", command=self._toggle_pause,
                                     fg_color="#b45309", hover_color=C_WARN, corner_radius=10, height=36, font=self.f_h, width=110)
        self.b_pause.grid(row=0, column=2, padx=6, pady=8)

        self.b_stop = ctk.CTkButton(ctl, text="⏹ Dừng", command=self._stop_send,
                                    fg_color="#b91c1c", hover_color=C_ERR, corner_radius=10, height=36, font=self.f_h, width=90)
        self.b_stop.grid(row=0, column=3, padx=6, pady=8)

        self.lbl_stats = ctk.CTkLabel(ctl, text="", font=self.f_h, text_color=C_OK)
        self.lbl_stats.grid(row=0, column=4, padx=12, pady=8)

        # Nút mở thư mục Logs & Thẻ ảnh
        btn_box = ctk.CTkFrame(ctl, fg_color="transparent")
        btn_box.grid(row=0, column=5, sticky="e", padx=12)
        ctk.CTkButton(btn_box, text="📁 Thẻ ảnh", command=lambda: os.startfile(CARDS_DIR) if CARDS_DIR.exists() else None,
                      fg_color="#334155", width=80, height=32, corner_radius=8).pack(side="left", padx=4)
        ctk.CTkButton(btn_box, text="📋 Nhật ký", command=lambda: os.startfile(LOG_DIR) if LOG_DIR.exists() else None,
                      fg_color="#334155", width=80, height=32, corner_radius=8).pack(side="left", padx=4)

        # Progress bar
        self.progress = ctk.CTkProgressBar(ctl, height=8, corner_radius=4, progress_color=C_ACCENT)
        self.progress.grid(row=1, column=0, columnspan=6, sticky="ew", padx=12, pady=(0, 2))
        self.progress.set(0)

        self.lbl_status = ctk.CTkLabel(ctl, text="Sẵn sàng", font=self.f_body, text_color=C_MUTED, anchor="w")
        self.lbl_status.grid(row=2, column=0, columnspan=6, sticky="ew", padx=12, pady=(0, 6))

        # Khung Nhật ký nhanh (Collapsible log)
        log_frame = ctk.CTkFrame(self, fg_color=C_CARD, corner_radius=10, border_width=1, border_color=C_BORDER)
        log_frame.grid(row=3, column=0, sticky="ew", padx=18, pady=(0, 10))
        self.txt_log = ctk.CTkTextbox(log_frame, font=self.f_mono, fg_color=C_BG, height=85, corner_radius=8)
        self.txt_log.pack(fill="both", expand=True, padx=6, pady=6)
        for tag, color in (("info", "#c9d4e5"), ("ok", C_OK), ("warn", C_WARN), ("error", C_ERR)):
            self.txt_log.tag_config(tag, foreground=color)

        self._set_busy(False)

    # ---------- TAB 1: GỬI THẺ BÁO HỌC PHÍ ----------
    def _build_invoices_tab(self, tab):
        tab.grid_columnconfigure(0, weight=6)
        tab.grid_columnconfigure(1, weight=4)
        tab.grid_rowconfigure(1, weight=1)

        # Thanh công cụ nạp file
        toolbar = ctk.CTkFrame(tab, fg_color="transparent")
        toolbar.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 8))

        ctk.CTkButton(toolbar, text="📂 Mở file dữ liệu học phí (.json / .xlsx)", command=self._open_file_dialog,
                      fg_color="#7c3aed", hover_color="#8b5cf6", height=32, corner_radius=8, font=self.f_h).pack(side="left")

        ctk.CTkButton(toolbar, text="⚡ Nhận file mới từ Downloads", command=self._load_latest_download,
                      fg_color="#0f766e", hover_color="#14b8a6", height=32, corner_radius=8, font=self.f_h).pack(side="left", padx=8)

        self.lbl_class_info = ctk.CTkLabel(toolbar, text="Chưa nạp danh sách học sinh nào.", font=self.f_body, text_color=C_MUTED)
        self.lbl_class_info.pack(side="left", padx=8)

        # Cột trái: Danh sách học viên
        left_box = ctk.CTkFrame(tab, fg_color=C_BG, corner_radius=10, border_width=1, border_color=C_BORDER)
        left_box.grid(row=1, column=0, sticky="nsew", padx=(0, 6))
        left_box.grid_columnconfigure(0, weight=1)
        left_box.grid_rowconfigure(0, weight=1)

        self.scroll_students = ctk.CTkScrollableFrame(left_box, fg_color="transparent")
        self.scroll_students.grid(row=0, column=0, sticky="nsew", padx=4, pady=4)

        # Cột phải: Xem trước thẻ ảnh
        right_box = ctk.CTkFrame(tab, fg_color=C_BG, corner_radius=10, border_width=1, border_color=C_BORDER)
        right_box.grid(row=1, column=1, sticky="nsew", padx=(6, 0))
        right_box.grid_columnconfigure(0, weight=1)
        right_box.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(right_box, text="🖼️ Xem trước Thẻ Báo Học Phí", font=self.f_h, text_color="#e6edf7").grid(
            row=0, column=0, sticky="w", padx=12, pady=8)

        self.lbl_preview_img = ctk.CTkLabel(right_box, text="Chọn một học viên bên trái\nđể xem trước thẻ học phí.",
                                           font=self.f_body, text_color=C_MUTED)
        self.lbl_preview_img.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)

        # Nút render thẻ đang chọn
        self.b_render_preview = ctk.CTkButton(right_box, text="🎨 Render ảnh học viên này", command=self._render_current_preview,
                                             fg_color="#334155", hover_color="#475569", height=32, corner_radius=8)
        self.b_render_preview.grid(row=2, column=0, sticky="ew", padx=12, pady=(0, 10))

    # ---------- TAB 2: GỬI TIN NHẮN TEXT (SPINTAX) ----------
    def _build_text_tab(self, tab):
        tab.grid_columnconfigure(0, weight=1)
        tab.grid_columnconfigure(1, weight=1)
        tab.grid_rowconfigure(0, weight=1)

        # Danh sách SĐT
        t_left = ctk.CTkFrame(tab, fg_color=C_BG, corner_radius=10, border_width=1, border_color=C_BORDER)
        t_left.grid(row=0, column=0, sticky="nsew", padx=(0, 6), pady=4)
        t_left.grid_columnconfigure(0, weight=1)
        t_left.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(t_left, text="📱 Danh sách số điện thoại (1 số / dòng):", font=self.f_h).grid(row=0, column=0, sticky="w", padx=10, pady=6)
        self.txt_text_phones = ctk.CTkTextbox(t_left, font=self.f_mono, fg_color=C_CARD)
        self.txt_text_phones.grid(row=1, column=0, sticky="nsew", padx=10, pady=6)

        # Tin nhắn Spintax
        t_right = ctk.CTkFrame(tab, fg_color=C_BG, corner_radius=10, border_width=1, border_color=C_BORDER)
        t_right.grid(row=0, column=1, sticky="nsew", padx=(6, 0), pady=4)
        t_right.grid_columnconfigure(0, weight=1)
        t_right.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(t_right, text="💬 Nội dung tin nhắn (Hỗ trợ Spintax {A|B}):", font=self.f_h).grid(row=0, column=0, sticky="w", padx=10, pady=6)
        self.txt_text_msg = ctk.CTkTextbox(t_right, font=self.f_body, fg_color=C_CARD)
        self.txt_text_msg.grid(row=1, column=0, sticky="nsew", padx=10, pady=6)
        self.txt_text_msg.insert("1.0", "{Chào|Xin chào} Quý phụ huynh,\nCLB Cờ vua Kiện Tướng Tương Lai gửi thông báo...")

    # ---------- Xử lý dữ liệu & Nạp file ----------
    def _open_file_dialog(self):
        path = filedialog.askopenfilename(
            title="Chọn file dữ liệu học phí",
            filetypes=[("Dữ liệu học phí KTTL", "*.json *.xlsx"), ("Tất cả", "*.*")])
        if path:
            self._load_file(path)

    def _auto_check_downloads_silent(self):
        downloads_path = Path.home() / "Downloads"
        if not downloads_path.exists():
            return
        # Tìm file KTTL_TheHocPhi_*.json tạo trong 30 phút gần nhất
        now = time.time()
        files = list(downloads_path.glob("KTTL_TheHocPhi_*.json")) + list(downloads_path.glob("kttl_invoices_*.json"))
        recent = [f for f in files if (now - f.stat().st_mtime) < 1800]
        if recent:
            recent.sort(key=lambda f: f.stat().st_mtime, reverse=True)
            target = recent[0]
            self.log(f"Phát hiện file học phí mới tải về: {target.name}", "info")
            self._load_file(str(target))

    def _load_latest_download(self):
        downloads_path = Path.home() / "Downloads"
        files = list(downloads_path.glob("KTTL_TheHocPhi_*.json")) + list(downloads_path.glob("kttl_invoices_*.json")) + list(downloads_path.glob("*.json"))
        if not files:
            messagebox.showinfo("Thông báo", "Không tìm thấy file học phí nào trong thư mục Downloads.")
            return
        files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        self._load_file(str(files[0]))

    def _load_file(self, file_path_str: str):
        # Nếu là URI protocol: kttl-zalo://open?file=...
        if file_path_str.startswith("kttl-zalo://"):
            parsed = urllib.parse.urlparse(file_path_str)
            params = urllib.parse.parse_qs(parsed.query)
            if "file" in params:
                file_path_str = urllib.parse.unquote(params["file"][0])
            else:
                return

        p = Path(file_path_str)
        if not p.exists():
            self.log(f"File không tồn tại: {p}", "error")
            return

        try:
            content = p.read_text(encoding="utf-8")
            data = json.loads(content)
        except Exception as e:
            self.log(f"Lỗi đọc file JSON: {e}", "error")
            return

        students = []
        if isinstance(data, list):
            students = data
        elif isinstance(data, dict):
            students = data.get("students") or data.get("customStudents") or []

        if not students:
            messagebox.showwarning("Dữ liệu rỗng", "File không chứa danh sách học sinh.")
            return

        self.invoice_items = students
        cls_name = students[0].get("className", "")
        m = students[0].get("month", "")
        y = students[0].get("year", "")
        info_str = f"Lớp: {cls_name} • Tháng {m}/{y} • Tổng {len(students)} học viên"
        self.lbl_class_info.configure(text=info_str, text_color=C_OK)
        self.log(f"Đã nạp {len(students)} học viên từ {p.name}", "ok")

        self._render_students_list()
        if students:
            self._select_student(students[0])

    def _render_students_list(self):
        for w in self.scroll_students.winfo_children():
            w.destroy()

        for item in self.invoice_items:
            f = ctk.CTkFrame(self.scroll_students, fg_color=C_CARD, corner_radius=8, border_width=1, border_color=C_BORDER)
            f.pack(fill="x", padx=2, pady=3)

            name = item.get("studentName", "")
            code = item.get("studentCode", "")
            phone = item.get("parentPhone", "")
            amount = format_money(item.get("totalAmount", 0))
            count = item.get("presentCount", 0)

            # Left badge
            badge = ctk.CTkLabel(f, text=code, font=self.f_h, width=50, fg_color="#1e293b", corner_radius=6)
            badge.pack(side="left", padx=8, pady=8)

            # Center info
            info = ctk.CTkFrame(f, fg_color="transparent")
            info.pack(side="left", fill="x", expand=True, padx=4)
            ctk.CTkLabel(info, text=f"{name}  •  {phone}", font=self.f_h, text_color="#f8fafc", anchor="w").pack(fill="x")
            ctk.CTkLabel(info, text=f"Thực học: {count} buổi  |  Học phí: {amount}", font=self.f_body, text_color=C_MUTED, anchor="w").pack(fill="x")

            # Click handler
            f.bind("<Button-1>", lambda e, it=item: self._select_student(it))
            for child in (badge, info):
                child.bind("<Button-1>", lambda e, it=item: self._select_student(it))

    def _select_student(self, item: dict):
        self.selected_item = item
        code = item.get("studentCode", "")
        name = item.get("studentName", "")
        clean_name = re.sub(r"[^\w\d_-]", "_", name)
        m = item.get("month", "")
        y = item.get("year", "")
        expected_path = CARDS_DIR / f"{code}_{clean_name}_T{m}_{y}.png"

        if expected_path.exists():
            self._display_preview_image(expected_path)
        else:
            self.lbl_preview_img.configure(image="", text=f"Em: {name} ({code})\nChưa tạo ảnh thẻ học phí.\nBấm nút bên dưới để render ảnh xem trước.")

    def _display_preview_image(self, path: Path):
        try:
            pil_img = Image.open(path)
            # Resize hiển thị vừa khung
            w, h = pil_img.size
            ratio = min(360 / w, 520 / h)
            disp_size = (int(w * ratio), int(h * ratio))
            ctk_img = ctk.CTkImage(light_image=pil_img, dark_image=pil_img, size=disp_size)
            self.lbl_preview_img.configure(image=ctk_img, text="")
            self.lbl_preview_img.image = ctk_img
        except Exception as e:
            self.lbl_preview_img.configure(image="", text=f"Lỗi hiển thị ảnh: {e}")

    def _render_current_preview(self):
        if not self.selected_item:
            messagebox.showinfo("Chưa chọn học viên", "Hãy chọn một học sinh bên danh sách trái.")
            return
        self.log(f"Đang render ảnh xem trước: {self.selected_item.get('studentName')}...", "info")
        self.worker.submit("render_card", item=self.selected_item)

    # ---------- Hành động gửi ----------
    def _open_zalo(self):
        self.worker.stop_event.clear()
        self._set_busy(True)
        self.worker.submit("open")

    def _start_send(self):
        curr_tab = self.tabs.get()
        cfg = SendConfig(delay_min=3.0, delay_max=6.0, batch_size=35, batch_pause=30.0)

        if "Gửi Thẻ Báo Học Phí" in curr_tab:
            if not self.invoice_items:
                messagebox.showwarning("Thiếu dữ liệu", "Chưa có danh sách học sinh. Hãy nạp file từ Web hoặc Downloads.")
                return
            if not messagebox.askyesno("Xác nhận gửi", f"Gửi Thẻ Báo Học Phí dạng ảnh cho {len(self.invoice_items)} phụ huynh?"):
                return
            self._set_busy(True)
            self.worker.stop_event.clear()
            self.worker.pause_event.clear()
            self.worker.submit("send_cards", items=self.invoice_items, cfg=cfg)
        else:
            phones_text = self.txt_text_phones.get("1.0", "end")
            phones, _, _ = parse_phones(phones_text)
            if not phones:
                messagebox.showwarning("Thiếu SĐT", "Chưa nhập số điện thoại hợp lệ nào.")
                return
            tpl = self.txt_text_msg.get("1.0", "end").strip()
            if not tpl:
                messagebox.showwarning("Thiếu nội dung", "Chưa nhập nội dung tin nhắn.")
                return
            if not messagebox.askyesno("Xác nhận gửi", f"Gửi tin nhắn cho {len(phones)} số điện thoại?"):
                return
            self._set_busy(True)
            self.worker.stop_event.clear()
            self.worker.pause_event.clear()
            self.worker.submit("send_text", phones=phones, template=tpl, cfg=cfg)

    def _toggle_pause(self):
        if self.worker.pause_event.is_set():
            self.worker.pause_event.clear()
            self.b_pause.configure(text="⏸ Tạm dừng")
            self.log("Tiếp tục gửi.", "info")
        else:
            self.worker.pause_event.set()
            self.b_pause.configure(text="▶ Tiếp tục")
            self.log("Đã tạm dừng.", "warn")

    def _stop_send(self):
        self.worker.stop_event.set()
        self.worker.pause_event.clear()
        self.lbl_status.configure(text="Đang dừng...")

    def _set_busy(self, busy: bool):
        self.busy = busy
        self.b_start.configure(state="disabled" if busy else "normal")
        self.b_login.configure(state="disabled" if busy else "normal")
        self.b_pause.configure(state="normal" if busy else "disabled", text="⏸ Tạm dừng")
        self.b_stop.configure(state="normal" if busy else "disabled")

    def log(self, text: str, level: str = "info"):
        self.txt_log.configure(state="normal")
        self.txt_log.insert("end", f"[{datetime.now():%H:%M:%S}] {text}\n", level)
        self.txt_log.see("end")
        self.txt_log.configure(state="disabled")

    def _poll(self):
        try:
            while True:
                kind, p = self.ui_q.get_nowait()
                if kind == "log":
                    self.log(p[1], p[0])
                elif kind == "status":
                    self.lbl_status.configure(text=p)
                elif kind == "busy":
                    self._set_busy(True)
                elif kind == "idle":
                    self._set_busy(False)
                elif kind == "paused":
                    self.b_pause.configure(text="▶ Tiếp tục")
                elif kind == "login":
                    self.lbl_login.configure(text="● Đã đăng nhập Zalo" if p else "● Chưa kết nối Zalo",
                                             text_color=C_OK if p else C_MUTED)
                elif kind == "card_rendered":
                    if self.selected_item and self.selected_item.get("studentCode") == p.get("studentCode"):
                        self._display_preview_image(Path(p.get("path")))
                elif kind == "result":
                    i, total = p["i"], p["total"]
                    self.progress.set(i / total)
                    st = p["status"]
                    self.log(f"[{i}/{total}] {p['name']} ({p['phone']}): {st} {p['detail']}", "ok" if st == "OK" else "warn")
                elif kind == "done":
                    c = p["counts"]
                    head = "⏹ ĐÃ DỪNG" if p["stopped"] else "🏁 HOÀN TẤT"
                    self.log(f"{head}: Thành công {c.get('OK', 0)} • Lỗi/Không tìm thấy {c.get('NOT_FOUND', 0) + c.get('ERROR', 0)}", "ok")
                    self.lbl_status.configure(text="Tiến trình đã hoàn thành.")
        except queue.Empty:
            pass
        self.after(100, self._poll)

    def _on_close(self):
        if self.busy and not messagebox.askyesno("Thoát", "Đang gửi dữ liệu. Dừng và thoát?"):
            return
        self.worker.stop_event.set()
        self.worker.submit("quit")
        self.destroy()


def parse_phones(text: str) -> tuple[list[str], list[str], int]:
    phones: list[str] = []
    seen: set[str] = set()
    invalid: list[str] = []
    dup = 0
    for line in text.splitlines():
        if not line.strip():
            continue
        found = PHONE_FIND_RE.findall(line)
        for raw in found:
            p = normalize_phone(raw)
            if not p:
                invalid.append(raw)
            elif p in seen:
                dup += 1
            else:
                seen.add(p)
                phones.append(p)
    return phones, invalid, dup


def main():
    initial_file = None
    if len(sys.argv) > 1:
        initial_file = sys.argv[1]
    App(initial_file).mainloop()


if __name__ == "__main__":
    main()
