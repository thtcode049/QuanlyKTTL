/**
 * Helper sinh mã VietQR Napas 247 theo chuẩn ngân hàng Việt Nam
 */
import QRCode from "qrcode";

export interface BankOption {
  id: string; // Mã viết tắt: VCB, MB, TCB...
  bin: string; // BIN Code chuẩn Napas 24/7 (6 số)
  name: string;
  shortName: string;
  keywords?: string[];
}

export const SUPPORTED_BANKS: BankOption[] = [
  { id: "VCB", bin: "970436", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", shortName: "Vietcombank", keywords: ["vcb", "vietcombank", "ngoai thuong", "ngoại thương", "970436"] },
  { id: "MB", bin: "970422", name: "Ngân hàng TMCP Quân Đội", shortName: "MBBank", keywords: ["mb", "mbbank", "quan doi", "quân đội", "970422"] },
  { id: "TCB", bin: "970407", name: "Ngân hàng TMCP Kỹ Thương Việt Nam", shortName: "Techcombank", keywords: ["tcb", "techcombank", "ky thuong", "kỹ thương", "970407"] },
  { id: "BIDV", bin: "970418", name: "Ngân hàng Đầu tư & Phát triển Việt Nam", shortName: "BIDV", keywords: ["bidv", "dau tu", "đầu tư", "970418"] },
  { id: "ICB", bin: "970415", name: "Ngân hàng TMCP Công Thương Việt Nam", shortName: "VietinBank", keywords: ["icb", "vietinbank", "cong thuong", "công thương", "970415"] },
  { id: "VBA", bin: "970405", name: "Ngân hàng Nông nghiệp & PTNT Việt Nam", shortName: "Agribank", keywords: ["vba", "agribank", "nong nghiep", "nông nghiệp", "970405"] },
  { id: "ACB", bin: "970416", name: "Ngân hàng TMCP Á Châu", shortName: "ACB", keywords: ["acb", "a chau", "á châu", "970416"] },
  { id: "TPB", bin: "970423", name: "Ngân hàng TMCP Tiên Phong", shortName: "TPBank", keywords: ["tpb", "tpbank", "tien phong", "tiên phong", "970423"] },
  { id: "VPB", bin: "970432", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", shortName: "VPBank", keywords: ["vpb", "vpbank", "thinh vuong", "thịnh vượng", "970432"] },
  { id: "STB", bin: "970403", name: "Ngân hàng TMCP Sài Gòn Thương Tín", shortName: "Sacombank", keywords: ["stb", "sacombank", "sai gon thuong tin", "sài gòn thương tín", "970403"] },
  { id: "VIB", bin: "970441", name: "Ngân hàng TMCP Quốc Tế", shortName: "VIB", keywords: ["vib", "quoc te", "quốc tế", "970441"] },
  { id: "HDB", bin: "970437", name: "Ngân hàng TMCP Phát triển TP.HCM", shortName: "HDBank", keywords: ["hdb", "hdbank", "phat trien tphcm", "970437"] },
  { id: "SHB", bin: "970443", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", shortName: "SHB", keywords: ["shb", "sai gon ha noi", "970443"] },
  { id: "MSB", bin: "970426", name: "Ngân hàng TMCP Hàng Hải", shortName: "MSB", keywords: ["msb", "hang hai", "hàng hải", "970426"] },
  { id: "OCB", bin: "970448", name: "Ngân hàng TMCP Phương Đông", shortName: "OCB", keywords: ["ocb", "phuong dong", "phương đông", "970448"] },
  { id: "LPB", bin: "970449", name: "Ngân hàng TMCP Lộc Phát Việt Nam", shortName: "LPBank", keywords: ["lpb", "lpbank", "buu dien lien viet", "loc phat", "970449"] },
  { id: "SEAB", bin: "970440", name: "Ngân hàng TMCP Đông Nam Á", shortName: "SeABank", keywords: ["seab", "seabank", "dong nam a", "970440"] },
];

/**
 * Chuẩn hóa chuỗi xóa dấu tiếng Việt (ASCII only)
 * Cần thiết cho EMVCo Tag 62 Subtag 08 Napas 24/7 để mọi App ngân hàng quét chuẩn xác
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesKeyword(text: string, kw: string): boolean {
  if (kw.length <= 3) {
    const regex = new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`, "i");
    return regex.test(text);
  }
  return text.includes(kw);
}

/**
 * Tự động phân giải chính xác ngân hàng (BankOption) từ bankId hoặc bankName
 * Giúp giải quyết triệt để lỗi người dùng chọn Vietcombank nhưng bị nhận diện nhầm sang MB
 */
export function resolveBank(bankId?: string, bankName?: string): BankOption {
  const normName = (bankName || "").toLowerCase();
  const normId = (bankId || "").trim().toUpperCase();

  // 1. Ưu tiên kiểm tra bankName nếu có chứa từ khóa rõ ràng
  if (normName) {
    for (const b of SUPPORTED_BANKS) {
      if (b.keywords && b.keywords.some((kw) => matchesKeyword(normName, kw))) {
        return b;
      }
      if (
        matchesKeyword(normName, b.id.toLowerCase()) ||
        normName.includes(b.shortName.toLowerCase()) ||
        normName.includes(b.name.toLowerCase())
      ) {
        return b;
      }
    }
  }

  // 2. Kiểm tra theo bankId hoặc BIN
  if (normId) {
    const matchId = SUPPORTED_BANKS.find(
      (b) => b.id.toUpperCase() === normId || b.bin === normId || b.shortName.toUpperCase() === normId
    );
    if (matchId) return matchId;
  }

  // Mặc định fallback về MBBank nếu không tìm thấy
  return SUPPORTED_BANKS.find((b) => b.id === "MB") || SUPPORTED_BANKS[0];
}

/**
 * Tính mã kiểm tra CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF)
 */
export function crc16Ccitt(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function tlv(tag: string, val: string): string {
  const len = String(val.length).padStart(2, "0");
  return tag + len + val;
}

/**
 * Tạo chuỗi dữ liệu EMVCo chuẩn Napas 24/7 VietQR
 * Đảm bảo 100% ứng dụng ngân hàng tại Việt Nam quét ra đúng ngân hàng, STK, số tiền và cú pháp
 */
export function buildVietQrEmvcoPayload(options: {
  bin: string;
  accountNo: string;
  amount: number;
  description: string;
}): string {
  const { bin, accountNo, amount, description } = options;
  const cleanAccountNo = (accountNo || "").replace(/\s+/g, "");
  const cleanMemo = removeVietnameseAccents(description).slice(0, 25);

  // Tag 38: Merchant Account Information
  const sub00 = tlv("00", "A000000727"); // GUID Napas
  const beneInfo = tlv("00", bin) + tlv("01", cleanAccountNo);
  const sub01 = tlv("01", beneInfo);
  const sub02 = tlv("02", "QRIBFTTA"); // Chuyển nhanh Napas 247 tới tài khoản
  const tag38 = tlv("38", sub00 + sub01 + sub02);

  let payload = tlv("00", "01"); // Payload Format Indicator
  payload += tlv("01", amount > 0 ? "12" : "11"); // 12 = Dynamic QR (có số tiền), 11 = Static QR (nhập số tiền)
  payload += tag38;
  payload += tlv("53", "704"); // VND
  if (amount > 0) {
    payload += tlv("54", String(Math.round(amount)));
  }
  payload += tlv("58", "VN"); // Country code
  if (cleanMemo) {
    payload += tlv("62", tlv("08", cleanMemo));
  }
  payload += "6304";
  const crc = crc16Ccitt(payload);
  return payload + crc;
}

export interface VietQrOptions {
  bankId?: string; // MB, VCB, TCB, ACB, ...
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  amount: number;
  description: string;
  template?: "compact2" | "compact" | "qr_only" | "print";
}

/**
 * Sinh mã VietQR dạng PNG base64 Data URL cục bộ bằng thư viện qrcode
 * Hoàn toàn offline, 0ms độ trễ, không bao giờ lỗi CORS và luôn vẽ được lên canvas
 */
export async function generateVietQrDataUrl(options: VietQrOptions): Promise<string> {
  const bank = resolveBank(options.bankId, options.bankName);
  const accountNo = (options.accountNo || "04092004369").replace(/\s+/g, "");
  const amount = Math.round(options.amount || 0);

  const emvcoPayload = buildVietQrEmvcoPayload({
    bin: bank.bin,
    accountNo,
    amount,
    description: options.description || "",
  });

  return await QRCode.toDataURL(emvcoPayload, {
    width: 400,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });
}

/**
 * Sinh link ảnh VietQR (tương thích dịch vụ img.vietqr.io)
 */
export function generateVietQrUrl(options: VietQrOptions): string {
  const bank = resolveBank(options.bankId, options.bankName);
  const accountNo = (options.accountNo || process.env.NEXT_PUBLIC_BANK_ACCOUNT || "04092004369").replace(/\s+/g, "");
  const accountName = options.accountName || process.env.NEXT_PUBLIC_BANK_NAME || "CLB CO VUA KIEN TUONG TUONG LAI";
  const template = options.template || "compact2";
  const amount = Math.round(options.amount || 0);
  const cleanMemo = removeVietnameseAccents(options.description || "");
  const memoEncoded = encodeURIComponent(cleanMemo);
  const accNameEncoded = encodeURIComponent(removeVietnameseAccents(accountName).toUpperCase());

  // Lưu ý: Nếu amount <= 0 thì không truyền amount để tránh lỗi hạn mức tối thiểu ở một số app ngân hàng
  const amountQuery = amount > 0 ? `amount=${amount}&` : "";
  return `https://img.vietqr.io/image/${bank.id}-${accountNo}-${template}.png?${amountQuery}addInfo=${memoEncoded}&accountName=${accNameEncoded}`;
}

export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/**
 * Sinh cú pháp chuyển khoản học phí chuẩn: [Tên học sinh] gửi HP T[tháng]
 * Định dạng liền không khoảng cách T10 (ví dụ: "Nguyễn Minh Khang gửi HP T10")
 */
export function formatTuitionTransferContent(studentName?: string, month?: number): string {
  const cleanName = (studentName || "Học viên").trim();
  const m = month ?? 10;
  return `${cleanName} gửi HP T${m}`;
}
