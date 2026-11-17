"""
Zalo Bulk Sender - CLB Cờ vua Kiện Tướng Tương Lai (KTTL)
Gửi Thẻ Báo Học Phí (Dạng ảnh VietQR Napas 24/7) và Tin nhắn Zalo tự động.

Công nghệ: Python, Playwright (Sync API), CustomTkinter (đa luồng).
"""

from __future__ import annotations

import base64
import csv
import hashlib
import html
import json
import os
import queue
import random
import re
import shutil
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


def copy_image_to_windows_clipboard(image_path: Path | str) -> bool:
    """Đưa file ảnh vào Windows System Clipboard dưới định dạng CF_DIB (DIB) để paste trực tiếp vào Zalo."""
    if sys.platform != "win32":
        return False
    try:
        import io
        import ctypes
        from PIL import Image

        image = Image.open(str(image_path))
        output = io.BytesIO()
        image.convert("RGB").save(output, "BMP")
        data = output.getvalue()[14:]  # Bỏ 14 byte BMP header để thành định dạng DIB tiêu chuẩn
        output.close()

        kernel32 = ctypes.windll.kernel32
        user32 = ctypes.windll.user32

        kernel32.GlobalAlloc.restype = ctypes.c_void_p
        kernel32.GlobalAlloc.argtypes = [ctypes.c_uint, ctypes.c_size_t]
        kernel32.GlobalLock.restype = ctypes.c_void_p
        kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
        kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]
        user32.OpenClipboard.argtypes = [ctypes.c_void_p]
        user32.SetClipboardData.restype = ctypes.c_void_p
        user32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]

        if not user32.OpenClipboard(None):
            return False
        try:
            user32.EmptyClipboard()
            hMem = kernel32.GlobalAlloc(0x0042, len(data))  # GMEM_MOVEABLE | GMEM_ZEROINIT
            if not hMem:
                return False
            pMem = kernel32.GlobalLock(hMem)
            if not pMem:
                return False
            ctypes.memmove(pMem, data, len(data))
            kernel32.GlobalUnlock(hMem)
            res = user32.SetClipboardData(8, hMem)  # CF_DIB = 8
            return bool(res)
        finally:
            user32.CloseClipboard()
    except Exception:
        return False


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


def has_valid_phone(item: dict) -> bool:
    """Kiểm tra học viên đã có SĐT phụ huynh hợp lệ để gửi tự động chưa."""
    clean = re.sub(r"\D", "", str(item.get("cleanParentPhone") or ""))
    if len(clean) >= 9 and normalize_phone(clean):
        return True
    return normalize_phone(item.get("parentPhone", "")) is not None


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


def get_card_image_path(item: dict) -> Path:
    """Tạo đường dẫn ảnh thẻ kèm mã hash nội dung để tự động render lại nếu học phí hoặc danh sách lớp thay đổi."""
    code = item.get("studentCode", "HS")
    month = item.get("month", datetime.now().month)
    year = item.get("year", datetime.now().year)
    clean_name = re.sub(r"[^\w\d_-]", "_", item.get("studentName", ""))
    payload_key = json.dumps(
        {
            "c": code,
            "n": item.get("studentName", ""),
            "m": month,
            "y": year,
            "t": item.get("totalAmount", 0),
            "p": item.get("presentCount", 0),
            "d": item.get("presentDates", []),
            "cl": item.get("classList", []),
            "sr": item.get("surcharges", []),
            "ct": item.get("customTitle", ""),
            "tc": item.get("transferContent", ""),
            "qr": item.get("vietQrUrl", ""),
        },
        sort_keys=True,
        ensure_ascii=False,
    )
    digest = hashlib.md5(payload_key.encode("utf-8")).hexdigest()[:8]
    return CARDS_DIR / f"{code}_{clean_name}_T{month}_{year}_{digest}.png"


