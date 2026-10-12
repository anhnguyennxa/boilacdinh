# Bối Lạc Đình — Website đặt đồ ăn & nước uống

Thương hiệu: tên, mô tả và logo khai báo ở `apps/web/lib/brand.ts`; logo tròn nền trong suốt ở `apps/web/public/brand/logo.png`, favicon `app/icon.png`, icon iOS `app/apple-icon.png`. (Tên mã nội bộ của dự án vẫn là `foodhub`.)

Monorepo theo *Kế hoạch thiết kế website Đồ ăn & Nước uống*: Next.js 15 (giao diện, SEO) + NestJS 11 (REST API) + PostgreSQL 16 + Redis, giao tiếp bằng JWT, cập nhật trạng thái đơn qua Socket.IO.

Phạm vi hiện tại tương ứng **giai đoạn 1–5** của lộ trình (10 tuần, 6 giai đoạn): khách đặt món, thanh toán COD/VNPay/MoMo, theo dõi đơn theo thời gian thực; trang quản trị đầy đủ (món, danh mục, đơn, khuyến mãi, báo cáo doanh thu). Tiếp theo: giai đoạn 6 — kiểm thử e2e, tối ưu Lighthouse, deploy production, theo dõi lỗi, sao lưu.

```
foodhub/
├── apps/web       Next.js — trang khách, tài khoản, quản trị
├── apps/api       NestJS — auth, users, categories, products, coupons, orders (+ Socket.IO), payments
├── packages/shared  enum, schema Zod, hàm tính tiền dùng chung cho web và api
└── docker-compose.yml  postgres, redis (+ api, web với profile "full")
```

## Chạy trên máy

Yêu cầu: Node 22+, Docker Desktop. Dùng pnpm qua `npx pnpm@10.18.0` nếu máy chưa cài pnpm.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env        # đổi JWT_*_SECRET, REVALIDATE_SECRET
cp apps/web/.env.example apps/web/.env.local  # REVALIDATE_SECRET trùng với api
pnpm db:up          # Postgres :5433, Redis :6380
pnpm db:migrate     # tạo bảng + extension pg_trgm/unaccent
pnpm db:seed        # 5 danh mục, 21 món, 3 tài khoản, 4 mã giảm giá
pnpm db:seed-demo   # (tùy chọn) ~1.000 đơn giả 60 ngày cho trang báo cáo; xóa: pnpm db:seed-demo --reset
pnpm dev            # web :3000, api :4000
```

- Web: http://localhost:3000 · API: http://localhost:4000/api/v1 · Swagger: http://localhost:4000/api/docs
- Nếu cổng 3000 bận: `pnpm --filter @foodhub/web exec next dev -p 3001` và đặt `WEB_URL=http://localhost:3001` cho api (CORS Socket.IO + revalidate).

**Tài khoản thử nghiệm** (chỉ dùng cho môi trường dev, tạo bởi `apps/api/prisma/seed.ts`):

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị | admin@foodhub.local | Admin@12345 |
| Nhân viên | staff@foodhub.local | Staff@12345 |
| Khách | khach@foodhub.local | Khach@12345 |

Mã giảm giá: `CHAOBAN` (10%, tối đa 30k, đơn từ 50k), `GIAM20K` (20k, đơn từ 150k).

## Sao lưu & khôi phục

```bash
pnpm db:backup   # → backups/<ngày_giờ>/ gồm foodhub.dump, foodhub.sql và thư mục uploads/
```

`backups/` không được đưa lên git (chứa dữ liệu khách hàng) — hãy chép sang ổ khác / cloud. Mỗi lần chạy giữ lại 14 bản gần nhất (`BACKUP_KEEP=0` để giữ tất cả).

Chạy tự động mỗi ngày lúc 03:00 trên Windows (Task Scheduler, chạy một lần trong PowerShell):

