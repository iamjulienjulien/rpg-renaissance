/* ============================================================================
v0.4.0 — ÉCLATS (Achievements system)
- Catalogue global d’accomplissements (data-driven)
- Attributions idempotentes par joueur
- Récompenses stockées + toasts persistants
============================================================================ */

-- Extension UUID
create extension if not exists pgcrypto;

-------------------------------------------------------------------------------
-- 0) CLEANUP (ancienne version)
-------------------------------------------------------------------------------

drop table if exists public.achievement_grants cascade;
drop table if exists public.achievements cascade;

-- Si tu rerun, on drop aussi les nouvelles tables dans le bon ordre
drop table if exists public.user_toasts cascade;
drop table if exists public.achievement_unlocks cascade;
drop table if exists public.achievement_catalog cascade;

-------------------------------------------------------------------------------
-- 1) ACHIEVEMENT CATALOG (définition globale)
-------------------------------------------------------------------------------

create table public.achievement_catalog (
    id uuid primary key default gen_random_uuid(),

    code text not null unique,              -- ex: 'first_step'
    name text not null,                     -- ex: 'Premier Pas'
    description text not null,
    icon text null,                         -- emoji ou nom d’icône

    is_active boolean not null default true,

    -- Toujours global joueur, mais utile pour debug / UI / futur
    scope text not null
        check (scope in ('user','session','adventure','chapter','chapter_quest')),

    -- Répétabilité (gérée côté moteur si tu l’actives)
    is_repeatable boolean not null default false,
    cooldown_hours integer null,

    -- Optimisation moteur (event-driven)
    trigger_event text null,                -- ex: 'quest_completed'

    -- DATA-DRIVEN
    conditions jsonb not null default '{}'::jsonb,  -- JSON Schema v1 (conditions)
    rewards jsonb not null default '[]'::jsonb,     -- JSON Schema v1 (rewards)

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists achievement_catalog_active_idx
    on public.achievement_catalog (is_active);

create index if not exists achievement_catalog_trigger_idx
    on public.achievement_catalog (trigger_event);

-------------------------------------------------------------------------------
-- 2) ACHIEVEMENT UNLOCKS (ce que le joueur a obtenu)
-------------------------------------------------------------------------------

create table public.achievement_unlocks (
    id uuid primary key default gen_random_uuid(),

    achievement_id uuid not null
        references public.achievement_catalog(id) on delete cascade,

    user_id uuid not null
        references auth.users(id) on delete cascade,

    -- Contexte (facultatif mais précieux)
    session_id uuid null
        references public.game_sessions(id) on delete cascade,

    adventure_id uuid null
        references public.adventures(id) on delete cascade,

    chapter_id uuid null
        references public.chapters(id) on delete cascade,

    chapter_quest_id uuid null
        references public.chapter_quests(id) on delete cascade,

    -- Clé logique d’idempotence
    -- ex: user:<id> | user:<id>:2025-01 | session:<session_id> | chapter_quest:<id>
    scope_key text not null,

    unlocked_at timestamptz not null default now(),

    -- Audit / debug moteur
    reason jsonb null,                              -- métriques ayant validé
    reward_payload jsonb not null default '[]'::jsonb, -- snapshot exact des rewards attribués

    -- Toast lifecycle
    toast_status text not null default 'pending'
        check (toast_status in ('pending','shown','dismissed')),
    toast_shown_at timestamptz null,
    toast_dismissed_at timestamptz null
);

create unique index if not exists achievement_unlocks_unique_idx
    on public.achievement_unlocks (user_id, achievement_id, scope_key);

create index if not exists achievement_unlocks_user_idx
    on public.achievement_unlocks (user_id, unlocked_at desc);

create index if not exists achievement_unlocks_toast_idx
    on public.achievement_unlocks (user_id, toast_status);

-------------------------------------------------------------------------------
-- 3) USER TOASTS (notifications persistantes)
-------------------------------------------------------------------------------

create table public.user_toasts (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id) on delete cascade,

    kind text not null
        check (kind in ('achievement','system','info')),

    title text not null,
    message text not null,

    payload jsonb not null default '{}'::jsonb,

    status text not null default 'unread'
        check (status in ('unread','read','dismissed')),

    created_at timestamptz not null default now(),
    read_at timestamptz null,
    dismissed_at timestamptz null
);

create index if not exists user_toasts_user_status_idx
    on public.user_toasts (user_id, status);

-------------------------------------------------------------------------------
-- 4) updated_at trigger
-------------------------------------------------------------------------------

drop trigger if exists trg_achievement_catalog_updated_at on public.achievement_catalog;

create trigger trg_achievement_catalog_updated_at
before update on public.achievement_catalog
for each row
execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- 5) RLS
-------------------------------------------------------------------------------

alter table public.achievement_catalog enable row level security;
alter table public.achievement_unlocks enable row level security;
alter table public.user_toasts enable row level security;

revoke all on public.achievement_catalog from anon, authenticated;
revoke all on public.achievement_unlocks from anon, authenticated;
revoke all on public.user_toasts from anon, authenticated;

-------------------------------------------------------------------------------
-- 6) POLICIES (drop + create pour rejouabilité)
-------------------------------------------------------------------------------

-- achievement_catalog
drop policy if exists achievement_catalog_read_admin on public.achievement_catalog;
create policy achievement_catalog_read_admin
on public.achievement_catalog
for select
using (public.is_admin());

-- achievement_unlocks
drop policy if exists achievement_unlocks_read_owner on public.achievement_unlocks;
create policy achievement_unlocks_read_owner
on public.achievement_unlocks
for select
using (user_id = auth.uid());

drop policy if exists achievement_unlocks_admin_all on public.achievement_unlocks;
create policy achievement_unlocks_admin_all
on public.achievement_unlocks
for all
using (public.is_admin())
with check (public.is_admin());

-- user_toasts
drop policy if exists user_toasts_owner_read on public.user_toasts;
create policy user_toasts_owner_read
on public.user_toasts
for select
using (user_id = auth.uid());

drop policy if exists user_toasts_owner_update on public.user_toasts;
create policy user_toasts_owner_update
on public.user_toasts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_toasts_admin_insert on public.user_toasts;
create policy user_toasts_admin_insert
on public.user_toasts
for insert
with check (public.is_admin());

-------------------------------------------------------------------------------
-- 7) GRANTS
-------------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select on public.achievement_unlocks to authenticated;
grant select, update on public.user_toasts to authenticated;

-------------------------------------------------------------------------------
-- 8) SEED — Quête accomplie (⚠️ nécessite reward type renown_by_difficulty)
-------------------------------------------------------------------------------

insert into public.achievement_catalog (
    code,
    name,
    description,
    icon,
    scope,
    is_repeatable,
    cooldown_hours,
    trigger_event,
    conditions,
    rewards,
    is_active
) values (
    'quest_completed_reward',
    'Quête accomplie',
    'Tu as accompli une quête et gagné de la renommée.',
    '🏅',
    'chapter_quest',
    true,
    null,
    'quest_completed',
    jsonb_build_object(
        'operator','AND',
        'rules', jsonb_build_array(
            jsonb_build_object(
                'type','quest_completed_count',
                'scope','session',
                'value',1
            )
        )
    ),
    jsonb_build_array(
        jsonb_build_object(
            'type','renown_by_difficulty',
            'map', jsonb_build_object(
                'default',10,
                '1',10,
                '2',20,
                '3',35
            )
        )
    ),
    true
)
on conflict (code) do nothing;