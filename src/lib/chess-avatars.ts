/**
 * Bộ ảnh đại diện Cờ Vua phong cách Kiện Tướng Tương Lai (SVG Data URI)
 * Nhẹ, sắc nét, tương thích mọi thiết bị và trình duyệt.
 */

export interface AvatarPreset {
  id: string;
  name: string;
  piece: string;
  bgGradient: string;
  dataUri: string;
}

const createSvgAvatar = (symbol: string, bg1: string, bg2: string, text: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.25" />
      </filter>
    </defs>
    <rect width="120" height="120" rx="60" fill="url(#grad)" />
    <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" stroke-dasharray="4,4" />
    <text x="60" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="46" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" filter="url(#shadow)">${symbol}</text>
    <rect x="20" y="90" width="80" height="18" rx="9" fill="rgba(0,0,0,0.3)" />
    <text x="60" y="102" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="0.5">${text}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const CHESS_AVATARS: AvatarPreset[] = [
  {
    id: "knight",
    name: "Mã Thần Tốc",
    piece: "♞",
    bgGradient: "from-emerald-600 to-teal-800",
    dataUri: createSvgAvatar("♞", "#00B18A", "#0D6E57", "MÃ THẦN TỐC"),
  },
  {
    id: "king",
    name: "Vua Chiến Lược",
    piece: "♚",
    bgGradient: "from-amber-500 to-yellow-700",
    dataUri: createSvgAvatar("♚", "#F59E0B", "#B45309", "VUA CHIẾN LƯỢC"),
  },
  {
    id: "queen",
    name: "Hậu Quyền Uy",
    piece: "♛",
    bgGradient: "from-purple-600 to-indigo-800",
    dataUri: createSvgAvatar("♛", "#9333EA", "#4338CA", "HẬU QUYỀN UY"),
  },
  {
    id: "rook",
    name: "Xe Tiên Phong",
    piece: "♜",
    bgGradient: "from-rose-500 to-red-700",
    dataUri: createSvgAvatar("♜", "#E11D48", "#991B1B", "XE TIÊN PHONG"),
  },
  {
    id: "bishop",
    name: "Tượng Uyên Bác",
    piece: "♝",
    bgGradient: "from-blue-500 to-cyan-700",
    dataUri: createSvgAvatar("♝", "#2563EB", "#0E7490", "TƯỢNG UYÊN BÁC"),
  },
  {
    id: "pawn",
    name: "Tốt Dũng Cảm",
    piece: "♟",
    bgGradient: "from-teal-500 to-emerald-700",
    dataUri: createSvgAvatar("♟", "#14B8A6", "#047857", "TỐT DŨNG CẢM"),
  },
];

export function getStudentAvatarUrl(avatar?: string, name?: string, index: number = 0): string {
  if (avatar && avatar.trim().length > 0) {
    return avatar;
  }
  // Nếu chưa có, gán avatar luân phiên theo chỉ số hoặc tên
  const charCodeSum = (name || "HV").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avatarIndex = (charCodeSum + index) % CHESS_AVATARS.length;
  return CHESS_AVATARS[avatarIndex].dataUri;
}
