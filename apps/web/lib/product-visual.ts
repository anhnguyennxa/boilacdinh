/**
 * Ảnh minh họa khi món chưa có ảnh thật (dữ liệu seed). Khi admin tải ảnh lên Cloudinary/S3,
 * ProductImage tự dùng ảnh thật qua next/image.
 */
/** Quy tắc cụ thể đứng trước: "bánh mì" phải khớp trước "mì". */
const RULES: [RegExp, string][] = [
  [/bánh mì/i, '🥖'],
  [/phở|bún|mì/i, '🍜'],
  [/cơm/i, '🍛'],
  [/gà/i, '🍗'],
  [/khoai/i, '🍟'],
  [/chả giò/i, '🥟'],
  [/bánh tráng/i, '🥗'],
  [/cà phê|bạc xỉu|cold brew/i, '☕'],
  [/matcha/i, '🍵'],
  [/trà sữa|ô long/i, '🥤'], // 🧋 không có trong font emoji của Windows 10
  [/trà đào|trà/i, '🍑'],
  [/cam/i, '🍊'],
  [/bơ/i, '🥑'],
  [/dưa hấu/i, '🍉'],
];

/** Ánh màu rất nhẹ trên nền surface, lấy từ màu logo (cam, đỏ, xanh chanh) và xám trung tính. */
const GRADIENTS: Record<string, string> = {
  'mon-chinh': 'from-[#fa7d2b]/20 to-surface', // cam logo
  'mon-an-vat': 'from-[#cc0a13]/15 to-surface', // đỏ logo
  'ca-phe': 'from-[#585a5c]/25 to-surface',
  'tra-sua': 'from-[#fa7d2b]/12 to-surface',
  'nuoc-ep': 'from-[#c4fe0b]/25 to-surface', // xanh chanh logo
};

export function productVisual(name: string, categorySlug?: string) {
  const emoji = RULES.find(([re]) => re.test(name))?.[1] ?? '🍽️';
  const gradient = GRADIENTS[categorySlug ?? ''] ?? GRADIENTS['mon-chinh'];
  return { emoji, gradient };
}

export const CATEGORY_EMOJI: Record<string, string> = {
  'mon-chinh': '🍛',
  'mon-an-vat': '🍟',
  'ca-phe': '☕',
  'tra-sua': '🥤',
  'nuoc-ep': '🍊',
};
