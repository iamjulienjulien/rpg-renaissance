-- v0.3.4 - Quest Chains (chains + ordered items)
-- Adds:
--  - quest_chains
--  - quest_chain_items (ordered quests inside a chain)
--
-- Notes:
--  - For now: a quest can belong to 0 or 1 chain (enforced by UNIQUE on adventure_quest_id)
--  - Scoped by session_id for RLS consistency (same pattern as other tables)
--  - Priority remains user-non-editable (handled app-side), not relevant here

begin;

-- 0) Extensions (if not already enabled)
create extension if not exists "pgcrypto";

-- 1) Table: quest_chains
create table if not exists public.quest_chains (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null,
    adventure_id uuid not null,
    title text,
    description text,
    created_at timestamptz not null default now()
);

-- FK: quest_chains.session_id -> game_sessions.id
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'quest_chains_session_id_fkey'
    ) then
        alter table public.quest_chains
            add constraint quest_chains_session_id_fkey
            foreign key (session_id) references public.game_sessions (id)
            on delete cascade;
    end if;
end $$;

-- FK: quest_chains.adventure_id -> adventures.id
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'quest_chains_adventure_id_fkey'
    ) then
        alter table public.quest_chains
            add constraint quest_chains_adventure_id_fkey
            foreign key (adventure_id) references public.adventures (id)
            on delete cascade;
    end if;
end $$;

-- 2) Table: quest_chain_items
create table if not exists public.quest_chain_items (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null,
    chain_id uuid not null,
    adventure_quest_id uuid not null,
    position integer not null,
    created_at timestamptz not null default now()
);

-- FK: quest_chain_items.session_id -> game_sessions.id
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'quest_chain_items_session_id_fkey'
    ) then
        alter table public.quest_chain_items
            add constraint quest_chain_items_session_id_fkey
            foreign key (session_id) references public.game_sessions (id)
            on delete cascade;
    end if;
end $$;

-- FK: quest_chain_items.chain_id -> quest_chains.id
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'quest_chain_items_chain_id_fkey'
    ) then
        alter table public.quest_chain_items
            add constraint quest_chain_items_chain_id_fkey
            foreign key (chain_id) references public.quest_chains (id)
            on delete cascade;
    end if;
end $$;

-- FK: quest_chain_items.adventure_quest_id -> adventure_quests.id
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'quest_chain_items_adventure_quest_id_fkey'
    ) then
        alter table public.quest_chain_items
            add constraint quest_chain_items_adventure_quest_id_fkey
            foreign key (adventure_quest_id) references public.adventure_quests (id)
            on delete cascade;
    end if;
end $$;

-- 3) Constraints: ordering + uniqueness
-- Ensure positions are positive
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'quest_chain_items_position_check'
    ) then
        alter table public.quest_chain_items
            add constraint quest_chain_items_position_check
            check (position >= 1);
    end if;
end $$;

-- Ensure unique position per chain
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'quest_chain_items_chain_position_uniq'
    ) then
        alter table public.quest_chain_items
            add constraint quest_chain_items_chain_position_uniq
            unique (chain_id, position);
    end if;
end $$;

-- Ensure a quest belongs to at most one chain (for now)
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'quest_chain_items_adventure_quest_id_uniq'
    ) then
        alter table public.quest_chain_items
            add constraint quest_chain_items_adventure_quest_id_uniq
            unique (adventure_quest_id);
    end if;
end $$;

-- 4) Indexes (read patterns: by adventure, by chain, by quest)
create index if not exists quest_chains_session_adventure_idx
    on public.quest_chains (session_id, adventure_id);

create index if not exists quest_chain_items_session_chain_idx
    on public.quest_chain_items (session_id, chain_id);

create index if not exists quest_chain_items_session_quest_idx
    on public.quest_chain_items (session_id, adventure_quest_id);

create index if not exists quest_chain_items_chain_position_idx
    on public.quest_chain_items (chain_id, position);

commit;