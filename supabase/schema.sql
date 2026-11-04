-- =============================================================================
-- DOPYU: Supabase schema + Row Level Security + server-side anti-cheat
-- Paste this whole file into Supabase Dashboard > SQL Editor and run it.
-- Safe to re-run; it also migrates databases created with any earlier version of this file.
--
-- Tables
--   profiles      PUBLIC      id, username, country_code, avatar_id (preset icon), created_at
--   user_private  OWNER ONLY  birth_date (age check / volume; never readable by anyone else)
--   records       PUBLIC      user_id, completed_at, duration_sec, volume_ml, is_ranked
-- E-mail and password live only in Supabase Auth (auth.users) and are never exposed by the API.
-- Never stored on the server: okazu tags (Sauce), stopwatch start time (device localStorage only).
--
-- Security model
--   * RLS on every table. anon can only SELECT the public ranking data; it can never write.
--   * records are INSERT + owner DELETE only (no UPDATE privilege or policy: no after-the-fact edits).
--   * A BEFORE INSERT trigger ignores what the client sent and decides on the server:
--       completed_at = now(), volume_ml from the private birth date, is_ranked from the
--       cooldown / daily limit / 120-minute rules, and rejects inserts < 10 s apart.
--   * The birth date can be set once and is then read-only (changing it would change volume_ml).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Migration from earlier versions (every step is a no-op on a fresh database)
-- ---------------------------------------------------------------------------
do $$
begin
  -- "entries" -> "records"
  if to_regclass('public.entries') is not null and to_regclass('public.records') is null then
    alter table public.entries rename to records;
  end if;
  -- "private_profiles" -> "user_private"
  if to_regclass('public.private_profiles') is not null and to_regclass('public.user_private') is null then
    alter table public.private_profiles rename to user_private;
  end if;
  -- profiles.avatar_preset -> avatar_id
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_preset') then
    alter table public.profiles rename column avatar_preset to avatar_id;
  end if;
  -- records.duration_seconds -> duration_sec
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'records' and column_name = 'duration_seconds') then
    alter table public.records rename column duration_seconds to duration_sec;
  end if;
end $$;

-- Old policies, constraints, indexes and triggers (replaced below)
do $$
begin
  if to_regclass('public.records') is not null then
    drop policy if exists "entries are public" on public.records;
    drop policy if exists "insert own entries" on public.records;
    drop policy if exists "delete own entries" on public.records;
    drop trigger if exists records_set_volume on public.records;
    alter table public.records drop constraint if exists entries_volume_ml_check;
    alter table public.records drop constraint if exists entries_duration_seconds_check;
    alter table public.records drop constraint if exists records_duration_seconds_check;
  end if;
  if to_regclass('public.user_private') is not null then
    drop policy if exists "own private profile" on public.user_private;
  end if;
  if to_regclass('public.profiles') is not null then
    alter table public.profiles drop constraint if exists profiles_avatar_preset_check;
  end if;
end $$;
drop function if exists public.set_record_volume();
drop index if exists public.entries_ranked_time_idx;
drop index if exists public.entries_user_time_idx;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  country_code text not null default 'JP',
  avatar_id    text,
  created_at   timestamptz not null default now()
);

create table if not exists public.user_private (
  id         uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null
);

create table if not exists public.records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  duration_sec integer not null,
  volume_ml    real not null,
  is_ranked    boolean not null default false
);

-- Columns added since earlier versions
alter table public.profiles add column if not exists avatar_id text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.records  add column if not exists duration_sec integer not null default 0;

do $$
begin
  -- Very old versions: measured seconds lived in entry_details (with tags); copy, then drop it
  if to_regclass('public.entry_details') is not null then
    update public.records r set duration_sec = d.duration_seconds
      from public.entry_details d where d.entry_id = r.id;
    drop table public.entry_details;
  end if;
  -- Very old versions: avatar held "preset:<id>" or an uploaded image (uploads are gone)
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar') then
    update public.profiles set avatar_id = substring(avatar from '^preset:([a-z0-9_-]{1,32})$')
      where avatar_id is null;
    alter table public.profiles drop column avatar;
  end if;
end $$;
alter table public.records drop column if exists rank_exclusion;
alter table public.records drop column if exists created_at;

-- ---------------------------------------------------------------------------
-- CHECK constraints (the API cannot bypass these)
-- Added NOT VALID and then validated, so an old row that does not fit cannot block the migration;
-- new and changed rows are always checked.
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (
  char_length(username) between 2 and 20
  and username !~ '[<>]'                                    -- no HTML tags (XSS)
  -- no URLs / domains, e-mail addresses or phone numbers (see src/lib/username-filter.ts)
  and username !~* '(https?|www\.|\.(com|net|org|info|biz|jp|co|io|me|ai|app|dev|xyz|tv|ly|gg)([^a-z]|$))'
  and username !~ '@'
  and username !~ '[0-9]{8,}'
) not valid;
alter table public.profiles drop constraint if exists profiles_country_code_check;
alter table public.profiles add constraint profiles_country_code_check check (country_code ~ '^[A-Z]{2}$') not valid;
alter table public.profiles drop constraint if exists profiles_avatar_id_check;
alter table public.profiles add constraint profiles_avatar_id_check
  check (avatar_id is null or avatar_id ~ '^[a-z0-9_-]{1,32}$') not valid;

