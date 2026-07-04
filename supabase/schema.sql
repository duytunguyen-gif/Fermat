-- ============================================================
-- FematTech — TOÀN BỘ SCHEMA (gộp 0001..0004)
-- Dán toàn bộ file này vào Supabase SQL Editor và Run 1 lần.
-- ============================================================


-- >>> migrations/0001_init_schema.sql

-- ============================================================
-- FematTech — 0001 Init schema
-- Enum types, 10 bảng nghiệp vụ, index phục vụ dashboard.
-- ============================================================

-- ---------- ENUM TYPES ----------
create type system_role as enum (
  'super_admin', 'executive', 'admin', 'manager', 'staff'
);

create type account_status as enum ('pending', 'active', 'suspended');

-- Vai trò trong phạm vi MỘT công việc (khác với system_role toàn cục):
create type task_participation_role as enum ('lead', 'collaborator');

create type task_status as enum (
  'not_started',      -- Chưa làm
  'in_progress',      -- Đang xử lý
  'waiting_customer', -- Chờ khách hàng phản hồi
  'pending_approval', -- Chờ duyệt
  'needs_revision',   -- Cần chỉnh sửa
  'completed',        -- Hoàn thành
  'cancelled'         -- Huỷ
);

create type task_priority as enum ('low', 'normal', 'high', 'urgent');

create type task_type as enum ('project', 'routine', 'periodic', 'ad_hoc');

create type notification_type as enum (
  'task_assigned', 'status_changed', 'approval_requested',
  'approved', 'revision_requested', 'due_soon', 'overdue',
  'comment_added', 'mentioned'
);

create type activity_action as enum (
  'created', 'updated', 'deleted', 'status_changed',
  'assignee_added', 'assignee_removed', 'commented',
  'attachment_added', 'attachment_removed', 'approved', 'revision_requested'
);

-- ---------- departments ----------
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- users (mở rộng auth.users 1-1) ----------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  system_role system_role not null default 'staff',
  account_status account_status not null default 'pending',
  department_id uuid references departments(id) on delete set null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_users_department on users(department_id);
create index idx_users_role on users(system_role);
create index idx_users_status on users(account_status);

-- ---------- tasks ----------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  task_type task_type not null default 'ad_hoc',
  department_id uuid not null references departments(id) on delete restrict,
  created_by uuid not null references users(id) on delete restrict,
  approver_id uuid references users(id) on delete set null,
  status task_status not null default 'not_started',
  priority task_priority not null default 'normal',
  start_date date,
  due_date date,
  completed_at timestamptz,
  cancelled_reason text,
  revision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_dates
    check (due_date is null or start_date is null or due_date >= start_date),
  constraint chk_completed_consistency check (
    (status = 'completed' and completed_at is not null) or
    (status <> 'completed' and completed_at is null)
  )
);
create index idx_tasks_status on tasks(status);
create index idx_tasks_department on tasks(department_id);
create index idx_tasks_created_by on tasks(created_by);
create index idx_tasks_approver on tasks(approver_id);
create index idx_tasks_dept_status on tasks(department_id, status);
create index idx_tasks_status_due on tasks(status, due_date);
create index idx_tasks_open_due on tasks(due_date)
  where status not in ('completed', 'cancelled');

-- ---------- task_assignees ----------
create table task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  participation_role task_participation_role not null default 'collaborator',
  assigned_by uuid not null references users(id) on delete restrict,
  assigned_at timestamptz not null default now(),

  unique (task_id, user_id)
);
create index idx_task_assignees_task on task_assignees(task_id);
create index idx_task_assignees_user on task_assignees(user_id);
create index idx_task_assignees_user_role on task_assignees(user_id, participation_role);
-- Mỗi task tối đa 1 người phụ trách chính:
create unique index uq_task_single_lead on task_assignees(task_id)
  where participation_role = 'lead';

-- ---------- task_daily_updates ----------
create table task_daily_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete restrict,
  update_date date not null default current_date,
  progress_percent smallint check (progress_percent between 0 and 100),
  content text not null,
  created_at timestamptz not null default now(),

  unique (task_id, user_id, update_date)
);
create index idx_daily_updates_task on task_daily_updates(task_id, update_date desc);

-- ---------- task_comments ----------
create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references users(id) on delete restrict,
  content text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_task_comments_task on task_comments(task_id, created_at);

-- ---------- task_attachments ----------
create table task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  uploaded_by uuid not null references users(id) on delete restrict,
  attachment_type text not null check (attachment_type in ('file', 'link')),
  file_path text,
  url text,
  file_name text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),

  constraint chk_attachment_source check (
    (attachment_type = 'file' and file_path is not null) or
    (attachment_type = 'link' and url is not null)
  )
);
create index idx_task_attachments_task on task_attachments(task_id);

