-- =============================================================================
-- DOPYU: Supabase schema + Row Level Security
-- Paste this whole file into Supabase Dashboard > SQL Editor and run it once.
--
-- Data split (privacy by table):
--   PUBLIC (anyone can read, owner writes)
--     profiles        username, country, icon
--     entries         record time, estimated volume, is_ranked   <- used for rankings
--   PRIVATE (owner only, read and write)
--     private_profiles  birth date
--     entry_details     start time, duration, okazu tags
-- E-mail and password are handled by Supabase Auth (auth.users) and never exposed.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (char_length(username) between 2 and 20),
  country_code text not null default 'JP' check (country_code ~ '^[A-Z]{2}$'),
  avatar       text check (avatar is null or avatar like 'preset:%' or (avatar like 'data:image/%' and char_length(avatar) <= 200000)),
  created_at   timestamptz not null default now()
);

create table if not exists public.private_profiles (
  id         uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null
);

create table if not exists public.entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  completed_at   timestamptz not null,
  volume_ml      real not null check (volume_ml >= 0 and volume_ml <= 10),
  is_ranked      boolean not null default true,
  rank_exclusion text check (rank_exclusion in ('over_120min', 'cooldown', 'daily_limit')),
  created_at     timestamptz not null default now()
);
create index if not exists entries_ranked_time_idx on public.entries (is_ranked, completed_at);
create index if not exists entries_user_time_idx on public.entries (user_id, completed_at);

create table if not exists public.entry_details (
  entry_id         uuid primary key references public.entries (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  start_time       timestamptz not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  tags             text[] not null default '{}'
);
create index if not exists entry_details_user_idx on public.entry_details (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.private_profiles enable row level security;
alter table public.entries          enable row level security;
alter table public.entry_details    enable row level security;

-- profiles: public read, owner write
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile" on public.profiles for delete using (auth.uid() = id);

-- private_profiles: owner only
drop policy if exists "own private profile" on public.private_profiles;
create policy "own private profile" on public.private_profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- entries (ranking data): public read, owner insert/delete (no updates: records are immutable)
drop policy if exists "entries are public" on public.entries;
create policy "entries are public" on public.entries for select using (true);
drop policy if exists "insert own entries" on public.entries;
create policy "insert own entries" on public.entries for insert with check (auth.uid() = user_id);
drop policy if exists "delete own entries" on public.entries;
create policy "delete own entries" on public.entries for delete using (auth.uid() = user_id);

-- entry_details (okazu tags etc.): owner only
drop policy if exists "own entry details" on public.entry_details;
create policy "own entry details" on public.entry_details for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Account deletion: removes the auth user; every row above cascades.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: push ranking changes to every open browser
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.entries;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end $$;
