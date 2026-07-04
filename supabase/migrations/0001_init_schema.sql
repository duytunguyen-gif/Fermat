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
