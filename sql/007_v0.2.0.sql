/*
============================================================
Renaissance - Migration v0.2.0
- Ajout table public.user_profiles (données compte, hors jeu)
- Trigger updated_at
- RLS policies user_profiles
- Trigger auth.users -> création automatique user_profiles uniquement
  (player_profiles sera créé plus tard via onboarding)
============================================================
*/

begin;

-- -------------------------------------------------------------------
-- 1) Table: user_profiles (profil "compte", pas le profil de jeu)
-- -------------------------------------------------------------------
create table if not exists public.user_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,

    first_name text,
    last_name text,
    avatar_url text,
    locale text default 'fr',

    onboarding_done boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------
-- 2) updated_at helper (reusable)
-- -------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------
-- 3) RLS: user_profiles (owner-only)
-- -------------------------------------------------------------------
alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- -------------------------------------------------------------------
-- 4) Auth trigger: on user created -> create user_profiles only
--    IMPORTANT: do NOT create player_profiles here (onboarding le fera)
-- -------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Profil compte (créé vide, rempli côté app)
    insert into public.user_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    -- ⚠️ Profil jeu (player_profiles) :
    -- NE PAS créer ici. Il sera créé pendant l’onboarding (display_name + character_id).

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

commit;