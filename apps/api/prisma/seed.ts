import { CategoryType, Prisma, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

type Group = { name: string; isRequired: boolean; maxSelect: number; options: [string, number][] };

const SIZE: Group = { name: 'Size', isRequired: true, maxSelect: 1, options: [['M', 0], ['L', 8000]] };
const SUGAR: Group = {
  name: 'Đường',
  isRequired: true,
  maxSelect: 1,
  options: [['100%', 0], ['70%', 0], ['50%', 0], ['30%', 0], ['Không đường', 0]],
};
const ICE: Group = {
  name: 'Đá',
  isRequired: true,
  maxSelect: 1,
  options: [['Bình thường', 0], ['Ít đá', 0], ['Không đá', 0]],
};
const TOPPING: Group = {
  name: 'Topping',
  isRequired: false,
  maxSelect: 3,
  options: [['Trân châu đen', 5000], ['Trân châu trắng', 6000], ['Pudding trứng', 7000], ['Thạch cà phê', 5000], ['Kem cheese', 10000]],
};
const RICE_EXTRA: Group = {
  name: 'Thêm',
  isRequired: false,
  maxSelect: 3,
  options: [['Trứng ốp la', 6000], ['Chả trứng', 8000], ['Cơm thêm', 5000], ['Canh', 5000]],
};
const PHO_SIZE: Group = {
  name: 'Cỡ tô',
  isRequired: true,
  maxSelect: 1,
  options: [['Thường', 0], ['Đặc biệt', 15000]],
};

const categories: { name: string; slug: string; type: CategoryType }[] = [
  { name: 'Món chính', slug: 'mon-chinh', type: 'FOOD' },
  { name: 'Món ăn vặt', slug: 'mon-an-vat', type: 'FOOD' },
  { name: 'Cà phê', slug: 'ca-phe', type: 'DRINK' },
  { name: 'Trà sữa', slug: 'tra-sua', type: 'DRINK' },
  { name: 'Nước ép', slug: 'nuoc-ep', type: 'DRINK' },
];

const products: {
  category: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  featured?: boolean;
  sold?: number;
  rating?: number;
  available?: boolean;
  groups?: Group[];
}[] = [
  { category: 'mon-chinh', name: 'Cơm tấm sườn bì chả', slug: 'com-tam-suon-bi-cha', price: 55000, sold: 412, rating: 4.8, featured: true, description: 'Sườn nướng than hoa, bì, chả trứng, mỡ hành và nước mắm pha chua ngọt.', groups: [RICE_EXTRA] },
  { category: 'mon-chinh', name: 'Phở bò tái nạm', slug: 'pho-bo-tai-nam', price: 60000, sold: 380, rating: 4.7, featured: true, description: 'Nước dùng hầm xương bò 12 tiếng, bánh phở tươi, bò tái và nạm giòn.', groups: [PHO_SIZE] },
  { category: 'mon-chinh', name: 'Bún chả Hà Nội', slug: 'bun-cha-ha-noi', price: 55000, sold: 256, rating: 4.6, description: 'Chả viên và chả miếng nướng, bún tươi, rau sống, nước chấm đu đủ.' },
  { category: 'mon-chinh', name: 'Cơm gà xối mỡ', slug: 'com-ga-xoi-mo', price: 50000, sold: 198, rating: 4.5, description: 'Đùi gà chiên giòn da, cơm chiên tỏi, dưa leo và nước mắm gừng.', groups: [RICE_EXTRA] },
  { category: 'mon-chinh', name: 'Bánh mì thịt nướng', slug: 'banh-mi-thit-nuong', price: 30000, sold: 520, rating: 4.7, featured: true, description: 'Bánh mì giòn rụm, thịt nướng sả, đồ chua, pate và rau thơm.' },
  { category: 'mon-chinh', name: 'Mì xào hải sản', slug: 'mi-xao-hai-san', price: 65000, sold: 87, rating: 4.4, available: false, description: 'Mì trứng xào tôm, mực, cải ngọt và nấm.' },

  { category: 'mon-an-vat', name: 'Khoai tây chiên lắc phô mai', slug: 'khoai-tay-chien-lac-pho-mai', price: 35000, sold: 301, rating: 4.6, description: 'Khoai tây cắt sợi chiên vàng, lắc bột phô mai.' },
  { category: 'mon-an-vat', name: 'Gà rán sốt cay (4 miếng)', slug: 'ga-ran-sot-cay', price: 69000, sold: 233, rating: 4.7, featured: true, description: 'Cánh gà rán giòn phủ sốt cay ngọt kiểu Hàn.' },
  { category: 'mon-an-vat', name: 'Bánh tráng trộn', slug: 'banh-trang-tron', price: 25000, sold: 276, rating: 4.5, description: 'Bánh tráng, xoài, trứng cút, khô bò, rau răm, sốt me.' },
  { category: 'mon-an-vat', name: 'Chả giò tôm thịt', slug: 'cha-gio-tom-thit', price: 40000, sold: 140, rating: 4.6, description: '6 cuốn chả giò giòn rụm, ăn kèm rau sống và nước mắm.' },

  { category: 'ca-phe', name: 'Cà phê sữa đá', slug: 'ca-phe-sua-da', price: 29000, sold: 640, rating: 4.8, featured: true, description: 'Robusta rang mộc pha phin, sữa đặc, đá viên.', groups: [SIZE, SUGAR, ICE] },
  { category: 'ca-phe', name: 'Bạc xỉu', slug: 'bac-xiu', price: 32000, sold: 410, rating: 4.7, description: 'Nhiều sữa, ít cà phê, béo ngậy.', groups: [SIZE, SUGAR, ICE] },
  { category: 'ca-phe', name: 'Cà phê muối', slug: 'ca-phe-muoi', price: 35000, sold: 355, rating: 4.8, description: 'Cà phê phin phủ lớp kem muối mặn nhẹ.', groups: [SIZE, SUGAR, ICE] },
  { category: 'ca-phe', name: 'Cold brew cam sả', slug: 'cold-brew-cam-sa', price: 45000, sold: 120, rating: 4.5, description: 'Cà phê ủ lạnh 18 giờ, cam vàng và sả tươi.', groups: [SIZE, ICE] },

  { category: 'tra-sua', name: 'Trà sữa trân châu đường đen', slug: 'tra-sua-tran-chau-duong-den', price: 39000, sold: 590, rating: 4.8, featured: true, description: 'Sữa tươi, trân châu nấu đường đen, vệt caramel.', groups: [SIZE, SUGAR, ICE, TOPPING] },
  { category: 'tra-sua', name: 'Trà sữa ô long', slug: 'tra-sua-o-long', price: 35000, sold: 330, rating: 4.6, description: 'Trà ô long rang thơm, vị hậu ngọt.', groups: [SIZE, SUGAR, ICE, TOPPING] },
  { category: 'tra-sua', name: 'Trà đào cam sả', slug: 'tra-dao-cam-sa', price: 39000, sold: 470, rating: 4.7, description: 'Trà đen, đào miếng, cam và sả tươi.', groups: [SIZE, SUGAR, ICE] },
  { category: 'tra-sua', name: 'Matcha latte', slug: 'matcha-latte', price: 45000, sold: 150, rating: 4.5, description: 'Matcha Uji pha sữa tươi.', groups: [SIZE, SUGAR, ICE, TOPPING] },

  { category: 'nuoc-ep', name: 'Nước ép cam', slug: 'nuoc-ep-cam', price: 35000, sold: 210, rating: 4.6, description: 'Cam sành vắt tươi mỗi ngày.', groups: [SIZE, SUGAR, ICE] },
  { category: 'nuoc-ep', name: 'Sinh tố bơ', slug: 'sinh-to-bo', price: 45000, sold: 180, rating: 4.7, description: 'Bơ sáp Đắk Lắk xay cùng sữa đặc.', groups: [SIZE, SUGAR] },
  { category: 'nuoc-ep', name: 'Nước ép dưa hấu', slug: 'nuoc-ep-dua-hau', price: 30000, sold: 160, rating: 4.4, description: 'Dưa hấu đỏ ngọt mát, không thêm nước.', groups: [SIZE, SUGAR, ICE] },
];

function groupsInput(groups: Group[] = []): Prisma.OptionGroupCreateWithoutProductInput[] {
  return groups.map((g, gi) => ({
    name: g.name,
    isRequired: g.isRequired,
    maxSelect: g.maxSelect,
    sortOrder: gi,
    options: { create: g.options.map(([name, extraPrice], oi) => ({ name, extraPrice, sortOrder: oi })) },
  }));
}

/**
 * Production (NODE_ENV=production):
 *  - chạy với --if-empty khi container khởi động: chỉ seed lần đầu (database chưa có danh mục),
 *    không ghi đè món/giá admin đã sửa;
 *  - chỉ tạo tài khoản admin từ SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD, không tạo tài khoản thử nghiệm.
 */
const PRODUCTION = process.env.NODE_ENV === 'production';

function seedUsers(): { email: string; fullName: string; role: Role; password: string }[] {
  if (!PRODUCTION) {
    return [
      { email: 'admin@foodhub.local', fullName: 'Quản trị FoodHub', role: 'ADMIN', password: 'Admin@12345' },
      { email: 'staff@foodhub.local', fullName: 'Nhân viên quầy', role: 'STAFF', password: 'Staff@12345' },
      { email: 'khach@foodhub.local', fullName: 'Khách Thử Nghiệm', role: 'CUSTOMER', password: 'Khach@12345' },
    ];
  }
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  // Nêu rõ thiếu gì (không in giá trị) để dễ sửa trên dashboard
  const problems = [
    !email && 'chưa có SEED_ADMIN_EMAIL',
    email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && 'SEED_ADMIN_EMAIL không phải email hợp lệ',
    !password && 'chưa có SEED_ADMIN_PASSWORD',
    password && password.length < 12 && `SEED_ADMIN_PASSWORD mới ${password.length} ký tự (cần ≥ 12)`,
  ].filter(Boolean);
  if (problems.length || !email || !password) {
    console.warn(`Bỏ qua tạo admin: ${problems.join('; ')}.`);
    return [];
  }
  return [{ email, fullName: 'Quản trị', role: 'ADMIN', password }];
}

/** Tạo tài khoản còn thiếu; tài khoản đã có thì giữ nguyên (không đổi mật khẩu). */
async function ensureUsers() {
  let created = 0;
  for (const u of seedUsers()) {
    if (await prisma.user.findUnique({ where: { email: u.email } })) continue;
    await prisma.user.create({
      data: { email: u.email, fullName: u.fullName, role: u.role, passwordHash: await argon2.hash(u.password) },
    });
    created++;
  }
  return created;
}

async function main() {
  if (process.argv.includes('--if-empty') && (await prisma.category.count()) > 0) {
    // Vẫn tạo admin nếu lần đầu chưa khai báo SEED_ADMIN_* (thêm biến rồi deploy lại là có)
    const created = await ensureUsers();
    console.log(`Database đã có dữ liệu — bỏ qua seed${created ? `, đã tạo ${created} tài khoản quản trị` : ''}.`);
    return;
  }
  const catIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, type: c.type, sortOrder: i, deletedAt: null },
      create: { ...c, sortOrder: i },
    });
    catIds.set(c.slug, row.id);
  }

  for (const p of products) {
    const data = {
      categoryId: catIds.get(p.category)!,
      name: p.name,
      description: p.description,
      basePrice: p.price,
      isFeatured: p.featured ?? false,
      isAvailable: p.available ?? true,
      soldCount: p.sold ?? 0,
      ratingAvg: p.rating ?? 0,
      deletedAt: null,
    };
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await prisma.optionGroup.deleteMany({ where: { productId: existing.id } });
      await prisma.product.update({
        where: { id: existing.id },
        data: { ...data, optionGroups: { create: groupsInput(p.groups) } },
      });
    } else {
      await prisma.product.create({ data: { ...data, slug: p.slug, optionGroups: { create: groupsInput(p.groups) } } });
    }
  }

  const users = seedUsers();
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { email: u.email, fullName: u.fullName, role: u.role, passwordHash: await argon2.hash(u.password) },
    });
  }

  const now = new Date();
  const day = 24 * 3600_000;
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const coupons: Prisma.CouponCreateInput[] = [
    {
      code: 'CHAOBAN', type: 'PERCENT', value: 10, minOrder: 50000, maxDiscount: 30000, usageLimit: 1000,
      startsAt: now, endsAt: nextYear, isPublic: true, description: 'Chào bạn mới — áp dụng cho mọi món',
    },
    {
      code: 'GIAM20K', type: 'FIXED', value: 20000, minOrder: 150000, usageLimit: 200,
      startsAt: now, endsAt: nextYear, isPublic: true, description: 'Đặt nhóm, giảm thẳng vào hóa đơn',
    },
    {
      code: 'TRASUA15', type: 'PERCENT', value: 15, minOrder: 60000, maxDiscount: 20000, usageLimit: 300,
      startsAt: now, endsAt: new Date(now.getTime() + 14 * day), isPublic: true, description: 'Tuần lễ trà sữa — chỉ 14 ngày',
    },
    {
      // Mã nội bộ: không hiện trên trang chủ
      code: 'NHANVIEN', type: 'PERCENT', value: 30, minOrder: 0, maxDiscount: 50000, usageLimit: null,
      startsAt: now, endsAt: nextYear, isPublic: false, description: 'Ưu đãi nhân viên',
    },
  ];
  for (const c of coupons) {
    // Chỉ cập nhật phần hiển thị, giữ nguyên used_count và thời hạn đang chạy
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { isPublic: c.isPublic, description: c.description },
      create: c,
    });
  }

  console.log(`Seed xong: ${categories.length} danh mục, ${products.length} món, ${users.length} tài khoản, ${coupons.length} mã giảm giá.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
