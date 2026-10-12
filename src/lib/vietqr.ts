/**
 * Helper sinh mã VietQR Napas 247 theo chuẩn ngân hàng Việt Nam
 */

export interface BankOption {
  id: string; // BIN Code hoặc mã viết tắt: MB, VCB, TCB...
  name: string;
  shortName: string;
}

export const SUPPORTED_BANKS: BankOption[] = [
  { id: "MB", name: "Ngân hàng TMCP Quân Đội", shortName: "MBBank" },
  { id: "VCB", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", shortName: "Vietcombank" },
  { id: "TCB", name: "Ngân hàng TMCP Kỹ Thương Việt Nam", shortName: "Techcombank" },
  { id: "BIDV", name: "Ngân hàng Đầu tư & Phát triển Việt Nam", shortName: "BIDV" },
  { id: "ACB", name: "Ngân hàng TMCP Á Châu", shortName: "ACB" },
  { id: "TPB", name: "Ngân hàng TMCP Tiên Phong", shortName: "TPBank" },
  { id: "VPB", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", shortName: "VPBank" },
  { id: "ICB", name: "Ngân hàng TMCP Công Thương Việt Nam", shortName: "VietinBank" },
  { id: "STB", name: "Ngân hàng TMCP Sài Gòn Thương Tín", shortName: "Sacombank" },
  { id: "VIB", name: "Ngân hàng TMCP Quốc Tế", shortName: "VIB" },
  { id: "HDB", name: "Ngân hàng TMCP Phát triển TP.HCM", shortName: "HDBank" },
  { id: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", shortName: "SHB" },
  { id: "MSB", name: "Ngân hàng TMCP Hàng Hải", shortName: "MSB" },
  { id: "VBA", name: "Ngân hàng Nông nghiệp & PTNT Việt Nam", shortName: "Agribank" },
];

export interface VietQrOptions {
  bankId?: string; // MB, VCB, TCB, ACB, ...
  accountNo?: string;
  accountName?: string;
  amount: number;
  description: string;
  template?: 'compact2' | 'compact' | 'qr_only' | 'print';
}

export function generateVietQrUrl(options: VietQrOptions): string {
  const bankId = options.bankId || process.env.NEXT_PUBLIC_BANK_ID || "MB";
  const accountNo = options.accountNo || process.env.NEXT_PUBLIC_BANK_ACCOUNT || "0987654321";
  const accountName = options.accountName || process.env.NEXT_PUBLIC_BANK_NAME || "CLB CO VUA KIEN TUONG TUONG LAI";
  const template = options.template || "compact2";
  const amount = Math.round(options.amount);
  const memo = encodeURIComponent(options.description.trim());
  const accNameEncoded = encodeURIComponent(accountName.trim());

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${memo}&accountName=${accNameEncoded}`;
}

export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}
