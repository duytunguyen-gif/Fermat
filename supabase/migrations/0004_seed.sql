-- ============================================================
-- FematTech — 0004 Seed dữ liệu ban đầu
-- Seed 4 phòng ban. Idempotent (chạy lại không nhân đôi).
--
-- Bootstrap Super Admin KHÔNG nằm ở đây: người đăng nhập Google đầu tiên
-- (hoặc email khớp SUPER_ADMIN_EMAIL) được cấp super_admin + active tự động
-- trong route handler src/app/auth/callback/route.ts.
-- ============================================================

insert into departments (name, code, description) values
  ('Ban Lãnh Đạo', 'BLD', 'Ban lãnh đạo công ty'),
  ('Phòng Ứng dụng AI & Chuyển đổi số', 'AI_CDS', 'Tư vấn, triển khai AI và chuyển đổi số'),
  ('Phòng Các kỳ thi', 'EXAM', 'Kỳ thi học thuật quốc tế và phát triển năng lực học sinh'),
  ('Phòng Kế toán', 'ACC', 'Kế toán, tài chính')
on conflict (code) do nothing;
