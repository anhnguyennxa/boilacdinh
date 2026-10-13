// Đưa món từ thực đơn trên máy lên bản online — chỉ THÊM, không ghi đè:
//  - món có trên máy mà online chưa có (so theo đường dẫn/slug) → tạo mới kèm ảnh + nhóm tùy chọn
//  - món có ở cả hai, online chưa có ảnh mà máy có → thêm ảnh
//  - món đã có online: giữ nguyên tên, giá, ảnh, tùy chọn
//
// Chạy thử (không thay đổi gì):  node scripts/sync-menu.mjs
// Chạy thật:                     node scripts/sync-menu.mjs --apply
// Chỉ một số món:                node scripts/sync-menu.mjs --only=ca-cao-latte,tra-dau --apply
//
// Cần API trên máy đang chạy (localhost:4000). Email admin online lấy từ SYNC_EMAIL hoặc hỏi khi chạy;
// mật khẩu luôn nhập ẩn trong terminal, không lưu ở đâu.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = process.env.SYNC_SOURCE ?? 'http://localhost:4000/api/v1';
const TARGET = process.env.SYNC_TARGET ?? 'https://boilacdinh-api.onrender.com/api/v1';
const APPLY = process.argv.includes('--apply');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',').filter(Boolean);

async function http(url, init = {}) {
  // API gói free trên Render có thể đang "ngủ": lần gọi đầu chờ tới ~1 phút
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}
const data = async (url, init) => {
  const r = await http(url, init);
  if (!r.ok) throw new Error(`${init?.method ?? 'GET'} ${url} → ${r.status}: ${JSON.stringify(r.body.message ?? r.body)}`);
  return r.body.data;
};

function ask(question, { hidden = false } = {}) {
  return new Promise((done) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : '');
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      done(answer.trim());
    });
  });
}

/** Danh sách đầy đủ (kể cả món hết hàng) qua endpoint công khai, phân trang 100/lần. */
async function allProducts(base) {
  const out = [];
  for (let page = 1; ; page++) {
    const r = await http(`${base}/products?limit=100&page=${page}`);
    if (!r.ok) throw new Error(`Không đọc được thực đơn ${base}: ${r.status}`);
    out.push(...r.body.data);
    if (out.length >= r.body.meta.total || !r.body.data.length) return out;
  }
}

async function localImage(url) {
  if (!url) return null;
  if (url.startsWith('https://')) return { remote: url };
  const file = join(ROOT, 'apps/api', url.replace(/^\//, '')); // /uploads/2026/10/x.png → apps/api/uploads/…
  const ext = url.split('.').pop().toLowerCase();
  const type = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext];
  return { buffer: await readFile(file), type, name: url.split('/').pop() };
}

async function upload(token, img) {
  if (img.remote) return img.remote;
  const form = new FormData();
  form.append('file', new Blob([img.buffer], { type: img.type }), img.name);
  const r = await data(`${TARGET}/admin/uploads`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form });
  return r.url;
}

const vnd = (n) => n.toLocaleString('vi-VN') + 'đ';

async function main() {
  console.log(`Nguồn:  ${SOURCE}\nĐích:   ${TARGET}\nChế độ: ${APPLY ? 'CHẠY THẬT' : 'chạy thử (thêm --apply để thực hiện)'}\n`);
  const [source, target, targetCats] = await Promise.all([allProducts(SOURCE), allProducts(TARGET), data(`${TARGET}/categories`)]);
  const onTarget = new Map(target.map((p) => [p.slug, p]));
  const catId = new Map(targetCats.map((c) => [c.slug, c.id]));

  const toCreate = source.filter((p) => !onTarget.has(p.slug) && (!ONLY || ONLY.includes(p.slug)));
  const toAddImage = source.filter((p) => {
    const t = onTarget.get(p.slug);
    return t && !t.imageUrl && p.imageUrl && (!ONLY || ONLY.includes(p.slug));
  });

  console.log(`Sẽ THÊM ${toCreate.length} món:`);
  for (const p of toCreate) {
    const missingCat = !catId.has(p.category.slug);
    console.log(`  + ${p.name} (${p.slug}) · ${p.category.name} · ${vnd(p.basePrice)} · ${p.imageUrl ? 'có ảnh' : 'không ảnh'}${missingCat ? ' · ⚠ online chưa có danh mục này — bỏ qua' : ''}`);
  }
  console.log(`Sẽ THÊM ẢNH cho ${toAddImage.length} món đang thiếu ảnh online${toAddImage.length ? ':' : '.'}`);
  for (const p of toAddImage) console.log(`  🖼  ${p.name} (${p.slug})`);
  const skipped = source.filter((p) => onTarget.has(p.slug) && !toAddImage.includes(p)).length;
  console.log(`Giữ nguyên ${skipped} món đã có online.\n`);

  if (!APPLY || (!toCreate.length && !toAddImage.length)) {
    if (!APPLY) console.log('Chưa thay đổi gì. Chạy lại với --apply để thực hiện.');
    return;
  }

  const email = process.env.SYNC_EMAIL || (await ask('Email admin bản online: '));
  const password = await ask('Mật khẩu (nhập ẩn): ', { hidden: true });
  const { accessToken: token } = await data(`${TARGET}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  let ok = 0;
  for (const p of toCreate) {
    if (!catId.has(p.category.slug)) continue;
    try {
      const detail = await data(`${SOURCE}/products/${encodeURIComponent(p.slug)}`);
      const img = await localImage(detail.imageUrl);
      const imageUrl = img ? await upload(token, img) : null;
      await data(`${TARGET}/admin/products`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          categoryId: catId.get(p.category.slug),
          name: detail.name,
          slug: detail.slug,
          description: detail.description ?? undefined,
          basePrice: detail.basePrice,
          imageUrl,
          isAvailable: detail.isAvailable,
          isFeatured: detail.isFeatured,
          optionGroups: detail.optionGroups.map((g) => ({
            name: g.name,
            isRequired: g.isRequired,
            maxSelect: g.maxSelect,
            options: g.options.map((o) => ({ name: o.name, extraPrice: o.extraPrice })),
          })),
        }),
      });
      ok++;
      console.log(`  ✔ Đã thêm ${detail.name}${imageUrl ? ' (kèm ảnh)' : ''}`);
    } catch (e) {
      console.log(`  ✘ ${p.name}: ${e.message}`);
    }
  }
  for (const p of toAddImage) {
    try {
      const imageUrl = await upload(token, await localImage(p.imageUrl));
      await data(`${TARGET}/admin/products/${onTarget.get(p.slug).id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ imageUrl }) });
      ok++;
      console.log(`  ✔ Đã thêm ảnh cho ${p.name}`);
    } catch (e) {
      console.log(`  ✘ Ảnh ${p.name}: ${e.message}`);
    }
  }
  console.log(`\nXong: ${ok}/${toCreate.length + toAddImage.length} thay đổi thành công. Thực đơn khách được làm mới ngay.`);
}

main().catch((e) => {
  console.error(`\nLỗi: ${e.message}`);
  process.exit(1);
});