-- ---------- notifications ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references users(id) on delete cascade,
  type notification_type not null,
  task_id uuid references tasks(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_recipient
  on notifications(recipient_id, is_read, created_at desc);
create index idx_notifications_task on notifications(task_id);

-- ---------- activity_logs ----------
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  task_id uuid references tasks(id) on delete set null,
  actor_id uuid references users(id) on delete set null,
  action activity_action not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_logs_task on activity_logs(task_id, created_at desc);
create index idx_activity_logs_entity on activity_logs(entity_type, entity_id);
create index idx_activity_logs_actor on activity_logs(actor_id, created_at desc);


-- >>> migrations/0002_rls_policies.sql

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


-- >>> migrations/0003_triggers.sql

-- ============================================================
-- FematTech — 0003 Triggers & tự động hoá
--  1) set_updated_at            : tự cập nhật cột updated_at
--  2) transition guard          : kiểm soát luồng trạng thái + quyền duyệt
--  3) activity log              : ghi lịch sử thao tác tự động
--  4) notifications             : sinh thông báo in-app
--  5) due/overdue (pg_cron)     : cảnh báo sắp đến hạn / quá hạn
-- ============================================================

-- ---------- 1) updated_at ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_departments_updated_at before update on departments
  for each row execute function set_updated_at();
create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();
create trigger trg_tasks_updated_at before update on tasks
  for each row execute function set_updated_at();
create trigger trg_task_comments_updated_at before update on task_comments
  for each row execute function set_updated_at();

-- ---------- 2) Transition guard ----------
create or replace function validate_task_status_transition()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  is_approver boolean;
begin
  if new.status = old.status then
    return new;
  end if;

  is_approver := (old.approver_id = auth.uid()) or is_admin_or_above();

  -- Không thể đổi trạng thái sau khi đã Hoàn thành hoặc đã Huỷ.
  if old.status in ('completed', 'cancelled') then
    raise exception 'Không thể đổi trạng thái của công việc đã % .', old.status;
  end if;

  -- Kiểm tra luồng hợp lệ (khớp TASK_STATUS_TRANSITIONS phía app).
  if not (
    (old.status = 'not_started'      and new.status in ('in_progress', 'cancelled')) or
    (old.status = 'in_progress'      and new.status in ('waiting_customer', 'pending_approval', 'cancelled')) or
    (old.status = 'waiting_customer' and new.status in ('in_progress', 'cancelled')) or
    (old.status = 'pending_approval' and new.status in ('completed', 'needs_revision', 'cancelled')) or
    (old.status = 'needs_revision'   and new.status in ('in_progress', 'cancelled'))
  ) then
    raise exception 'Chuyển trạng thái không hợp lệ: % -> %.', old.status, new.status;
  end if;

  -- Chỉ người duyệt (hoặc Admin+) được Hoàn thành / yêu cầu Chỉnh sửa.
  if new.status = 'completed' then
    if not is_approver then
      raise exception 'Chỉ người duyệt mới được chuyển sang Hoàn thành.';
    end if;
    new.completed_at := now();
  elsif new.status = 'needs_revision' then
    if not is_approver then
      raise exception 'Chỉ người duyệt mới được yêu cầu chỉnh sửa.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validate_task_status
  before update of status on tasks
  for each row execute function validate_task_status_transition();

-- ---------- 3) Activity log ----------
create or replace function log_activity()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_action activity_action;
  v_task_id uuid;
  v_entity_id uuid;
begin
  v_entity_id := coalesce(new.id, old.id);

  if tg_table_name = 'tasks' then
    v_task_id := v_entity_id;
    if tg_op = 'INSERT' then v_action := 'created';
    elsif tg_op = 'DELETE' then v_action := 'deleted';
    elsif old.status is distinct from new.status then v_action := 'status_changed';
    else v_action := 'updated';
    end if;
  else
    v_task_id := coalesce(new.task_id, old.task_id);
    if tg_table_name = 'task_assignees' then
      v_action := case tg_op when 'INSERT' then 'assignee_added'
                             else 'assignee_removed' end;
    elsif tg_table_name = 'task_comments' then
      v_action := case tg_op when 'INSERT' then 'commented'
                             when 'DELETE' then 'deleted'
                             else 'updated' end;
    elsif tg_table_name = 'task_attachments' then
      v_action := case tg_op when 'INSERT' then 'attachment_added'
                             else 'attachment_removed' end;
    else
      v_action := case tg_op when 'INSERT' then 'created'
                             when 'DELETE' then 'deleted'
                             else 'updated' end;
    end if;
  end if;

  -- Tránh vi phạm FK: khi xoá, nếu task tham chiếu không còn thì bỏ trống task_id.
  if tg_op = 'DELETE' and v_task_id is not null
     and not exists (select 1 from tasks where id = v_task_id) then
    v_task_id := null;
  end if;

  insert into activity_logs (
    entity_type, entity_id, task_id, actor_id, action, before_data, after_data
  )
  values (
    tg_table_name, v_entity_id, v_task_id, auth.uid(), v_action,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_log_tasks
  after insert or update or delete on tasks
  for each row execute function log_activity();
create trigger trg_log_task_assignees
  after insert or delete on task_assignees
  for each row execute function log_activity();
create trigger trg_log_task_comments
  after insert or update or delete on task_comments
  for each row execute function log_activity();
create trigger trg_log_task_attachments
  after insert or delete on task_attachments
  for each row execute function log_activity();

-- ---------- 4) Notifications ----------
-- 4a) Giao việc mới
create or replace function notify_task_assigned()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.user_id <> new.assigned_by then
    insert into notifications (recipient_id, type, task_id, actor_id, title)
    values (
      new.user_id, 'task_assigned', new.task_id, new.assigned_by,
      'Bạn được giao một công việc mới'
    );
  end if;
  return new;
