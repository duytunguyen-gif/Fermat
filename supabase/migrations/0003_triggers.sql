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
  select distinct r.uid, 'comment_added', new.task_id, new.user_id, v_title
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
  select distinct r.uid, 'due_soon', t.id,
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
  select distinct r.uid, 'overdue', t.id,
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
