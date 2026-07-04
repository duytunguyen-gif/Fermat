# Hướng dẫn cài đặt FematTech

Tài liệu này giúp bạn dựng môi trường chạy được từ con số 0: tạo Supabase, bật
đăng nhập Google, chạy database migration và điền biến môi trường.

> Ước tính thời gian: ~20–30 phút. Cần: tài khoản Google, quyền tạo project trên
> [supabase.com](https://supabase.com) và [console.cloud.google.com](https://console.cloud.google.com).

---

## 1. Cài đặt phụ thuộc & chạy thử

```bash
npm install
npm run dev
```

Mở http://localhost:3100 — bạn sẽ được chuyển tới `/login`. Nút đăng nhập Google
chưa hoạt động cho tới khi hoàn tất các bước dưới.

---

## 2. Tạo project Supabase

1. Vào https://supabase.com → **New project**.
2. Đặt tên (vd `femattech`), chọn **Region: Southeast Asia (Singapore)** cho độ trễ thấp ở VN.
3. Đặt mật khẩu database (lưu lại) → **Create new project**, chờ ~2 phút.

### Lấy khoá API

Vào **Project Settings → API**, sao chép 3 giá trị:

| Giá trị trên Supabase        | Biến trong `.env.local`             |
| ---------------------------- | ----------------------------------- |
| Project URL                  | `NEXT_PUBLIC_SUPABASE_URL`          |
| `anon` / `publishable` key   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`     |
| `service_role` key (bí mật)  | `SUPABASE_SERVICE_ROLE_KEY`         |

> ⚠️ `service_role` bỏ qua mọi RLS — **không** để lộ ra client, **không** commit lên git.

---

## 3. Chạy database migration

Có 2 cách:

### Cách A — SQL Editor (nhanh nhất, khuyến nghị)

Mở **SQL Editor** trên dashboard Supabase → **New query**, dán **toàn bộ** nội dung
file `supabase/schema.sql` (đã gộp sẵn cả 4 migration đúng thứ tự) → **Run**.

> Nếu muốn chạy từng bước, có thể dán lần lượt 4 file trong `supabase/migrations/`
> theo thứ tự `0001 → 0002 → 0003 → 0004`.

### Cách B — Supabase CLI

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### Bật pg_cron (cho cảnh báo quá hạn)

File `0003` cần extension **pg_cron**. Nếu chạy `0003` báo lỗi thiếu pg_cron:
vào **Database → Extensions**, tìm và bật `pg_cron`, rồi chạy lại `0003`.
(Job đã lên lịch chạy 01:00 UTC = 08:00 VN mỗi ngày để sinh thông báo sắp đến hạn/quá hạn.)

---

## 4. Bật đăng nhập Google

### 4.1. Tạo OAuth Client trên Google Cloud

1. Vào https://console.cloud.google.com → tạo/ chọn một project.
2. **APIs & Services → OAuth consent screen**: chọn **External**, điền tên app,
   email hỗ trợ, lưu. (Có thể để chế độ Testing và thêm email nội bộ vào Test users.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs**: thêm URL callback của Supabase:
     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```
     (lấy `<project-ref>` từ Project URL).
4. Bấm **Create**, lưu lại **Client ID** và **Client secret**.

### 4.2. Cấu hình trên Supabase

1. Vào **Authentication → Sign In / Providers → Google**, bật **Enable**.
2. Dán **Client ID** và **Client Secret** từ bước trên, **Save**.
3. Vào **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3100` (đổi sang domain thật khi deploy).
   - **Redirect URLs**: thêm `http://localhost:3100/**` (và domain production sau này).

---

## 5. Điền biến môi trường

Sao chép `.env.example` → `.env.local` và điền:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPER_ADMIN_EMAIL=ban@congty.com   # email Google của bạn — sẽ thành Super Admin
NEXT_PUBLIC_SITE_URL=http://localhost:3100
```

---

## 6. Đăng nhập lần đầu

```bash
npm run dev
```

1. Mở http://localhost:3100 → **Đăng nhập bằng Google**.
2. Đăng nhập bằng email đặt ở `SUPER_ADMIN_EMAIL` → bạn được cấp **Super Admin +
   Active** ngay, vào thẳng dashboard.
3. Các email khác đăng nhập lần đầu sẽ ở trạng thái **Chờ duyệt** (`/pending`) cho
   tới khi bạn (Super Admin/Admin) duyệt trong module Người dùng (Cụm 1).

> Nếu quên đặt `SUPER_ADMIN_EMAIL`, người đăng nhập **đầu tiên** sẽ tự động thành
> Super Admin (cơ chế bootstrap). Có thể sửa vai trò trực tiếp trong bảng `users`
> trên Supabase nếu cần.

---

## Kiến trúc & lộ trình

Xem file kế hoạch (thư mục `.claude/plans/`) để biết chi tiết schema, phân quyền
RLS và lộ trình các cụm tính năng (Cụm 0 → Cụm 6).
