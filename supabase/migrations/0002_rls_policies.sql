-- ============================================================
-- FematTech — 0002 Row Level Security
-- Nguyên tắc: SELECT mở cho mọi user 'active' (không ẩn dữ liệu theo cấp bậc);
-- INSERT/UPDATE/DELETE bị kiểm soát theo vai trò.
-- ============================================================

-- ---------- Helper functions (SECURITY DEFINER để tránh đệ quy RLS) ----------
create or replace function current_user_role()
returns system_role language sql stable security definer
set search_path = public as $$
  select system_role from users where id = auth.uid();
$$;

create or replace function is_active_user()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from users
    where id = auth.uid() and account_status = 'active'
  );
$$;

create or replace function is_admin_or_above()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and account_status = 'active'
      and system_role in ('super_admin', 'admin')
  );
$$;

create or replace function can_assign_tasks()
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and account_status = 'active'
      and system_role in ('super_admin', 'admin', 'executive', 'manager')
  );
$$;

-- ---------- Bật RLS ----------
alter table departments        enable row level security;
alter table users              enable row level security;
alter table tasks              enable row level security;
alter table task_assignees     enable row level security;
alter table task_daily_updates enable row level security;
alter table task_comments      enable row level security;
alter table task_attachments   enable row level security;
alter table notifications      enable row level security;
alter table activity_logs      enable row level security;

-- ---------- users ----------
-- Xem: chính mình luôn xem được (để hiện màn chờ duyệt); user active xem được mọi người.
create policy users_select on users for select
  using (id = auth.uid() or is_active_user());
-- Ghi: chỉ Admin/Super Admin (duyệt tài khoản, đổi vai trò/phòng ban, khoá).
create policy users_insert_admin on users for insert
  with check (is_admin_or_above());
create policy users_update_admin on users for update
  using (is_admin_or_above()) with check (is_admin_or_above());
create policy users_delete_superadmin on users for delete
  using (current_user_role() = 'super_admin');

-- ---------- departments ----------
create policy departments_select on departments for select
  using (is_active_user());
create policy departments_insert_admin on departments for insert
  with check (is_admin_or_above());
create policy departments_update_admin on departments for update
  using (is_admin_or_above()) with check (is_admin_or_above());
create policy departments_delete_admin on departments for delete
  using (is_admin_or_above());

-- ---------- tasks ----------
create policy tasks_select on tasks for select
  using (is_active_user());
-- Tạo: người tạo phải là chính mình; Manager+ tạo cho bất kỳ, Staff tạo cho mình.
create policy tasks_insert on tasks for insert
  with check (
    created_by = auth.uid()
    and (can_assign_tasks() or current_user_role() = 'staff')
  );
-- Sửa: Manager+, người tạo, người duyệt, hoặc người được gán vào task.
create policy tasks_update on tasks for update
  using (
    can_assign_tasks()
    or created_by = auth.uid()
    or approver_id = auth.uid()
    or exists (
      select 1 from task_assignees ta
      where ta.task_id = tasks.id and ta.user_id = auth.uid()
    )
  )
  with check (
    can_assign_tasks()
    or created_by = auth.uid()
    or approver_id = auth.uid()
    or exists (
      select 1 from task_assignees ta
      where ta.task_id = tasks.id and ta.user_id = auth.uid()
    )
  );
-- Xoá: người tạo hoặc Manager+.
create policy tasks_delete on tasks for delete
  using (can_assign_tasks() or created_by = auth.uid());

-- ---------- task_assignees ----------
create policy task_assignees_select on task_assignees for select
  using (is_active_user());
create policy task_assignees_insert on task_assignees for insert
  with check (
    can_assign_tasks()
    or exists (select 1 from tasks t where t.id = task_id and t.created_by = auth.uid())
  );
create policy task_assignees_delete on task_assignees for delete
  using (
    can_assign_tasks()
    or exists (select 1 from tasks t where t.id = task_id and t.created_by = auth.uid())
  );

-- ---------- task_daily_updates ----------
create policy daily_updates_select on task_daily_updates for select
  using (is_active_user());
-- Chỉ người được gán vào task tự báo cáo, cho chính mình.
create policy daily_updates_insert on task_daily_updates for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from task_assignees ta
      where ta.task_id = task_id and ta.user_id = auth.uid()
    )
  );
create policy daily_updates_update_own on task_daily_updates for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- task_comments ----------
create policy comments_select on task_comments for select
  using (is_active_user());
create policy comments_insert on task_comments for insert
  with check (user_id = auth.uid() and is_active_user());
create policy comments_update_own on task_comments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_delete_own_or_admin on task_comments for delete
  using (user_id = auth.uid() or is_admin_or_above());

-- ---------- task_attachments ----------
create policy attachments_select on task_attachments for select
  using (is_active_user());
create policy attachments_insert on task_attachments for insert
  with check (uploaded_by = auth.uid() and is_active_user());
create policy attachments_delete on task_attachments for delete
  using (uploaded_by = auth.uid() or can_assign_tasks());

-- ---------- notifications (riêng tư) ----------
create policy notifications_select_own on notifications for select
  using (recipient_id = auth.uid());
create policy notifications_update_own on notifications for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
-- Không cho client INSERT (chỉ trigger/service-role được sinh thông báo).
create policy notifications_no_client_insert on notifications for insert
  with check (false);

-- ---------- activity_logs ----------
-- Xem mở cho user active (minh bạch truy trách nhiệm); client không được ghi.
create policy activity_logs_select on activity_logs for select
  using (is_active_user());
create policy activity_logs_no_client_insert on activity_logs for insert
  with check (false);
