create table if not exists public.overtime_reduction_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  planned_date date not null,
  hours numeric(6,2) not null check (hours > 0 and hours <= 168),
  note text,
  time_taken boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.overtime_reduction_plans enable row level security;

create policy "Users manage their own overtime reduction plans"
  on public.overtime_reduction_plans
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists overtime_reduction_plans_user_date_idx
  on public.overtime_reduction_plans (user_id, planned_date);

notify pgrst, 'reload schema';
