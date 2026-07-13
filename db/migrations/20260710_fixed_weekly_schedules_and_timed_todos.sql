-- Non-destructive migration for fixed weekly schedules and timed todos.
-- Run in Supabase SQL Editor after backing up production data.
-- This migration does not drop or rename existing tables/columns.

alter table public.schedules
  add column if not exists day_of_week int,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists title text,
  add column if not exists category text,
  add column if not exists memo text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'start_at'
  ) then
    update public.schedules
    set
      day_of_week = coalesce(day_of_week, extract(dow from (start_at at time zone 'Asia/Seoul'))::int),
      start_time = coalesce(start_time, (start_at at time zone 'Asia/Seoul')::time)
    where start_at is not null
      and (day_of_week is null or start_time is null);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'end_at'
  ) then
    update public.schedules
    set end_time = coalesce(end_time, (end_at at time zone 'Asia/Seoul')::time)
    where end_at is not null
      and end_time is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'description'
  ) then
    update public.schedules
    set
      memo = coalesce(memo, description),
      title = coalesce(title, nullif(description, ''), '일정')
    where memo is null
       or title is null;
  end if;
end $$;

update public.schedules
set
  title = coalesce(title, '일정'),
  category = nullif(category, ''),
  memo = nullif(memo, '')
where title is null
   or category = ''
   or memo = '';

do $$
begin
  if not exists (
    select 1 from public.schedules
    where day_of_week is null
       or start_time is null
       or end_time is null
       or title is null
  ) then
    alter table public.schedules
      alter column day_of_week set not null,
      alter column start_time set not null,
      alter column end_time set not null,
      alter column title set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'schedules_day_of_week_range'
      and conrelid = 'public.schedules'::regclass
  ) then
    alter table public.schedules
      add constraint schedules_day_of_week_range check (day_of_week between 0 and 6) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'schedules_time_order'
      and conrelid = 'public.schedules'::regclass
  ) then
    alter table public.schedules
      add constraint schedules_time_order check (end_time > start_time) not valid;
  end if;
end $$;

create index if not exists idx_schedules_user_day_time
  on public.schedules (user_id, day_of_week, start_time);

alter table public.todos
  add column if not exists title text,
  add column if not exists text text,
  add column if not exists has_time boolean not null default false,
  add column if not exists task_time time null,
  add column if not exists memo text null;

update public.todos
set
  title = coalesce(title, text, '할 일'),
  text = coalesce(text, title, '할 일')
where title is null
   or text is null;

update public.todos
set
  has_time = coalesce(has_time, false),
  task_time = case when coalesce(has_time, false) then task_time else null end
where has_time is null
   or (has_time = false and task_time is not null);

do $$
begin
  if not exists (
    select 1 from public.todos
    where title is null
       or has_time is null
  ) then
    alter table public.todos
      alter column title set not null,
      alter column has_time set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'todos_task_time_requires_has_time'
      and conrelid = 'public.todos'::regclass
  ) then
    alter table public.todos
      add constraint todos_task_time_requires_has_time check (has_time or task_time is null) not valid;
  end if;
end $$;

create index if not exists idx_todos_user_date_time
  on public.todos (user_id, date, has_time, task_time);

alter table public.schedules enable row level security;
alter table public.todos enable row level security;

drop policy if exists "schedules_select" on public.schedules;
drop policy if exists "schedules_insert" on public.schedules;
drop policy if exists "schedules_update" on public.schedules;
drop policy if exists "schedules_delete" on public.schedules;

create policy "schedules_select" on public.schedules
  for select using (auth.uid() = user_id);
create policy "schedules_insert" on public.schedules
  for insert with check (auth.uid() = user_id);
create policy "schedules_update" on public.schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "schedules_delete" on public.schedules
  for delete using (auth.uid() = user_id);

drop policy if exists "todos_select" on public.todos;
drop policy if exists "todos_insert" on public.todos;
drop policy if exists "todos_update" on public.todos;
drop policy if exists "todos_delete" on public.todos;

create policy "todos_select" on public.todos
  for select using (auth.uid() = user_id);
create policy "todos_insert" on public.todos
  for insert with check (auth.uid() = user_id);
create policy "todos_update" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "todos_delete" on public.todos
  for delete using (auth.uid() = user_id);
