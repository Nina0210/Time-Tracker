create extension if not exists pgcrypto;

create table if not exists public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null,
  weekly_target numeric(6,2) not null check (weekly_target >= 0 and weekly_target <= 168),
  workdays smallint[] not null default array[1,2,3,4,5]::smallint[],
  created_at timestamptz not null default now(),
  unique (user_id, effective_from),
  check (cardinality(workdays) > 0),
  check (workdays <@ array[1,2,3,4,5,6,7]::smallint[])
);

create table if not exists public.absences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  kind text not null check (kind in ('vacation', 'sick')),
  hours_per_day numeric(5,2) not null check (hours_per_day > 0 and hours_per_day <= 24),
  note text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_date date not null,
  hours numeric(7,2) not null check (hours <> 0),
  note text,
  created_at timestamptz not null default now()
);

alter table public.work_schedules enable row level security;
alter table public.absences enable row level security;
alter table public.balance_adjustments enable row level security;

create policy "Users manage their own work schedules" on public.work_schedules
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own absences" on public.absences
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own balance adjustments" on public.balance_adjustments
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists work_schedules_user_date_idx
  on public.work_schedules (user_id, effective_from);
create index if not exists absences_user_dates_idx
  on public.absences (user_id, start_date, end_date);
create index if not exists balance_adjustments_user_date_idx
  on public.balance_adjustments (user_id, effective_date);