```powershell
schtasks /Create /TN "BoiLacDinh-Backup" /SC DAILY /ST 03:00 /TR "cmd /c cd /d \"D:\DU LIEU CUA ANH\Boilacdinh\foodhub\" && node scripts\backup.mjs >> backups\backup.log 2>&1"
```

Trên VPS (docker compose `--profile full`), service `backup` tự chạy 03:00 và ghi `backups/db_<UTC>.dump` + `uploads_<UTC>.tar.gz`.

Khôi phục từ `foodhub.dump` (ghi đè dữ liệu hiện tại — dừng API trước):

```bash
docker cp backups/<ngày_giờ>/foodhub.dump foodhub-postgres-1:/tmp/foodhub.dump
docker exec foodhub-postgres-1 pg_restore -U foodhub -d foodhub --clean --if-exists --no-owner /tmp/foodhub.dump
```

Ảnh: chép `backups/<ngày_giờ>/uploads/` trở lại `apps/api/uploads/`. Trên Git Bash, đặt `MSYS_NO_PATHCONV=1` trước lệnh để đường dẫn `/tmp` không bị đổi.

## Kiểm thử

```bash
pnpm test    # unit — shared: node:test · api: Jest · web: Vitest + Testing Library
pnpm lint    # kiểm tra kiểu TypeScript toàn bộ workspace
pnpm build
pnpm --filter @foodhub/api test:e2e   # luồng đặt hàng trên API thật + PostgreSQL (database foodhub_test)
pnpm --filter @foodhub/web test:e2e   # Playwright: mua hàng, mã giảm giá, theo dõi đơn realtime, quản trị (desktop + mobile)
sh scripts/lighthouse.sh / /thuc-don  # Lighthouse mobile, 3 lần lấy trung vị (cần bản build đang chạy)
```

- **E2E API** tự tạo database `foodhub_test` (`prisma migrate deploy` + seed), không đụng dữ liệu dev; chạy lại bao nhiêu lần cũng được.
- **E2E web** dùng web/API đang chạy ở cổng 3001/4000 (chưa chạy thì tự bật bản build). Đơn tạo trong lúc test được hủy ở cuối, không tính vào doanh thu. Trên máy dev dùng Chrome đã cài; CI dùng Chromium của Playwright.

## Đã làm

