-- 0007_user_profile.sql
-- Bổ sung các trường hồ sơ cá nhân cho bảng users.
-- Cho phép người dùng khai báo tên thật, mã nhân viên, chức danh, ngày sinh, địa chỉ.
-- (Cột phone đã có sẵn từ 0001.) Việc cập nhật hồ sơ của chính mình được xử lý
-- ở Server Action qua service-role (giới hạn đúng hàng của mình + whitelist cột),
-- nên KHÔNG nới policy RLS ở đây (tránh rủi ro leo quyền).

alter table public.users
  add column if not exists real_name      text,
  add column if not exists employee_code  text,
  add column if not exists job_title      text,
  add column if not exists date_of_birth  date,
  add column if not exists address        text;
