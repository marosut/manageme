-- Supabase table and RLS policy migration for ManageMe
-- Run this in the Supabase SQL editor (Database -> SQL) or via Supabase CLI

-- Ensure pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Schedules table
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  title text not null,
  category text,
  memo text,
  created_at timestamptz default now()
);

alter table public.schedules
  add constraint schedules_user_fk foreign key (user_id) references auth.users(id) on delete cascade;

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  task_date date not null,
  title text not null,
  has_time boolean not null default false,
  task_time time null,
  completed boolean not null default false,
  memo text,
  created_at timestamptz default now()
);

alter table public.tasks
  add constraint tasks_user_fk foreign key (user_id) references auth.users(id) on delete cascade;

-- Routines table
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at date default current_date
);

alter table public.routines
  add constraint routines_user_fk foreign key (user_id) references auth.users(id) on delete cascade;

-- Routine completions (one per routine per date per user)
create table if not exists public.routine_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  routine_id uuid not null,
  date date not null,
  completed boolean default true,
  created_at timestamptz default now()
);

alter table public.routine_completions
  add constraint routine_completions_user_fk foreign key (user_id) references auth.users(id) on delete cascade,
  add constraint routine_completions_routine_fk foreign key (routine_id) references public.routines(id) on delete cascade;

create unique index if not exists idx_unique_routine_completion on public.routine_completions(routine_id, user_id, date);

-- Indexes for common queries
create index if not exists idx_schedules_user_day_time on public.schedules (user_id, day_of_week, start_time);
create index if not exists idx_tasks_user_date_time on public.tasks (user_id, task_date, has_time, task_time);
create index if not exists idx_routines_user on public.routines (user_id);

-- Enable Row Level Security and create policies so users can only access their own rows
-- Schedules policies
alter table public.schedules enable row level security;
create policy "schedules_select" on public.schedules for select using (auth.uid() = user_id);
create policy "schedules_insert" on public.schedules for insert with check (auth.uid() = user_id);
create policy "schedules_update" on public.schedules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "schedules_delete" on public.schedules for delete using (auth.uid() = user_id);

-- Tasks policies
alter table public.tasks enable row level security;
create policy "tasks_select" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update" on public.tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_delete" on public.tasks for delete using (auth.uid() = user_id);

-- Routines policies
alter table public.routines enable row level security;
create policy "routines_select" on public.routines for select using (auth.uid() = user_id);
create policy "routines_insert" on public.routines for insert with check (auth.uid() = user_id);
create policy "routines_update" on public.routines for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routines_delete" on public.routines for delete using (auth.uid() = user_id);

-- Routine completions policies
alter table public.routine_completions enable row level security;
create policy "routine_completions_select" on public.routine_completions for select using (auth.uid() = user_id);
create policy "routine_completions_insert" on public.routine_completions for insert with check (auth.uid() = user_id);
create policy "routine_completions_update" on public.routine_completions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routine_completions_delete" on public.routine_completions for delete using (auth.uid() = user_id);

-- That's it. After running this migration, ensure in Supabase > Authentication > Providers you enable Google and configure client ID/secret and redirect URLs.