| Hạng mục | Chi tiết |
|---|---|
| CSDL | 13 bảng đúng mục 3; UUID, tiền `NUMERIC(12,0)`; snapshot tên/giá/tùy chọn/địa chỉ trong đơn; xóa mềm món & danh mục; chỉ mục GIN `pg_trgm` + `f_unaccent` để tìm không dấu |
| Auth | Đăng ký/đăng nhập, access token 15 phút, refresh token 7 ngày (băm SHA-256, cookie httpOnly, xoay vòng, phát hiện dùng lại), argon2, giới hạn 5 lần/phút |
| Đơn hàng | Giá luôn tính lại ở server; kiểm tra tùy chọn bắt buộc/max_select/hết món; trừ lượt coupon có điều kiện trong cùng transaction; luồng trạng thái chặt (đơn nhận tại quầy bỏ bước giao); COD hoàn thành → đã thanh toán; hủy đơn hoàn lượt coupon |
| Thời gian thực | Khách theo dõi đơn theo mã, nhân viên nhận đơn mới/đổi trạng thái/nhận tiền tức thì |
| Thanh toán (GĐ 4) | VNPay 2.1.0 (HMAC-SHA512) và MoMo v2 (HMAC-SHA256): tạo link, return URL, IPN; idempotent theo `transaction_id`; kiểm tra số tiền; đơn online chỉ được xác nhận khi đã trả; thanh toán lại khi thất bại; đối soát mỗi phút (querydr / query) và tự hủy đơn quá hạn chưa trả (mặc định 15 phút, hoàn lượt mã giảm giá) |
| Hiệu năng | Redis cache thực đơn 5 phút (tự bỏ qua nếu Redis tắt); ISR trang chủ & chi tiết món + `revalidateTag` khi admin sửa món |
| Giao diện | Bố cục kiểu Linear với **màu thương hiệu lấy từ logo**: accent cam `#fa7d2b` (chế độ tối, chữ đen trên nút — 7.7:1) / đỏ `#cc0a13` (chế độ sáng, chữ trắng — 5.8:1) cho CTA/link/focus/active; xanh chanh `#c4fe0b` chỉ làm nền nhãn khuyến mãi với chữ đen (16.7:1); xanh lá `#27a644` giữ cho trạng thái thành công. Nền tối `#080808`, surface `#191d20`, font Inter Variable, lưới 4px, radius 9px, không blur, chuyển động `cubic-bezier(.16,1,.3,1)` và tôn trọng `prefers-reduced-motion`. Token nằm ở `apps/web/app/globals.css` + `tailwind.config.ts`. Có chế độ sáng (nền `#f4f2f4`, thẻ trắng, accent đỏ logo) với nút xoay vòng Theo hệ thống → Sáng → Tối ở header và thanh bên quản trị; lựa chọn lưu trong `localStorage`, script trong `<head>` gắn `data-theme` trước khi vẽ nên không nháy màu. Mobile-first; giỏ hàng lưu khi chưa đăng nhập, thanh giỏ nổi trên mobile, skeleton, toast, món "Hết món" chuyển xám và khóa nút |
| Quản trị (GĐ 5) | `/admin` tổng quan hôm nay; `/admin/don-hang` bảng đơn realtime + tìm theo mã/SĐT/tên không dấu; `/admin/mon` danh sách + sửa nhanh giá/còn món, form thêm/sửa món (slug tự sinh, tải ảnh, nhóm tùy chọn có mẫu Size/Đường/Đá/Topping); `/admin/danh-muc`; `/admin/khuyen-mai` (trạng thái, lượt dùng, bật hiện trang chủ); `/admin/bao-cao` (doanh thu theo ngày giờ VN, so với kỳ trước, theo phương thức thanh toán, top món; bảng thay thế cho biểu đồ). Nhân viên chỉ thấy bảng đơn. Không xóa được danh mục còn món / mã đã có đơn; xóa món/danh mục là xóa mềm và trả lại slug |
| Ảnh món | `POST /admin/uploads`: kiểm tra magic bytes (chỉ JPG/PNG/WebP thật), tối đa 5MB, tên file ngẫu nhiên. Không có `CLOUDINARY_URL` thì lưu `apps/api/uploads` và phục vụ tại `/uploads` (web proxy cùng domain, cache 1 năm); có thì upload có chữ ký lên Cloudinary (chưa thử với khóa thật) |
| Hero ảnh chuyển động | Hero trang chủ có nền ảnh món tự chuyển (mờ dần + zoom chậm Ken Burns, 6 giây/ảnh), vùng hero luôn dùng token tối (`.theme-dark`) với lớp phủ đen nhẹ để ảnh giữ màu và chữ trắng đọc rõ ở cả hai theme (phủ sáng làm ảnh bị bạc), chú thích "Trong ảnh: <món>" dẫn tới trang món, thanh tiến trình chọn ảnh + nút tạm dừng. Tự dừng khi rê chuột/focus, khi tab ẩn, và không tự chạy nếu bật giảm chuyển động. Chỉ tải trước ảnh hiện tại + kế tiếp. Ảnh lấy từ Unsplash (giấy phép miễn phí) — thay bằng ảnh thật của quán trong `apps/web/lib/hero-slides.ts` |
| Kiểm thử & vận hành (GĐ 6) | E2E API (Supertest, 9 kịch bản: thực đơn, giá tính ở server, mã giảm giá, quyền xem đơn, refresh token, luồng trạng thái, VNPay giả lập + chữ ký sai + IPN lặp, đối soát hủy đơn quá hạn) và E2E web (Playwright, desktop + mobile, gồm cập nhật realtime qua Socket.IO). Log JSON bằng Pino (mỗi request 1 dòng, có `x-request-id`, không ghi token/cookie). Sentry cho API và web (chỉ bật khi có DSN; SDK trình duyệt tải lười sau khi trang load). `GET /api/v1/health` kiểm tra database + Redis cho giám sát uptime. Sao lưu hằng ngày (service `backup` trong docker-compose hoặc `pnpm db:backup`), giữ 14 bản. CI: lint → test → build → e2e → Lighthouse → deploy staging; production deploy tay có duyệt. Tối ưu tải trang: gói `@foodhub/shared` xuất ESM để tree-shake (trang chủ bớt ~130KB JS), ngăn kéo giỏ hàng/hộp tùy chọn tải khi mở, ảnh hero thứ hai tải sau khi trang load |
| Hero ưu đãi | Trang chủ có khối "Ưu đãi hôm nay" lấy từ `GET /coupons/public`: chỉ mã `is_public`, còn hạn, còn lượt, xếp theo mức giảm. Thẻ chính + thẻ vé; sao chép mã, "Áp dụng" gắn mã vào giỏ (server vẫn kiểm tra lại lúc thanh toán); hiện điều kiện, hạn dùng, số lượt còn. Admin sửa mã → xóa cache Redis và `revalidateTag('promos')`. Muốn quảng bá mã thì đặt `isPublic: true` (+ `description`) qua `POST/PATCH /admin/coupons` |