alter table public.user_private drop constraint if exists user_private_birth_date_check;
alter table public.user_private add constraint user_private_birth_date_check
  check (birth_date > date '1900-01-01') not valid;

alter table public.records drop constraint if exists records_duration_sec_check;
alter table public.records add constraint records_duration_sec_check check (duration_sec >= 1 and duration_sec <= 86400) not valid;
alter table public.records drop constraint if exists records_volume_ml_check;
alter table public.records add constraint records_volume_ml_check check (volume_ml >= 1.5 and volume_ml <= 3.5) not valid;

do $$
declare
  c record;
begin
  for c in
    select conrelid::regclass as tbl, conname from pg_constraint
    where not convalidated and connamespace = 'public'::regnamespace
      and conrelid in ('public.profiles'::regclass, 'public.user_private'::regclass, 'public.records'::regclass)
  loop
    begin
      execute format('alter table %s validate constraint %I', c.tbl, c.conname);
    exception when check_violation then
      raise notice '% has old rows that do not satisfy %; kept NOT VALID (new rows are still checked)', c.tbl, c.conname;
    end;
  end loop;
end $$;

create index if not exists records_ranked_time_idx on public.records (is_ranked, completed_at);
create index if not exists records_user_time_idx on public.records (user_id, completed_at);

-- ---------------------------------------------------------------------------
-- Privileges for the Data API roles (explicit, column-level where it matters).
-- anon: read-only access to the public ranking tables. No writes anywhere.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
revoke all on public.profiles, public.user_private, public.records from anon, authenticated;

grant select on public.profiles, public.records to anon, authenticated;            -- rankings are public
grant insert (id, username, country_code, avatar_id) on public.profiles to authenticated;  -- created_at is server-set
grant update (username, country_code, avatar_id) on public.profiles to authenticated;
grant delete on public.profiles to authenticated;
grant select, insert (id, birth_date) on public.user_private to authenticated;    -- no update: set once
grant insert (id, user_id, completed_at, duration_sec, volume_ml, is_ranked) on public.records to authenticated;
grant delete on public.records to authenticated;                                   -- no update: immutable

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.user_private enable row level security;
alter table public.records      enable row level security;

-- profiles: anyone can read; the owner (signed in) creates / edits / deletes their own row
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile" on public.profiles for delete to authenticated using (auth.uid() = id);

-- user_private (birth date): only the owner can read it or set it (once)
drop policy if exists "read own private" on public.user_private;
create policy "read own private" on public.user_private for select to authenticated using (auth.uid() = id);
drop policy if exists "insert own private" on public.user_private;
create policy "insert own private" on public.user_private for insert to authenticated with check (auth.uid() = id);

-- records: anyone can read (rankings); the owner inserts and deletes. There is no UPDATE policy.
drop policy if exists "records are public" on public.records;
create policy "records are public" on public.records for select using (true);
drop policy if exists "insert own records" on public.records;
create policy "insert own records" on public.records for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "delete own records" on public.records;
create policy "delete own records" on public.records for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Server-side enforcement on every new record (whatever the client sends)
--   1. completed_at := now()                         (no time travel)
--   4. < 10 s after the previous record -> reject    (rate limit: 'Rate limit exceeded')
--   2. volume_ml from the private birth date, age now (UTC), same brackets as src/lib/volume.ts:
--        <=29: 3.5 / 30s: 3.0 / 40s: 2.5 / 50s: 2.0 / 60+: 1.5 (ml)
--   3. is_ranked = false when duration_sec > 7200, within 30 min of the previous record,
--      or 5 ranked records already today (UTC); true otherwise
-- Inserts are serialized per user (advisory lock) so parallel requests cannot race the checks.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_record_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  birth        date;
  years        integer;
  last_at      timestamptz;
  ranked_today integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('dopyu.records:' || new.user_id::text, 0));

  -- 1. Server clock only
  new.completed_at := now();

  -- 4. Rate limit
  select max(completed_at) into last_at from public.records where user_id = new.user_id;
  if last_at is not null and new.completed_at - last_at < interval '10 seconds' then
    raise exception 'Rate limit exceeded' using errcode = 'P0001';
  end if;

  -- 2. Volume from the owner's private birth date
  select birth_date into birth from public.user_private where id = new.user_id;
  if birth is null then
    raise exception 'Birth date required' using errcode = 'P0001';
  end if;
  years := extract(year from age((new.completed_at at time zone 'UTC')::date, birth))::integer;
  new.volume_ml := case
    when years <= 29 then 3.5
    when years <= 39 then 3.0
    when years <= 49 then 2.5
    when years <= 59 then 2.0
    else 1.5
  end;

  -- 3. Ranking eligibility (cooldown / daily limit / 120 minutes)
  select count(*) into ranked_today from public.records
    where user_id = new.user_id and is_ranked
      and completed_at >= (date_trunc('day', new.completed_at at time zone 'UTC') at time zone 'UTC');
  new.is_ranked := not (
    new.duration_sec > 7200
    or (last_at is not null and new.completed_at - last_at <= interval '1800 seconds')
    or ranked_today >= 5
  );
  return new;
end $$;
revoke all on function public.enforce_record_rules() from public, anon, authenticated;

drop trigger if exists records_enforce_rules on public.records;
create trigger records_enforce_rules
  before insert on public.records
  for each row execute function public.enforce_record_rules();

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
-- Realtime: push ranking changes to every open browser (public tables only)
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
