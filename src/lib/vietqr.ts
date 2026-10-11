/**
 * Helper sinh mã VietQR Napas 247 theo chuẩn ngân hàng Việt Nam
 */

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
