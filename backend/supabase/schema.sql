-- Supabase tables used by frontend/src/services/pmesService.js
-- Run in Supabase SQL editor for the current migration stage.

create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pmes_records (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  dob text not null,
  gender text,
  score integer not null check (score >= 0),
  passed boolean not null default false,
  user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.loi_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  address text not null,
  occupation text not null,
  employer text,
  initial_capital numeric(12, 2) not null,
  pmes_record_id uuid references public.pmes_records(id) on delete set null,
  user_id uuid,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_pmes_records_email_dob
  on public.pmes_records(email, dob);

alter table public.user_profiles enable row level security;
alter table public.pmes_records enable row level security;
alter table public.loi_submissions enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.user_profiles;
create policy "profiles_select_own_or_admin"
  on public.user_profiles
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.user_profiles admin
      where admin.user_id = auth.uid()
        and admin.is_admin = true
    )
  );

drop policy if exists "profiles_insert_self_only" on public.user_profiles;
create policy "profiles_insert_self_only"
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "pmes_insert_own" on public.pmes_records;
create policy "pmes_insert_own"
  on public.pmes_records
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "pmes_select_own_or_admin" on public.pmes_records;
create policy "pmes_select_own_or_admin"
  on public.pmes_records
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.user_profiles admin
      where admin.user_id = auth.uid()
        and admin.is_admin = true
    )
  );

drop policy if exists "loi_insert_own" on public.loi_submissions;
create policy "loi_insert_own"
  on public.loi_submissions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "loi_select_own_or_admin" on public.loi_submissions;
create policy "loi_select_own_or_admin"
  on public.loi_submissions
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.user_profiles admin
      where admin.user_id = auth.uid()
        and admin.is_admin = true
    )
  );
