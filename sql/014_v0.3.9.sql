/* ============================================================================
v0.3.9 — Journal meta (JSON)
- Ajout colonne meta (jsonb) sur journal_entries
============================================================================ */

alter table public.journal_entries
    add column if not exists meta jsonb null;

-- Index GIN utile pour filtres futurs (meta->>'photo_category', etc.)
create index if not exists journal_entries_meta_idx
    on public.journal_entries
    using gin (meta);


/* ============================================================================
v0.3.9 — TICKET-9 — Quest Threads & Messages (MJ conversation)
- quest_threads : 1 thread canonique par chapter_quest_id
- quest_messages : messages MJ / user / system
- RLS : owner session + admin
============================================================================ */

-------------------------------------------------------------------------------
-- 0) Extensions
-------------------------------------------------------------------------------

create extension if not exists pgcrypto;


-------------------------------------------------------------------------------
-- 1) Tables
-------------------------------------------------------------------------------

create table if not exists public.quest_threads (
    id uuid primary key default gen_random_uuid(),

    session_id uuid not null
        references public.game_sessions(id) on delete cascade,

    chapter_quest_id uuid not null
        references public.chapter_quests(id) on delete cascade,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint quest_threads_unique unique (chapter_quest_id)
);

create table if not exists public.quest_messages (
    id uuid primary key default gen_random_uuid(),

    thread_id uuid not null
        references public.quest_threads(id) on delete cascade,

    session_id uuid not null
        references public.game_sessions(id) on delete cascade,

    chapter_quest_id uuid not null
        references public.chapter_quests(id) on delete cascade,

    -- Auteur / rôle
    role text not null
        check (role in ('mj', 'user', 'system')),

    -- Contenu principal
    content text not null,
    title text null,

    -- Données flexibles pour UI / logique
    meta jsonb null,

    -- Lien optionnel vers une photo
    photo_id uuid null
        references public.photos(id) on delete set null,

    -- Type logique du message
    kind text not null default 'message',

    created_at timestamptz not null default now()
);


-------------------------------------------------------------------------------
-- 2) Indexes
-------------------------------------------------------------------------------

create index if not exists quest_threads_session_idx
    on public.quest_threads (session_id);

create index if not exists quest_threads_cq_idx
    on public.quest_threads (chapter_quest_id);

create index if not exists quest_messages_thread_idx
    on public.quest_messages (thread_id);

create index if not exists quest_messages_cq_idx
    on public.quest_messages (chapter_quest_id);

create index if not exists quest_messages_created_idx
    on public.quest_messages (created_at desc);


-------------------------------------------------------------------------------
-- 3) Trigger updated_at (quest_threads)
-------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_quest_threads_updated_at on public.quest_threads;

create trigger trg_quest_threads_updated_at
before update on public.quest_threads
for each row
execute function public.set_updated_at();


-------------------------------------------------------------------------------
-- 4) Row Level Security
-------------------------------------------------------------------------------

alter table public.quest_threads enable row level security;
alter table public.quest_messages enable row level security;

-- Verrouillage par défaut
revoke all on public.quest_threads from anon, authenticated;
revoke all on public.quest_messages from anon, authenticated;


-------------------------------------------------------------------------------
-- 5) Policies — quest_threads
-------------------------------------------------------------------------------

-- READ : owner session ou admin
drop policy if exists quest_threads_read on public.quest_threads;
create policy quest_threads_read
on public.quest_threads
for select
using (public.can_access_session(session_id));

-- INSERT : owner session
drop policy if exists quest_threads_insert on public.quest_threads;
create policy quest_threads_insert
on public.quest_threads
for insert
with check (
    public.owns_session(session_id)
);

-- UPDATE : owner session ou admin
drop policy if exists quest_threads_update on public.quest_threads;
create policy quest_threads_update
on public.quest_threads
for update
using (public.can_access_session(session_id))
with check (public.can_access_session(session_id));

-- DELETE : owner session ou admin
drop policy if exists quest_threads_delete on public.quest_threads;
create policy quest_threads_delete
on public.quest_threads
for delete
using (public.can_access_session(session_id));


-------------------------------------------------------------------------------
-- 6) Policies — quest_messages
-------------------------------------------------------------------------------

-- READ : owner session ou admin
drop policy if exists quest_messages_read on public.quest_messages;
create policy quest_messages_read
on public.quest_messages
for select
using (public.can_access_session(session_id));

/*
INSERT :
- MVP : inserts via routes serveur (auth user)
- Autorisé uniquement si owner de la session
- Garde-fou sur role (mj | system)
*/
drop policy if exists quest_messages_insert_owner_mj_system on public.quest_messages;
create policy quest_messages_insert_owner_mj_system
on public.quest_messages
for insert
with check (
    public.owns_session(session_id)
    and role in ('mj', 'system')
);

-- UPDATE : owner session ou admin
drop policy if exists quest_messages_update on public.quest_messages;
create policy quest_messages_update
on public.quest_messages
for update
using (public.can_access_session(session_id))
with check (public.can_access_session(session_id));

-- DELETE : owner session ou admin
drop policy if exists quest_messages_delete on public.quest_messages;
create policy quest_messages_delete
on public.quest_messages
for delete
using (public.can_access_session(session_id));


-------------------------------------------------------------------------------
-- 7) Grants (authenticated)
-------------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update, delete
    on table public.quest_threads
    to authenticated;

grant select, insert, update, delete
    on table public.quest_messages
    to authenticated;

revoke all on table public.quest_threads from anon;
revoke all on table public.quest_messages from anon;


-------------------------------------------------------------------------------
-- 8) Documentation
-------------------------------------------------------------------------------

comment on table public.quest_threads is
'Thread canonique (1 par chapter_quest_id) pour discussion MJ / joueur autour d’une quête.';

comment on table public.quest_messages is
'Messages liés à un thread de quête. role=mj|user|system, meta JSONB pour rendu riche, photo_id optionnel.';



-- system_logs table
create table if not exists public.system_logs (
    id uuid primary key default gen_random_uuid(),

    created_at timestamptz not null default now(),

    level text not null check (level in ('debug','info','success','warning','error')),
    message text not null,

    -- request trace
    request_id uuid,
    trace_id uuid, -- optionnel (si tu veux grouper plusieurs request_id dans une “opération”)

    -- http context
    route text,
    method text,
    status_code int,
    duration_ms int,

    -- app/game context
    session_id uuid,
    user_id uuid,
    chapter_id uuid,
    adventure_id uuid,
    chapter_quest_id uuid,
    adventure_quest_id uuid,

    -- origin
    source text,     -- ex: "app/api/photos/route.ts"
    file text,       -- best-effort (stack)
    line int,        -- best-effort (stack)
    function_name text,

    -- error details
    error_name text,
    error_message text,
    stack text,

    -- payloads
    metadata jsonb not null default '{}'::jsonb
);

create index if not exists system_logs_created_at_idx on public.system_logs (created_at desc);
create index if not exists system_logs_level_idx on public.system_logs (level);
create index if not exists system_logs_request_id_idx on public.system_logs (request_id);
create index if not exists system_logs_session_id_idx on public.system_logs (session_id);
create index if not exists system_logs_user_id_idx on public.system_logs (user_id);
create index if not exists system_logs_route_idx on public.system_logs (route);

-- (optionnel) purge facile par policy / cron: delete where created_at < now() - interval '30 days'