## Chưa làm (giai đoạn sau)

- Hoàn tiền qua API cổng thanh toán (hiện trang quản trị chỉ gắn nhãn "Cần hoàn tiền" cho đơn đã trả nhưng bị hủy).
- Đăng nhập Google, đánh giá món (bảng `reviews` đã sẵn) — món seed vẫn dùng ảnh minh họa emoji cho tới khi tải ảnh thật.
- Quản lý người dùng/nhân viên trên giao diện (API `GET /admin/users` đã có), xuất báo cáo CSV/Excel.
- Email xác nhận đơn (BullMQ) — kế hoạch có nhắc, chưa làm.
- Deploy thật: cần chọn nền tảng/tên miền và tạo tài khoản (xem "Triển khai" bên dưới).

## Triển khai

Theo kế hoạch: **Vercel** cho web, **Render** cho API + PostgreSQL + Redis (region Singapore).

1. **Render** → New → Blueprint → chọn repo: `render.yaml` tạo API (Docker), database, Redis. Điền các biến `sync: false` (WEB_URL, API_PUBLIC_URL, REVALIDATE_SECRET, CLOUDINARY_URL, SENTRY_DSN, khóa VNPay/MoMo). Ổ đĩa container trên Render không giữ file → **bắt buộc dùng Cloudinary** cho ảnh món. Migration chạy tự động khi container khởi động; lần đầu chạy seed bằng Render Shell: `npx prisma db seed`.
2. **Vercel** → Import repo, Root Directory `apps/web`. Biến môi trường: `API_URL` và `NEXT_PUBLIC_SOCKET_URL` (= URL API trên Render), `REVALIDATE_SECRET`, `NEXT_PUBLIC_SITE_URL` (tên miền web), tùy chọn `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`. `API_URL` được đóng vào bản build (rewrites) — đổi thì phải build lại.
3. **GitHub** → Settings → Environments: tạo `staging` và `production` (bật *Required reviewers* cho production). Secrets: `STAGING_API_DEPLOY_HOOK`, `STAGING_WEB_DEPLOY_HOOK`, `PRODUCTION_API_DEPLOY_HOOK`, `PRODUCTION_WEB_DEPLOY_HOOK` (Deploy Hook URL của Render/Vercel); biến `PRODUCTION_HEALTH_URL` = `https://<api>/api/v1/health`. Push `main` → CI xanh → staging tự deploy; production: Actions → *Deploy production* → gõ `deploy`.
4. **Giám sát**: tạo monitor HTTP cho `/api/v1/health` (UptimeRobot/Better Stack, 1–5 phút) và trang chủ. Sentry: tạo 2 project (Node, Next.js) rồi điền DSN.