end;
$$;
create trigger trg_notify_assigned
  after insert on task_assignees
  for each row execute function notify_task_assigned();

-- 4b) Đổi trạng thái
create or replace function notify_task_status_changed()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_type notification_type;
  v_title text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_type := case new.status
    when 'pending_approval' then 'approval_requested'
    when 'completed'        then 'approved'
    when 'needs_revision'   then 'revision_requested'
    else 'status_changed'
  end;
  v_title := 'Cập nhật công việc: "' || new.title || '"';

  insert into notifications (recipient_id, type, task_id, actor_id, title)
  select distinct r.uid, v_type, new.id, auth.uid(), v_title
  from (
    select new.created_by as uid
    union
    select ta.user_id from task_assignees ta where ta.task_id = new.id
    union
    select new.approver_id where new.approver_id is not null
  ) r
  where r.uid is not null
    and r.uid is distinct from auth.uid();

  return new;
end;
$$;
create trigger trg_notify_status
  after update of status on tasks
  for each row execute function notify_task_status_changed();

-- 4c) Bình luận mới
create or replace function notify_comment_added()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_title text;
begin
  select 'Bình luận mới trong: "' || t.title || '"' into v_title
  from tasks t where t.id = new.task_id;

  insert into notifications (recipient_id, type, task_id, actor_id, title)
  select distinct r.uid, 'comment_added'::notification_type, new.task_id, new.user_id, v_title
  from (
    select t.created_by as uid from tasks t where t.id = new.task_id
    union
    select ta.user_id from task_assignees ta where ta.task_id = new.task_id
    union
    select t.approver_id from tasks t where t.id = new.task_id and t.approver_id is not null
  ) r
  where r.uid is not null
    and r.uid is distinct from new.user_id;

  return new;
end;
$$;
create trigger trg_notify_comment
  after insert on task_comments
  for each row execute function notify_comment_added();

-- ---------- 5) Due-soon / Overdue (pg_cron) ----------
-- Quá hạn KHÔNG tự đổi status — chỉ sinh thông báo, tránh trùng trong cùng ngày.
create or replace function check_due_and_overdue_tasks()
returns void language plpgsql security definer
set search_path = public as $$
begin
  -- Sắp đến hạn trong 2 ngày tới
  insert into notifications (recipient_id, type, task_id, title)
  select distinct r.uid, 'due_soon'::notification_type, t.id,
         'Công việc "' || t.title || '" sắp đến hạn (' || to_char(t.due_date, 'DD/MM') || ')'
  from tasks t
  join lateral (
    select t.created_by as uid
    union
    select ta.user_id from task_assignees ta where ta.task_id = t.id
  ) r on true
  where t.status not in ('completed', 'cancelled')
    and t.due_date between current_date and current_date + 2
    and not exists (
      select 1 from notifications n
      where n.task_id = t.id and n.type = 'due_soon'
        and n.recipient_id = r.uid
        and n.created_at::date = current_date
    );

  -- Đã quá hạn
  insert into notifications (recipient_id, type, task_id, title)
  select distinct r.uid, 'overdue'::notification_type, t.id,
         'Công việc "' || t.title || '" đã quá hạn'
  from tasks t
  join lateral (
    select t.created_by as uid
    union
    select ta.user_id from task_assignees ta where ta.task_id = t.id
  ) r on true
  where t.status not in ('completed', 'cancelled')
    and t.due_date < current_date
    and not exists (
      select 1 from notifications n
      where n.task_id = t.id and n.type = 'overdue'
        and n.recipient_id = r.uid
        and n.created_at::date = current_date
    );
end;
$$;

-- Lên lịch chạy hằng ngày lúc 01:00 UTC (= 08:00 giờ Việt Nam).
-- Yêu cầu extension pg_cron (bật ở Supabase: Database → Extensions → pg_cron).
create extension if not exists pg_cron;
select cron.schedule(
  'femattech-check-due-overdue',
  '0 1 * * *',
  $$select check_due_and_overdue_tasks()$$
);


-- >>> migrations/0004_seed.sql

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

