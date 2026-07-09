-- ============================================================
-- FematTech — 0006 Phân quyền quản lý chấm công
--  Admin có thể TRAO QUYỀN cho người được chỉ định (không cần là admin)
--  để xem toàn bộ dữ liệu chấm công, chỉnh sửa và xuất báo cáo.
--  Cờ users.can_manage_attendance = true → có quyền quản lý chấm công.
-- ============================================================

-- 1) Cờ trao quyền trên users.
alter table users
  add column if not exists can_manage_attendance boolean not null default false;

-- 2) Helper: người dùng hiện tại có quyền quản lý chấm công không?
--    Admin/Super Admin luôn có; hoặc được admin trao cờ can_manage_attendance.
create or replace function has_attendance_access()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and account_status = 'active'
      and (system_role in ('super_admin', 'admin') or can_manage_attendance = true)
  );
$$;

-- 3) Cập nhật chính sách RLS của attendance để bao gồm quyền được trao.
drop policy if exists attendance_select on attendance;
drop policy if exists attendance_insert_self on attendance;
drop policy if exists attendance_update on attendance;
drop policy if exists attendance_delete on attendance;

-- Xem: của mình; người có quyền quản lý chấm công xem TOÀN BỘ;
--      trưởng phòng xem người cùng phòng ban.
create policy attendance_select on attendance for select
  using (
    user_id = auth.uid()
    or has_attendance_access()
    or current_user_role() = 'executive'
    or (
      current_user_role() = 'manager'
      and exists (
        select 1 from users u
        where u.id = attendance.user_id
          and u.department_id = (select department_id from users where id = auth.uid())
      )
    )
  );

-- Tạo: tự chấm cho mình; HOẶC người có quyền quản lý chấm công tạo hộ người khác.
create policy attendance_insert on attendance for insert
  with check (
    (user_id = auth.uid() and recorded_by = auth.uid() and is_active_user())
    or (has_attendance_access() and recorded_by = auth.uid())
  );

-- Sửa: của mình; HOẶC người có quyền quản lý chấm công.
create policy attendance_update on attendance for update
  using (user_id = auth.uid() or has_attendance_access())
  with check (user_id = auth.uid() or has_attendance_access());

-- Xoá: của mình; HOẶC người có quyền quản lý chấm công.
create policy attendance_delete on attendance for delete
  using (user_id = auth.uid() or has_attendance_access());