Tự host trên VPS: `docker compose --profile full up -d --build` (thêm service `backup` chạy 03:00 hằng ngày vào `./backups`, giữ 14 bản). Đặt Caddy/Nginx phía trước để có HTTPS; build image web với `--build-arg API_URL=...`.

## Thanh toán VNPay / MoMo

| Endpoint | Ai gọi | Việc |
|---|---|---|
| `GET /payments/methods` | web | Cổng nào đang bật, hạn thanh toán |
| `POST /payments/:orderId/vnpay` hoặc `/momo` | web | Tạo link thanh toán cho đơn |
| `GET /payments/vnpay/return`, `GET /payments/momo/return` | trình duyệt khách | Xác thực chữ ký, ghi nhận, chuyển về `/don-hang/:code?payment=success` hoặc `failed` |
| `GET /payments/vnpay/ipn` | VNPay | Trả `{ RspCode, Message }` theo chuẩn VNPay |
| `POST /payments/momo/ipn` | MoMo | Trả 204 khi chữ ký hợp lệ |
| `POST /admin/payments/reconcile` | admin | Chạy đối soát ngay (job tự chạy mỗi phút) |

**Trên máy dev**, `PAYMENT_MOCK=true` bật cổng giả lập tại `/payments/mock/...`: kết quả được ký HMAC và đi qua đúng bộ xác thực, IPN, idempotent như cổng thật, không gọi ra ngoài. Cổng nào có khóa thật trong `.env` sẽ dùng khóa thật; production luôn tắt giả lập.

**Chạy sandbox thật**
1. Đăng ký VNPay sandbox (https://sandbox.vnpayment.vn/devreg/) và tài khoản test MoMo (developers.momo.vn), điền `VNPAY_*`, `MOMO_*` trong `apps/api/.env`.
2. Mở tunnel tới cổng 4000 (vd. `cloudflared tunnel --url http://localhost:4000`), đặt `API_PUBLIC_URL` = URL tunnel.
3. Khai báo IPN URL `<API_PUBLIC_URL>/api/v1/payments/vnpay/ipn` trong trang merchant VNPay (MoMo nhận `ipnUrl` theo từng giao dịch).

Phần gọi cổng thật (tạo link MoMo, `querydr` của VNPay, `query` của MoMo) được viết theo tài liệu công khai nhưng **chưa chạy thử với sandbox** vì chưa có khóa merchant — cần kiểm tra lại khi có khóa.

## Ghi chú thiết kế

- Bảng `orders` có thêm `customer_name`, `customer_phone`, `coupon_id` so với kế hoạch vì khách vãng lai nhận tại quầy không có địa chỉ.
- Trình duyệt gọi API qua rewrite `/api/v1/*` của Next.js để cookie refresh token nằm cùng domain frontend; middleware chặn `/tai-khoan`, `/admin` khi chưa có phiên, quyền thực sự do API kiểm tra.
- Đơn của khách vãng lai xem được bằng mã đơn (6 ký tự ngẫu nhiên); đơn của thành viên chỉ chủ đơn và nhân viên xem được.
- `next.config.ts` chỉ bật `output: 'standalone'` khi `NEXT_STANDALONE=1` (Dockerfile đặt sẵn) vì trên Windows chế độ này cần quyền tạo symlink.

## Câu hỏi cần chốt (từ kế hoạch)

Một hay nhiều chi nhánh · VNPay, MoMo hay cả hai · tự giao hay tích hợp GHN/Ahamove · ngân sách hạ tầng.
