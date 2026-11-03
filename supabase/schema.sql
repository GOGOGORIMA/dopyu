-- =============================================================================
-- DOPYU: Supabase schema + Row Level Security
-- Paste this whole file into Supabase Dashboard > SQL Editor and run it (safe to re-run;
-- it also migrates databases created with the earlier schema).
--
-- Privacy by design: the server stores competition data plus an owner-only birth date.
--   profiles          PUBLIC      user ID, username, preset icon ID, country code
--   records           PUBLIC      user ID, completion time (UTC), measured seconds, estimated volume (ml), is_ranked
--                                 volume_ml is fixed by the server at insert time from the owner's birth date
--                                 (trigger below), so totals never drift between devices or after birthdays.
--   private_profiles  OWNER ONLY  birth date (age check / volume estimate; never shown to anyone else)
-- Never stored on the server (kept in the user's browser localStorage only):
--   okazu tags (Sauce), stopwatch start time, ranking-exclusion reason.
-- Icons are built-in preset IDs only; there is no image upload.
-- E-mail and password are handled by Supabase Auth (auth.users) and never exposed.
-- There is no column for tags at all, so a client cannot store them even by mistake.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
-- Earlier versions called the records table "entries"
do $$
begin
  if to_regclass('public.entries') is not null and to_regclass('public.records') is null then
    alter table public.entries rename to records;
    drop policy if exists "entries are public" on public.records;
    drop policy if exists "insert own entries" on public.records;
    drop policy if exists "delete own entries" on public.records;
    alter table public.records drop constraint if exists entries_volume_ml_check;
    alter table public.records drop constraint if exists entries_duration_seconds_check;
    drop index if exists public.entries_ranked_time_idx;
    drop index if exists public.entries_user_time_idx;
  end if;
end $$;

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique,
  country_code  text not null default 'JP',
  avatar_preset text
);

create table if not exists public.private_profiles (
  id         uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null check (birth_date > date '1900-01-01')
);

create table if not exists public.records (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  completed_at     timestamptz not null,
  duration_seconds integer not null default 0,
  volume_ml        real not null,
  is_ranked        boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Migration from the earlier schema (no-ops on a fresh database)
-- ---------------------------------------------------------------------------
alter table public.records add column if not exists duration_seconds integer not null default 0;
alter table public.profiles add column if not exists avatar_preset text;

do $$
begin
  -- Carry over measured seconds, then drop the private detail table (tags, start time)
  if to_regclass('public.entry_details') is not null then
    update public.records e set duration_seconds = d.duration_seconds
      from public.entry_details d where d.entry_id = e.id;
    drop table public.entry_details;
  end if;
  -- Keep only preset icons (image upload has been removed)
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar') then
    update public.profiles set avatar_preset = substring(avatar from '^preset:([a-z0-9_-]{1,32})$')
      where avatar_preset is null;
    alter table public.profiles drop column avatar;
  end if;
end $$;

alter table public.profiles drop column if exists created_at;
alter table public.records  drop column if exists rank_exclusion;
alter table public.records  drop column if exists created_at;

-- ---------------------------------------------------------------------------
-- Constraints (also enforced by the app; repeated here so the API cannot bypass them)
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (
  char_length(username) between 2 and 20
  -- no URLs / domains, e-mail addresses or phone numbers (see src/lib/username-filter.ts)
  and username !~* '(https?|www\.|\.(com|net|org|info|biz|jp|co|io|me|ai|app|dev|xyz|tv|ly|gg)([^a-z]|$))'
  and username !~ '@'
  and username !~ '[0-9]{8,}'
);
alter table public.profiles drop constraint if exists profiles_country_code_check;
alter table public.profiles add constraint profiles_country_code_check check (country_code ~ '^[A-Z]{2}$');
alter table public.profiles drop constraint if exists profiles_avatar_preset_check;
alter table public.profiles add constraint profiles_avatar_preset_check
  check (avatar_preset is null or avatar_preset ~ '^[a-z0-9_-]{1,32}$');

alter table public.records drop constraint if exists records_volume_ml_check;
alter table public.records add constraint records_volume_ml_check check (volume_ml >= 0 and volume_ml <= 10);
alter table public.records drop constraint if exists records_duration_seconds_check;
alter table public.records add constraint records_duration_seconds_check
  check (duration_seconds between 0 and 86400);

create index if not exists records_ranked_time_idx on public.records (is_ranked, completed_at);
create index if not exists records_user_time_idx on public.records (user_id, completed_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.private_profiles enable row level security;
alter table public.records          enable row level security;

-- profiles: public read, owner write
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile" on public.profiles for delete using (auth.uid() = id);

-- private_profiles (birth date): owner only, read and write
drop policy if exists "own private profile" on public.private_profiles;
create policy "own private profile" on public.private_profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- records (ranking data): public read, owner insert/delete (no update policy: volume_ml etc. are immutable)
drop policy if exists "records are public" on public.records;
create policy "records are public" on public.records for select using (true);
drop policy if exists "insert own records" on public.records;
create policy "insert own records" on public.records for insert with check (auth.uid() = user_id);
drop policy if exists "delete own records" on public.records;
create policy "delete own records" on public.records for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Server-confirmed volume: on insert, volume_ml is computed from the owner's birth date
-- (age at completed_at, UTC) with the same brackets as src/lib/volume.ts:
--   <=29: 3.5 / 30s: 3.0 / 40s: 2.5 / 50s: 2.0 / 60+: 1.5 (ml)
-- Rows are never updated afterwards, so past records keep their volume after a birthday.
-- ---------------------------------------------------------------------------
create or replace function public.set_record_volume()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  birth date;
  years integer;
begin
  select birth_date into birth from public.private_profiles where id = new.user_id;
  if birth is null then
    return new; -- account without a stored birth date yet: keep the client value (range-checked)
  end if;
  years := extract(year from age((new.completed_at at time zone 'UTC')::date, birth))::integer;
  new.volume_ml := case
    when years <= 29 then 3.5
    when years <= 39 then 3.0
    when years <= 49 then 2.5
    when years <= 59 then 2.0
    else 1.5
  end;
  return new;
end $$;
revoke all on function public.set_record_volume() from public, anon, authenticated;

drop trigger if exists records_set_volume on public.records;
create trigger records_set_volume
  before insert on public.records
  for each row execute function public.set_record_volume();

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
    alter publication supabase_realtime add table public.records;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end $$;