# ----------------------------------------------------------------------------
# Mẫu HTML Thẻ Báo Học Phí (Chuẩn 100% Hệ Thống KTTL - Hỗ trợ nhiều lớp & phụ phí)
# ----------------------------------------------------------------------------
def build_invoice_html(data: dict) -> str:
    student_name = data.get("studentName", "Học viên")
    student_code = data.get("studentCode", "HS")
    custom_title = data.get("customTitle")
    month = data.get("month", datetime.now().month)
    year = data.get("year", datetime.now().year)

    # Lọc bỏ hoàn toàn các lớp 0 buổi khỏi phiếu thu
    raw_class_list = data.get("classList") or []
    active_classes = [c for c in raw_class_list if (c.get("presentCount") or 0) > 0]
    has_multiple_classes = len(active_classes) > 1

    if len(active_classes) == 1:
        single_cls = active_classes[0]
        class_name = single_cls.get("className") or data.get("className", "Lớp Cờ vua")
        branch_name = (single_cls.get("branchName") or data.get("branchName") or "CLB Kiện Tướng Tương Lai")
        present_count = single_cls.get("presentCount", data.get("presentCount", 0))
        present_dates = single_cls.get("presentDates") or data.get("presentDates") or []
        fee_per_session_raw = single_cls.get("feePerSession", data.get("feePerSession", 0))
    else:
        class_name = data.get("className", "Lớp Cờ vua")
        branch_name = data.get("branchName", "CLB Kiện Tướng Tương Lai")
        present_count = data.get("presentCount", 0)
        present_dates = data.get("presentDates") or []
        fee_per_session_raw = data.get("feePerSession", 0)

    branch_name = str(branch_name).replace("Lớp riêng của HLV (Dạy kèm / Gia sư / Online)", "Lớp riêng của HLV").strip()
    dates_str = ", ".join(present_dates) if present_dates else "Chưa có buổi học"
    fee_per_session = format_money(fee_per_session_raw)

    surcharges = [s for s in (data.get("surcharges") or []) if (s.get("amount") or 0) > 0]
    surcharge_amount_raw = data.get("surchargeAmount")
    if surcharge_amount_raw is None:
        surcharge_amount_raw = sum(float(s.get("amount") or 0) for s in surcharges)
    tuition_amount_raw = data.get("tuitionAmount")
    if tuition_amount_raw is None:
        tuition_amount_raw = max(0.0, float(data.get("totalAmount") or 0) - float(surcharge_amount_raw or 0))

    total_amount = format_money(data.get("totalAmount", 0))
    tuition_amount = format_money(tuition_amount_raw)
    bank_name = data.get("bankName", "Ngân hàng TMCP Quân Đội (MBBank)")
    bank_account = data.get("bankAccount", "0987654321")
    account_holder = data.get("accountHolder", "CLB CO VUA KIEN TUONG TUONG LAI")
    transfer_content = data.get("transferContent", f"HP {student_code} T{month}")

    viet_qr_url = data.get("vietQrUrl")
    if not viet_qr_url:
        memo = urllib.parse.quote(transfer_content.strip())
        acc_holder = urllib.parse.quote(account_holder.strip())
        viet_qr_url = f"https://img.vietqr.io/image/MB-0987654321-compact2.png?amount={int(data.get('totalAmount', 0))}&addInfo={memo}&accountName={acc_holder}"

    # Render phần chi tiết lớp học (1 lớp vs nhiều lớp)
    if has_multiple_classes:
        class_boxes = []
        for idx, cls_item in enumerate(active_classes, 1):
            c_name = html.escape(str(cls_item.get("className", "Lớp học")))
            b_name = str(cls_item.get("branchName") or "").replace("Lớp riêng của HLV (Dạy kèm / Gia sư / Online)", "Lớp riêng của HLV").strip()
            c_title = f"{idx}. {c_name}" + (f" ({html.escape(b_name)})" if b_name else "")
            c_present = int(cls_item.get("presentCount") or 0)
            c_fee = format_money(cls_item.get("feePerSession", 0))
            c_total = format_money(cls_item.get("totalAmount", 0))
            c_dates = cls_item.get("presentDates") or []
            dates_html = f'<span class="class-dates">Ngày: {html.escape(", ".join(c_dates))}</span>' if c_dates else ""
            class_boxes.append(f"""
            <div class="class-card">
              <div class="class-card-top">
                <span class="class-card-name">{c_title}</span>
                <span class="class-card-amount">{c_total}</span>
              </div>
              <div class="class-card-sub">
                <span>{c_present} buổi &times; {c_fee}/b</span>
                {dates_html}
              </div>
            </div>""")
        total_sessions_sum = sum(int(c.get("presentCount") or 0) for c in active_classes)
        class_details_html = f"""
        <div class="multi-class-section">
          <div class="section-heading">Chi tiết các lớp học ({len(active_classes)} lớp):</div>
          {"".join(class_boxes)}
        </div>
        <div class="row">
          <span class="label">Tổng số buổi học:</span>
          <span class="value">{total_sessions_sum} buổi</span>
        </div>"""
    else:
        class_display = f"{html.escape(str(class_name))} &ndash; {html.escape(branch_name)}" if branch_name else html.escape(str(class_name))
        class_details_html = f"""
        <div class="row">
          <span class="label">Lớp học:</span>
          <span class="value">{class_display}</span>
        </div>
        <div class="row">
          <span class="label">Số buổi thực học:</span>
          <span class="value">{present_count} buổi</span>
        </div>
        <div class="row">
          <span class="label">Các ngày có mặt:</span>
          <span class="value">{html.escape(dates_str)}</span>
        </div>
        <div class="row">
          <span class="label">Đơn giá:</span>
          <span class="value">{fee_per_session}/buổi</span>
        </div>"""

    # Render phần phụ phí (nếu có)
    surcharge_html = ""
    if surcharges:
        surcharge_rows = []
        for sr in surcharges:
            sr_title = html.escape(str(sr.get("title") or "Phụ phí khác"))
            sr_date = str(sr.get("date") or "").strip()
            sr_date_str = ""
            if sr_date:
                try:
                    dt = datetime.fromisoformat(sr_date[:10])
                    sr_date_str = f" ({dt.day}/{dt.month})"
                except Exception:
                    sr_date_str = f" ({html.escape(sr_date)})"
            sr_amt = format_money(sr.get("amount", 0))
            surcharge_rows.append(f"""
            <div class="surcharge-row">
              <span class="surcharge-name">&bull; {sr_title}{sr_date_str}</span>
              <span class="surcharge-amt">+{sr_amt}</span>
            </div>""")
        surcharge_html = f"""
        <div class="row">
          <span class="label">Tiền học phí:</span>
          <span class="value">{tuition_amount}</span>
        </div>
        <div class="surcharge-box">
          <div class="surcharge-title">Chi tiết các khoản phụ phí ({len(surcharges)} khoản):</div>
          {"".join(surcharge_rows)}
        </div>"""

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
      width: 650px;
      background: #ffffff;
      border-radius: 28px;
      box-shadow: 0 12px 40px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.08);
      overflow: hidden;
      position: relative;
    }}
    .brand-stamp {{
      position: absolute;
      top: 26px;
      right: 28px;
      display: flex;
      align-items: center;
    }}
    .brand-logo {{
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #059669;
      color: white;
      font-size: 20px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(5, 150, 105, 0.35);
    }}
    .card-header {{
      padding: 30px 32px 20px 32px;
      border-bottom: 1px solid #f1f5f9;
    }}
    .badge-month {{
      display: inline-block;
      background: #ecfdf5;
      color: #059669;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
      padding: 5px 12px;
      border-radius: 10px;
      text-transform: uppercase;
    }}
    .title {{
      margin-top: 10px;
      font-size: 21px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.35;
    }}
    .intro {{
      margin-top: 10px;
      font-size: 15px;
      color: #475569;
      line-height: 1.6;
    }}
    .details-table {{
      padding: 20px 32px;
    }}
    .row {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 11px 0;
      border-bottom: 1px solid #f8fafc;
      font-size: 15px;
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
      line-height: 1.45;
    }}
    .row-highlight {{
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 14px;
      padding: 15px 18px;
      margin: 10px 0;
      align-items: center;
    }}
    .row-highlight .label {{
      color: #047857;
      font-weight: 700;
      font-size: 16px;
    }}
    .row-highlight .value {{
      color: #059669;
      font-size: 24px;
      font-weight: 900;
    }}
    .syntax-highlight {{
      color: #ea580c;
      font-family: monospace;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }}
    .multi-class-section {{
      padding: 10px 0 4px 0;
    }}
    .section-heading {{
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 8px;
    }}
    .class-card {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 8px;
    }}
    .class-card-top {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }}
    .class-card-name {{
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }}
    .class-card-amount {{
      font-size: 14px;
      font-weight: 800;
      color: #059669;
      flex-shrink: 0;
    }}
    .class-card-sub {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      font-size: 12.5px;
      color: #64748b;
    }}
    .class-dates {{
      color: #94a3b8;
    }}
    .surcharge-box {{
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      padding: 10px 14px;
      margin: 8px 0;
    }}
    .surcharge-title {{
      font-size: 13px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 6px;
    }}
    .surcharge-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      padding: 2px 0;
      color: #78350f;
    }}
    .surcharge-amt {{
      font-weight: 700;
      color: #d97706;
    }}
    .qr-container {{
      margin: 10px 32px 24px 32px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 22px;
      text-align: center;
    }}
    .qr-title {{
      font-size: 14.5px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }}
    .qr-box {{
      width: 250px;
      height: 250px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 18px;
      padding: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    .qr-box img {{
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 10px;
    }}
    .qr-footer-note {{
      margin-top: 12px;
      font-size: 13px;
      color: #64748b;
      font-style: italic;
      line-height: 1.45;
    }}
    .card-footer-cta {{
      margin: 0 32px 32px 32px;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      text-align: center;
      padding: 14px;
      border-radius: 14px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
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
      <h1 class="title">{html.escape(str(custom_title)) if custom_title else f"[KTTL] THÔNG BÁO HỌC PHÍ THÁNG {month}/{year}"}</h1>
      <p class="intro">
        Kính gửi phụ huynh em <strong>{html.escape(str(student_name))}</strong>, CLB Cờ vua Kiện Tướng Tương Lai xin gửi bảng tổng kết học phí tháng {month}/{year} theo nguyên tắc <em>Thực học - Thực trả</em>.
      </p>
    </div>
    <div class="details-table">
      <div class="row">
        <span class="label">Học viên:</span>
        <span class="value">{html.escape(str(student_name))}</span>
      </div>
      {class_details_html}
      {surcharge_html}
      <div class="row row-highlight">
        <span class="label">Tổng tiền phải nộp:</span>
        <span class="value">{total_amount}</span>
      </div>
      <div class="row">
        <span class="label">Ngân hàng:</span>
        <span class="value">{html.escape(str(bank_name))} &ndash; {html.escape(str(bank_account))}</span>
      </div>
      <div class="row">
        <span class="label">Cú pháp CK:</span>
        <span class="value syntax-highlight">{html.escape(str(transfer_content))}</span>
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
                        elif cmd == "export_cards":
                            self._export_cards_batch(**kw)
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
                    permissions=["clipboard-read", "clipboard-write"],
                )
                if channel:
                    kw["channel"] = channel
                ctx = self.pw.chromium.launch_persistent_context(**kw)
                try:
                    ctx.grant_permissions(["clipboard-read", "clipboard-write"], origin="https://chat.zalo.me")
                except Exception:
                    pass
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
        out_path = get_card_image_path(item)

        # Nếu đã có ảnh đúng mã hash nội dung và độ phân giải cao (>= 1200px width), tái sử dụng
        if out_path.exists():
            try:
                with Image.open(out_path) as im:
                    if im.width >= 1200:
                        return out_path
            except Exception:
                pass

        html_code = build_invoice_html(item)
        render_ctx = None
        render_page = None
        temp_browser = None
        try:
            # Tạo trang render với device_scale_factor=2 để ảnh sắc nét chuẩn Retina (1300px), không bị vỡ trên điện thoại
            for ch in ("msedge", "chrome", None):
                try:
                    temp_browser = self.pw.chromium.launch(headless=True, channel=ch)
                    render_ctx = temp_browser.new_context(device_scale_factor=2)
                    render_page = render_ctx.new_page()
                    break
                except Exception:
                    continue

            if render_page is None:
                # Fallback dùng context hiện tại nếu không mở được browser phụ
                render_page = self.ctx.new_page()

            render_page.set_viewport_size({"width": 800, "height": 1400})
            render_page.set_content(html_code, wait_until="load", timeout=15000)
            render_page.wait_for_timeout(1200)  # Chờ font Google Fonts và ảnh QR load hoàn tất
            card = render_page.locator("#invoiceCard")
            card.wait_for(state="visible", timeout=8000)
            card.screenshot(path=str(out_path))
        finally:
            if render_page:
                try:
                    render_page.close()
                except Exception:
                    pass
            if render_ctx:
                try:
                    render_ctx.close()
                except Exception:
                    pass
            if temp_browser:
                try:
                    temp_browser.close()
                except Exception:
                    pass
        return out_path

    def _render_single_card(self, item: dict):
        try:
            path = self.render_card_image(item)
            self.emit("card_rendered", {"studentCode": item.get("studentCode"), "path": str(path)})
        except Exception as e:
            self.log(f"Lỗi tạo ảnh cho {item.get('studentName')}: {e}", "error")

    def _export_cards_batch(self, items: list[dict], dest_dir: str):
        dest = Path(dest_dir)
        dest.mkdir(parents=True, exist_ok=True)
        total = len(items)
        saved_paths: list[str] = []
        for idx, item in enumerate(items, 1):
            if self.stop_event.is_set():
                break
            name = item.get("studentName", "HocVien")
            code = item.get("studentCode", "HS")
            month = item.get("month", datetime.now().month)
            year = item.get("year", datetime.now().year)
            self.emit("status", f"[{idx}/{total}] Đang tạo ảnh tải xuống cho {name}...")
            try:
                src_path = self.render_card_image(item)
                clean_name = re.sub(r"[^\w\d_-]", "_", name)
                out_file = dest / f"{code}_{clean_name}_T{month}_{year}.png"
                shutil.copy2(src_path, out_file)
                saved_paths.append(str(out_file))
                self.emit("card_rendered", {"studentCode": code, "path": str(src_path)})
            except Exception as e:
                self.log(f"Lỗi xuất ảnh {name}: {e}", "error")
        self.emit("cards_exported", {"count": len(saved_paths), "dest_dir": str(dest)})

    # --- TÌM KIẾM VÀ MỞ CHAT VỚI SĐT (ĐA TẦNG, AN TOÀN TUYỆT ĐỐI) ---
    def _open_chat_by_phone(self, phone: str, timeout: float = 8.0) -> bool:
        """
        Tìm kiếm và mở khung chat với số điện thoại trên Zalo Web.
        Chỉ mở khi tìm thấy đúng bạn bè / danh bạ liên quan đến SĐT.
        TUYỆT ĐỐI KHÔNG BAO GIỜ fallback vào hội thoại ghim ở sidebar!
        """
        page = self.page
        try:
            # 1. Tìm ô tìm kiếm và điền SĐT
            search = page.locator("input#contact-search-input, input[placeholder*='Tìm kiếm']").first
            search.click(timeout=5000)
            search.fill("")
            search.fill(phone)
            # Chờ Zalo truy vấn danh bạ qua mạng
            page.wait_for_timeout(1500)

            found = False

            # 2. Tìm kết quả trong dropdown tìm kiếm:
            # Zalo Web LUÔN tạo div[id^='friend-item-'] khi tìm thấy người dùng (bạn bè hoặc qua SĐT)
            friend_items = page.locator("div[id^='friend-item-']")
            if friend_items.count() > 0 and friend_items.first.is_visible():
                friend_items.first.click()
                found = True
                page.wait_for_timeout(800)
            else:
                # Kiểm tra nếu có kết quả tìm kiếm theo SĐT trong danh sách tìm kiếm
                phone_items = page.locator(f".search-list div:has-text('{phone}')")
                if phone_items.count() > 0 and phone_items.first.is_visible():
                    phone_items.first.click()
                    found = True
                    page.wait_for_timeout(800)

            # 3. Nếu KHÔNG tìm thấy bất kỳ kết quả nào cho SĐT này:
            if not found:
                # Xóa sạch ô tìm kiếm và đóng popup, trả về False ngay lập tức!
                search.fill("")
                page.keyboard.press("Escape")
                page.wait_for_timeout(300)
                return False

            # Đóng popup gợi ý tìm kiếm nếu còn nổi lên
            page.keyboard.press("Escape")
            page.wait_for_timeout(400)

            # Kiểm tra ô nhập tin nhắn richInput của cuộc trò chuyện vừa mở
            chat_input = page.locator("article#chatView div#richInput, div#chatInput div#richInput, div#richInput").first
            if chat_input.is_visible():
                return True

            return False
        except Exception as e:
            try:
                page.keyboard.press("Escape")
            except Exception:
                pass
            return False

    # --- GÕ VÀ GỬI TIN NHẮN VĂN BẢN HOÀN CHỈNH ---
    def _type_and_send_message(self, text: str) -> bool:
        """
        Gõ và gửi tin nhắn hoàn chỉnh vào khung chat Zalo Web của người nhận hiện tại.
        Dùng Clipboard Paste để giữ nguyên 100% định dạng, xuống dòng, emoji.
        TUYỆT ĐỐI KHÔNG click vào bất kỳ selector ngoài khung chat (tránh chạm vào hội thoại ghim).
        """
        page = self.page
        try:
            chat_input = page.locator("article#chatView div#richInput, div#chatInput div#richInput, div#richInput").first
            chat_input.wait_for(state="visible", timeout=7000)
            chat_input.click()
            page.wait_for_timeout(300)

            # Xóa text cũ nếu có
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            page.wait_for_timeout(200)

            # Đưa text vào clipboard của trình duyệt và paste
            pasted = False
            try:
                page.evaluate("text => navigator.clipboard.writeText(text)", text)
                page.wait_for_timeout(100)
                page.keyboard.press("Control+V")
                page.wait_for_timeout(500)
                pasted = True
            except Exception:
                pass

            # Fallback nếu paste chưa có text
            if not pasted or not chat_input.inner_text().strip():
                lines = text.split("\n")
                for idx, line in enumerate(lines):
                    if idx > 0:
                        page.keyboard.press("Shift+Enter")
                        page.wait_for_timeout(150)
                    if line:
                        page.keyboard.insert_text(line)
                        page.wait_for_timeout(100)

            page.wait_for_timeout(500)

            # 1. Nhấn Enter để gửi
            page.keyboard.press("Enter")
            page.wait_for_timeout(600)

            # 2. Nếu tin nhắn vẫn còn trong richInput (do cấu hình Ctrl+Enter)
            if chat_input.inner_text().strip():
                page.keyboard.press("Control+Enter")
                page.wait_for_timeout(600)

            # 3. Nếu vẫn còn text, click nút Gửi ĐƯỢC GIỚI HẠN CHẶT CHẼ TRONG chatInput
            if chat_input.inner_text().strip():
                try:
                    page.evaluate("""() => {
                        const box = document.querySelector('#chatInput') || document.querySelector('article#chatView');
                        if (box) {
                            const btn = box.querySelector('div[data-id="btn_Send"], div[class*="send-btn"], div[class*="btn-send"]');
                            if (btn) btn.click();
                        }
                    }""")
                except Exception:
                    pass
                page.wait_for_timeout(600)

            return True
        except Exception as e:
            self.log(f"Lỗi gửi tin nhắn: {e}", "warn")
            return False

    # --- GỬI ẢNH THẺ VÀO ZALO ---
    def _send_card_to_phone(self, item: dict, img_path: Path, cfg: SendConfig):
        phone = item.get("cleanParentPhone") or normalize_phone(item.get("parentPhone", ""))
        if not phone:
            return "NO_PHONE", "Thiếu SĐT"

        page = self.page
        try:
            # 1. Tìm và mở cuộc trò chuyện
            if not self._open_chat_by_phone(phone, timeout=cfg.search_timeout):
                return "NOT_FOUND", "Không tìm thấy trong bạn bè Zalo"

            # 2. Chờ khung chat của người nhận hiện tại sẵn sàng
            chat_input = page.locator("article#chatView div#richInput, div#chatInput div#richInput, div#richInput").first
            chat_input.wait_for(state="visible", timeout=7000)

            # 3. Gửi lời chào nếu được cấu hình
            if cfg.send_greeting_text:
                st_name = item.get("studentName", "")
                st_code = item.get("studentCode", "")
                month = item.get("month", "")
                year = item.get("year", "")
                greeting = f"CLB Cờ vua Kiện Tướng Tương Lai gửi Quý phụ huynh Thẻ Báo Học Phí tháng {month}/{year} của em {st_name} ({st_code})."
                self._type_and_send_message(greeting)
                page.wait_for_timeout(800)

            # 4. Upload ảnh thẻ học phí - 100% TRONG article#chatView
            # TUYỆT ĐỐI KHÔNG CLICK VÀO BẤT KỲ SELECTOR NÀO Ở SIDEBAR
            file_uploaded = False

            # Cách 1 (Chuẩn nhất của Zalo Web): Dùng expect_file_chooser trên nút "Gửi hình ảnh"
            try:
                photo_btn = page.locator("article#chatView div[title='Gửi hình ảnh'], article#chatView div[data-translate-title='STR_SEND_PHOTO'], div#chatInput div[title='Gửi hình ảnh'], div[title='Gửi hình ảnh']").first
                if photo_btn.count() and photo_btn.is_visible():
                    with page.expect_file_chooser(timeout=3500) as fc_info:
                        photo_btn.click()
                    file_chooser = fc_info.value
                    file_chooser.set_files(str(img_path))
                    file_uploaded = True
                    page.wait_for_timeout(1500)
            except Exception as e:
                pass

            # Cách 2: Paste trực tiếp từ clipboard vào richInput của khung chat hiện tại
            if not file_uploaded:
                try:
                    if copy_image_to_windows_clipboard(img_path):
                        chat_input.click()
                        page.wait_for_timeout(300)
                        page.keyboard.press("Control+V")
                        page.wait_for_timeout(1500)
                        file_uploaded = True
                except Exception as e:
                    self.log(f"Clipboard paste error: {e}", "warn")

            # Cách 3: Gán file trực tiếp vào input[type='file'] nếu có
            if not file_uploaded:
                try:
                    file_inputs = page.locator("article#chatView input[type='file'], div#chatInput input[type='file']")
                    if file_inputs.count():
                        file_inputs.first.set_input_files(str(img_path))
                        file_uploaded = True
                        page.wait_for_timeout(1500)
                except Exception:
                    pass

            page.wait_for_timeout(1000)

            # 5. Xác nhận gửi ảnh
            # Khi upload ảnh, Zalo Web mở popup xem trước ảnh với nút "Gửi"
            # Thử click nút "Gửi" trong modal xem trước ảnh nếu có
            try:
                modal_send = page.locator(".modal-dialog button:has-text('Gửi'), .modal-dialog div[role='button']:has-text('Gửi'), .modal button:has-text('Gửi'), .modal div[role='button']:has-text('Gửi')").first
                if modal_send.count() and modal_send.is_visible():
                    modal_send.click()
                    page.wait_for_timeout(1000)
            except Exception:
                pass

            # Nhấn Enter để gửi ảnh đi
            page.keyboard.press("Enter")
            page.wait_for_timeout(1200)

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
                    if not self._open_chat_by_phone(phone, timeout=cfg.search_timeout):
                        status = "NOT_FOUND"
                    else:
                        sent = self._type_and_send_message(msg)
                        status = "OK" if sent else "ERROR"
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
        self.geometry("1380x860")
        self.minsize(1140, 740)

        register_windows_protocol()

        self.ui_q: queue.Queue = queue.Queue()
        self.worker = ZaloWorker(lambda k, p: self.ui_q.put((k, p)))
        self.worker.start()

        self.busy = False
        self.all_invoice_items: list[dict] = []
        self.invoice_items: list[dict] = []
        self.sendable_items: list[dict] = []
        self.missing_phone_items: list[dict] = []
        self.selected_item: dict | None = None
        self.preview_image_path: Path | None = None
        self.counts = {"OK": 0, "NOT_FOUND": 0, "ERROR": 0, "NO_PHONE": 0}
        self.var_only_pending = ctk.BooleanVar(value=False)

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
        tab.grid_columnconfigure(0, weight=4)
        tab.grid_columnconfigure(1, weight=3)
        tab.grid_columnconfigure(2, weight=4)
        tab.grid_rowconfigure(1, weight=1)

        # Thanh công cụ nạp file
        toolbar = ctk.CTkFrame(tab, fg_color="transparent")
        toolbar.grid(row=0, column=0, columnspan=3, sticky="ew", pady=(0, 8))

        ctk.CTkButton(toolbar, text="📂 Mở file dữ liệu học phí (.json / .xlsx)", command=self._open_file_dialog,
                      fg_color="#7c3aed", hover_color="#8b5cf6", height=32, corner_radius=8, font=self.f_h).pack(side="left")

        ctk.CTkButton(toolbar, text="⚡ Nhận file mới từ Downloads", command=self._load_latest_download,
                      fg_color="#0f766e", hover_color="#14b8a6", height=32, corner_radius=8, font=self.f_h).pack(side="left", padx=8)

        self.chk_only_pending = ctk.CTkCheckBox(
            toolbar,
            text="Chỉ lấy chưa đóng (PENDING)",
            variable=self.var_only_pending,
            command=self._apply_student_filters,
            font=self.f_body,
            checkbox_width=18,
            checkbox_height=18,
        )
        self.chk_only_pending.pack(side="left", padx=8)

        self.lbl_class_info = ctk.CTkLabel(toolbar, text="Chưa nạp danh sách học sinh nào.", font=self.f_body, text_color=C_MUTED)
        self.lbl_class_info.pack(side="left", padx=8)

        # Cột 1: Danh sách học viên có SĐT (gửi tự động)
        left_box = ctk.CTkFrame(tab, fg_color=C_BG, corner_radius=10, border_width=1, border_color=C_BORDER)
        left_box.grid(row=1, column=0, sticky="nsew", padx=(0, 5))
        left_box.grid_columnconfigure(0, weight=1)
        left_box.grid_rowconfigure(1, weight=1)

        self.lbl_sendable_hdr = ctk.CTkLabel(
            left_box, text="📱 Gửi tự động — Có SĐT (0)", font=self.f_h, text_color="#e6edf7"
        )
        self.lbl_sendable_hdr.grid(row=0, column=0, sticky="w", padx=12, pady=(8, 4))

        self.scroll_students = ctk.CTkScrollableFrame(left_box, fg_color="transparent")
        self.scroll_students.grid(row=1, column=0, sticky="nsew", padx=4, pady=4)

        # Cột 2: Học viên thiếu SĐT (tải ảnh để nhắn thủ công)
        mid_box = ctk.CTkFrame(tab, fg_color=C_BG, corner_radius=10, border_width=1, border_color="#78350f")
        mid_box.grid(row=1, column=1, sticky="nsew", padx=5)
        mid_box.grid_columnconfigure(0, weight=1)
        mid_box.grid_rowconfigure(2, weight=1)

        self.lbl_missing_hdr = ctk.CTkLabel(
            mid_box, text="⚠️ Học viên thiếu SĐT (0)", font=self.f_h, text_color=C_WARN
        )
        self.lbl_missing_hdr.grid(row=0, column=0, sticky="w", padx=12, pady=(8, 2))

        self.b_export_missing = ctk.CTkButton(
            mid_box,
            text="💾 Tải tất cả ảnh thiếu SĐT",
            command=self._download_all_missing_phone_cards,
            fg_color="#b45309",
            hover_color=C_WARN,
            height=30,
            corner_radius=8,
            font=self.f_body,
        )
        self.b_export_missing.grid(row=1, column=0, sticky="ew", padx=10, pady=(2, 6))

        self.scroll_missing_phone = ctk.CTkScrollableFrame(mid_box, fg_color="transparent")
        self.scroll_missing_phone.grid(row=2, column=0, sticky="nsew", padx=4, pady=4)

        # Cột 3: Xem trước thẻ ảnh & Lưu ảnh
        right_box = ctk.CTkFrame(tab, fg_color=C_BG, corner_radius=10, border_width=1, border_color=C_BORDER)
        right_box.grid(row=1, column=2, sticky="nsew", padx=(5, 0))
        right_box.grid_columnconfigure(0, weight=1)
        right_box.grid_rowconfigure(1, weight=1)

        ctk.CTkLabel(right_box, text="🖼️ Xem trước Thẻ Báo Học Phí", font=self.f_h, text_color="#e6edf7").grid(
            row=0, column=0, sticky="w", padx=12, pady=8)

        self.lbl_preview_img = ctk.CTkLabel(right_box, text="Chọn một học viên bên trái\nđể xem trước thẻ học phí.",
                                           font=self.f_body, text_color=C_MUTED)
        self.lbl_preview_img.grid(row=1, column=0, sticky="nsew", padx=10, pady=10)

        preview_actions = ctk.CTkFrame(right_box, fg_color="transparent")
        preview_actions.grid(row=2, column=0, sticky="ew", padx=12, pady=(0, 10))
        preview_actions.grid_columnconfigure(0, weight=1)
        preview_actions.grid_columnconfigure(1, weight=1)

        self.b_render_preview = ctk.CTkButton(
            preview_actions, text="🎨 Render xem trước", command=self._render_current_preview,
            fg_color="#334155", hover_color="#475569", height=32, corner_radius=8
        )
        self.b_render_preview.grid(row=0, column=0, sticky="ew", padx=(0, 4))

        self.b_save_preview = ctk.CTkButton(
            preview_actions, text="💾 Tải ảnh về máy", command=self._download_current_preview,
            fg_color="#059669", hover_color="#10b981", height=32, corner_radius=8
        )
        self.b_save_preview.grid(row=0, column=1, sticky="ew", padx=(4, 0))

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
        # Tìm file KTTL_HocPhi_*.json hoặc KTTL_TheHocPhi_*.json tạo trong 30 phút gần nhất
        now = time.time()
        files = (
            list(downloads_path.glob("KTTL_HocPhi_*.json"))
            + list(downloads_path.glob("KTTL_TheHocPhi_*.json"))
            + list(downloads_path.glob("kttl_invoices_*.json"))
        )
        recent = [f for f in files if (now - f.stat().st_mtime) < 1800]
        if recent:
            recent.sort(key=lambda f: f.stat().st_mtime, reverse=True)
            target = recent[0]
            self.log(f"Phát hiện file học phí mới tải về: {target.name}", "info")
            self._load_file(str(target))

    def _load_latest_download(self):
        downloads_path = Path.home() / "Downloads"
        priority_files = (
            list(downloads_path.glob("KTTL_HocPhi_*.json"))
            + list(downloads_path.glob("KTTL_TheHocPhi_*.json"))
            + list(downloads_path.glob("kttl_invoices_*.json"))
        )
        files = priority_files if priority_files else list(downloads_path.glob("*.json"))
        if not files:
            messagebox.showinfo("Thông báo", "Không tìm thấy file học phí nào trong thư mục Downloads.")
            return
        files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        self._load_file(str(files[0]))

    def _load_file(self, file_path_str: str):
        # Nếu là URI protocol: kttl-zalo://open?file=... hoặc kttl-zalo://open
        if file_path_str.startswith("kttl-zalo://"):
            parsed = urllib.parse.urlparse(file_path_str)
            params = urllib.parse.parse_qs(parsed.query)
            if "file" in params:
                file_path_str = urllib.parse.unquote(params["file"][0])
            else:
                self._load_latest_download()
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
        bundle_class_name = ""
        if isinstance(data, list):
            students = data
        elif isinstance(data, dict):
            students = data.get("students") or data.get("customStudents") or []
            cls_obj = data.get("classroom")
            if isinstance(cls_obj, dict):
                bundle_class_name = cls_obj.get("name", "")

        if not students:
            messagebox.showwarning("Dữ liệu rỗng", "File không chứa danh sách học sinh.")
            return

        # Lọc bỏ học sinh 0 buổi và 0 đ
        billable = [s for s in students if (s.get("presentCount") or 0) > 0 or (s.get("totalAmount") or 0) > 0]
        skipped_zero = len(students) - len(billable)
        if skipped_zero > 0:
            self.log(f"Đã tự động bỏ qua {skipped_zero} học viên 0 buổi / 0 đ.", "info")

        self.all_invoice_items = billable
        self._loaded_file_name = p.name
        self._loaded_bundle_class = bundle_class_name
        self._apply_student_filters()
        self.log(f"Đã nạp {len(self.invoice_items)}/{len(billable)} học viên từ {p.name}", "ok")

    def _apply_student_filters(self):
        only_pending = bool(self.var_only_pending.get())
        if only_pending:
            self.invoice_items = [s for s in self.all_invoice_items if s.get("status", "PENDING") != "PAID"]
        else:
            self.invoice_items = list(self.all_invoice_items)

        self.sendable_items = [s for s in self.invoice_items if has_valid_phone(s)]
        self.missing_phone_items = [s for s in self.invoice_items if not has_valid_phone(s)]

        first = self.invoice_items[0] if self.invoice_items else (self.all_invoice_items[0] if self.all_invoice_items else {})
        cls_name = getattr(self, "_loaded_bundle_class", "") or first.get("className", "")
        if len(cls_name) > 36:
            cls_name = cls_name[:33] + "..."
        m = first.get("month", "")
        y = first.get("year", "")
        total_money = format_money(sum(float(s.get("totalAmount") or 0) for s in self.invoice_items))
        info_str = (
            f"{cls_name + ' • ' if cls_name else ''}Tháng {m}/{y} • "
            f"{len(self.sendable_items)} có SĐT / {len(self.missing_phone_items)} thiếu SĐT ({total_money})"
        )
        self.lbl_class_info.configure(text=info_str, text_color=C_OK if self.invoice_items else C_WARN)
        self.lbl_sendable_hdr.configure(text=f"📱 Gửi tự động — Có SĐT ({len(self.sendable_items)})")
        self.lbl_missing_hdr.configure(text=f"⚠️ Học viên thiếu SĐT ({len(self.missing_phone_items)})")
        self.b_export_missing.configure(
            state="normal" if self.missing_phone_items else "disabled",
            text=f"💾 Tải tất cả ảnh thiếu SĐT ({len(self.missing_phone_items)})",
        )

        self._render_students_list()
        self._render_missing_phone_list()
        if self.sendable_items:
            self._select_student(self.sendable_items[0])
        elif self.missing_phone_items:
            self._select_student(self.missing_phone_items[0])
        else:
            self.selected_item = None
            self.lbl_preview_img.configure(image="", text="Không có học viên nào khớp bộ lọc.")

    def _render_students_list(self):
        for w in self.scroll_students.winfo_children():
            w.destroy()

        if not self.sendable_items:
            ctk.CTkLabel(
                self.scroll_students,
                text="Không có học viên nào có SĐT để gửi tự động.",
                font=self.f_body,
                text_color=C_MUTED,
            ).pack(pady=24)
            return

        for item in self.sendable_items:
            f = ctk.CTkFrame(self.scroll_students, fg_color=C_CARD, corner_radius=8, border_width=1, border_color=C_BORDER)
            f.pack(fill="x", padx=2, pady=3)

            name = item.get("studentName", "")
            code = item.get("studentCode", "")
            phone = item.get("parentPhone", "")
            amount = format_money(item.get("totalAmount", 0))
            count = item.get("presentCount", 0)
            active_classes = [c for c in (item.get("classList") or []) if (c.get("presentCount") or 0) > 0]
            class_tag = f" • {len(active_classes)} lớp" if len(active_classes) > 1 else ""
            is_paid = item.get("status") == "PAID"
            status_tag = " [Đã đóng]" if is_paid else ""

            # Left badge
            badge = ctk.CTkLabel(f, text=code, font=self.f_h, width=54, fg_color="#1e293b", corner_radius=6)
            badge.pack(side="left", padx=8, pady=8)

            # Center info
            info = ctk.CTkFrame(f, fg_color="transparent")
            info.pack(side="left", fill="x", expand=True, padx=4)
            ctk.CTkLabel(info, text=f"{name}  •  {phone}{status_tag}", font=self.f_h,
                         text_color=C_OK if is_paid else "#f8fafc", anchor="w").pack(fill="x")
            ctk.CTkLabel(info, text=f"Thực học: {count} buổi{class_tag}  |  Tổng thu: {amount}",
                         font=self.f_body, text_color=C_MUTED, anchor="w").pack(fill="x")

            # Click handler
            f.bind("<Button-1>", lambda e, it=item: self._select_student(it))
            for child in (badge, info):
                child.bind("<Button-1>", lambda e, it=item: self._select_student(it))

    def _render_missing_phone_list(self):
        for w in self.scroll_missing_phone.winfo_children():
            w.destroy()

        if not self.missing_phone_items:
            ctk.CTkLabel(
                self.scroll_missing_phone,
                text="✅ Tất cả học viên đều đã có SĐT!",
                font=self.f_body,
                text_color=C_OK,
            ).pack(pady=24)
            return

        for item in self.missing_phone_items:
            f = ctk.CTkFrame(
                self.scroll_missing_phone,
                fg_color="#1f1a14",
                corner_radius=8,
                border_width=1,
                border_color="#78350f",
            )
            f.pack(fill="x", padx=2, pady=3)

            name = item.get("studentName", "")
            code = item.get("studentCode", "")
            amount = format_money(item.get("totalAmount", 0))
            count = item.get("presentCount", 0)
            raw_phone = str(item.get("parentPhone") or "").strip()
            phone_note = f"SĐT lỗi: {raw_phone}" if raw_phone else "Chưa có SĐT phụ huynh"

            info = ctk.CTkFrame(f, fg_color="transparent")
            info.pack(side="left", fill="x", expand=True, padx=8, pady=6)
            ctk.CTkLabel(info, text=f"{name} ({code})", font=self.f_h, text_color="#fef3c7", anchor="w").pack(fill="x")
            ctk.CTkLabel(info, text=f"{count} buổi • {amount} | {phone_note}",
                         font=self.f_body, text_color="#fbbf24", anchor="w").pack(fill="x")

            btn_dl = ctk.CTkButton(
                f,
                text="💾 Tải ảnh",
                width=78,
                height=28,
                corner_radius=6,
                fg_color="#059669",
                hover_color="#10b981",
                font=self.f_body,
                command=lambda it=item: self._download_single_card(it),
            )
            btn_dl.pack(side="right", padx=8, pady=8)

            f.bind("<Button-1>", lambda e, it=item: self._select_student(it))
            info.bind("<Button-1>", lambda e, it=item: self._select_student(it))

    def _get_missing_export_dir(self, items: list[dict]) -> Path:
        first = items[0] if items else {}
        m = first.get("month", datetime.now().month)
        y = first.get("year", datetime.now().year)
        return Path.home() / "Downloads" / f"KTTL_ThieuSDT_T{m}_{y}"

    def _download_single_card(self, item: dict):
        self._select_student(item)
        dest_dir = self._get_missing_export_dir([item])
        self.log(f"Đang xuất ảnh thẻ cho em {item.get('studentName')}...", "info")
        self.worker.submit("export_cards", items=[item], dest_dir=str(dest_dir))

    def _download_current_preview(self):
        if not self.selected_item:
            messagebox.showinfo("Chưa chọn học viên", "Hãy chọn một học viên để tải ảnh.")
            return
        dest_dir = Path.home() / "Downloads"
        self.log(f"Đang lưu ảnh thẻ em {self.selected_item.get('studentName')} vào Downloads...", "info")
        self.worker.submit("export_cards", items=[self.selected_item], dest_dir=str(dest_dir))

    def _download_all_missing_phone_cards(self):
        if not self.missing_phone_items:
            messagebox.showinfo("Thông báo", "Không có học viên nào thiếu SĐT.")
            return
        dest_dir = self._get_missing_export_dir(self.missing_phone_items)
        self.log(f"Đang xuất {len(self.missing_phone_items)} ảnh thẻ thiếu SĐT vào {dest_dir}...", "info")
        self.worker.submit("export_cards", items=self.missing_phone_items, dest_dir=str(dest_dir))

    def _select_student(self, item: dict):
        self.selected_item = item
        code = item.get("studentCode", "")
        name = item.get("studentName", "")
        expected_path = get_card_image_path(item)

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
            if not self.sendable_items:
                messagebox.showwarning(
                    "Không có SĐT hợp lệ",
                    "Tất cả học viên hiện tại đều thiếu SĐT. Hãy dùng cột 'Học viên thiếu SĐT' để tải ảnh xuống và nhắn thủ công.",
                )
                return
            confirm_msg = f"Gửi Thẻ Báo Học Phí tự động cho {len(self.sendable_items)} phụ huynh có SĐT?"
            if self.missing_phone_items:
                confirm_msg += f"\n\n(Lưu ý: {len(self.missing_phone_items)} học viên thiếu SĐT đã được tách riêng sang cột giữa để bạn tải ảnh gửi thủ công.)"
            if not messagebox.askyesno("Xác nhận gửi", confirm_msg):
                return
            self._set_busy(True)
            self.worker.stop_event.clear()
            self.worker.pause_event.clear()
            self.worker.submit("send_cards", items=self.sendable_items, cfg=cfg)
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
                elif kind == "cards_exported":
                    cnt = p.get("count", 0)
                    dest_dir = p.get("dest_dir", "")
                    self.log(f"Đã tải xuống {cnt} ảnh thẻ vào: {dest_dir}", "ok")
                    self.lbl_status.configure(text=f"Đã lưu {cnt} ảnh thẻ vào {dest_dir}")
                    try:
                        if sys.platform == "win32" and dest_dir:
                            os.startfile(dest_dir)
                    except Exception:
                        pass
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
