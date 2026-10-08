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

## Kiểm thử

```bash
pnpm test    # shared: node:test · api: Jest · web: Vitest + Testing Library
pnpm lint    # kiểm tra kiểu TypeScript toàn bộ workspace
pnpm build
```

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
| Hero ưu đãi | Trang chủ có khối "Ưu đãi hôm nay" lấy từ `GET /coupons/public`: chỉ mã `is_public`, còn hạn, còn lượt, xếp theo mức giảm. Thẻ chính + thẻ vé; sao chép mã, "Áp dụng" gắn mã vào giỏ (server vẫn kiểm tra lại lúc thanh toán); hiện điều kiện, hạn dùng, số lượt còn. Admin sửa mã → xóa cache Redis và `revalidateTag('promos')`. Muốn quảng bá mã thì đặt `isPublic: true` (+ `description`) qua `POST/PATCH /admin/coupons` |

## Chưa làm (giai đoạn sau)

- Hoàn tiền qua API cổng thanh toán (hiện trang quản trị chỉ gắn nhãn "Cần hoàn tiền" cho đơn đã trả nhưng bị hủy).
- Đăng nhập Google, đánh giá món (bảng `reviews` đã sẵn) — món seed vẫn dùng ảnh minh họa emoji cho tới khi tải ảnh thật.
- Quản lý người dùng/nhân viên trên giao diện (API `GET /admin/users` đã có), xuất báo cáo CSV/Excel.
- Giai đoạn 6: BullMQ email, Sentry, Pino, e2e Playwright/Supertest, tối ưu Lighthouse, deploy, sao lưu.

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
