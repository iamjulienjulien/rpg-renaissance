-- =============================================================================
-- Renaissance RPG — DB Migration v0.3.6
-- Admin Console access + RLS (read) for admin monitoring
-- =============================================================================
-- Notes:
-- - This script is idempotent where possible (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- - It enables RLS and creates SELECT policies:
--   - "own data" for regular users
--   - "admin read" for admins (public.is_admin()).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) Table des admins
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Helper: current user is admin ?
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

-- Seed: add your account as admin (safe upsert)
insert into public.admin_users (user_id)
values ('USER_ID')
on conflict (user_id) do nothing;

-- Policies: admin_users
drop policy if exists "admin_users_read_self_or_admin" on public.admin_users;
create policy "admin_users_read_self_or_admin"
on public.admin_users
for select
using (user_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- 2) game_sessions (read own OR read admin)
-- -----------------------------------------------------------------------------
alter table public.game_sessions enable row level security;

drop policy if exists "game_sessions_read_own" on public.game_sessions;
create policy "game_sessions_read_own"
on public.game_sessions
for select
using (user_id = auth.uid());

drop policy if exists "game_sessions_read_admin" on public.game_sessions;
create policy "game_sessions_read_admin"
on public.game_sessions
for select
using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3) adventures (read via session ownership OR admin)
-- -----------------------------------------------------------------------------
alter table public.adventures enable row level security;

drop policy if exists "adventures_read_own" on public.adventures;
create policy "adventures_read_own"
on public.adventures
for select
using (
  session_id in (
    select gs.id
    from public.game_sessions gs
    where gs.user_id = auth.uid()
  )
);

drop policy if exists "adventures_read_admin" on public.adventures;
create policy "adventures_read_admin"
on public.adventures
for select
using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4) chapters (read via session ownership OR admin)
-- -----------------------------------------------------------------------------
alter table public.chapters enable row level security;

drop policy if exists "chapters_read_own" on public.chapters;
create policy "chapters_read_own"
on public.chapters
for select
using (
  session_id in (
    select gs.id
    from public.game_sessions gs
    where gs.user_id = auth.uid()
  )
);

drop policy if exists "chapters_read_admin" on public.chapters;
create policy "chapters_read_admin"
on public.chapters
for select
using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5) chapter_quests (read via session ownership OR admin)
-- -----------------------------------------------------------------------------
alter table public.chapter_quests enable row level security;

drop policy if exists "chapter_quests_read_own" on public.chapter_quests;
create policy "chapter_quests_read_own"
on public.chapter_quests
for select
using (
  session_id in (
    select gs.id
    from public.game_sessions gs
    where gs.user_id = auth.uid()
  )
);

drop policy if exists "chapter_quests_read_admin" on public.chapter_quests;
create policy "chapter_quests_read_admin"
on public.chapter_quests
for select
using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6) ai_generations (read via session ownership OR admin)
-- -----------------------------------------------------------------------------
alter table public.ai_generations enable row level security;

drop policy if exists "ai_generations_read_own" on public.ai_generations;
create policy "ai_generations_read_own"
on public.ai_generations
for select
using (
  session_id in (
    select gs.id
    from public.game_sessions gs
    where gs.user_id = auth.uid()
  )
);

drop policy if exists "ai_generations_read_admin" on public.ai_generations;
create policy "ai_generations_read_admin"
on public.ai_generations
for select
using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7) user_profiles (read own OR admin)
-- -----------------------------------------------------------------------------
alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_read_own" on public.user_profiles;
create policy "user_profiles_read_own"
on public.user_profiles
for select
using (user_id = auth.uid());

drop policy if exists "user_profiles_read_admin" on public.user_profiles;
create policy "user_profiles_read_admin"
on public.user_profiles
for select
using (public.is_admin());

commit;

-- =============================================================================
-- End v0.3.6
-- =============================================================================