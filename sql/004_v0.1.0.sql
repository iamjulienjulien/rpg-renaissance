-- v0.1.0 — Adventures Instances, Chapters & Stories
-- SAFE MIGRATION (pre backfill session_id)

--------------------------------
-- 📖 Chapter stories
--------------------------------

create table if not exists public.chapter_stories (
    chapter_id uuid not null,
    session_id uuid not null,
    story_json jsonb not null default '{}'::jsonb,
    story_md text not null,
    model text not null,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint chapter_stories_pkey primary key (chapter_id),
    constraint chapter_stories_chapter_id_fkey
        foreign key (chapter_id) references public.chapters(id) on delete cascade,
    constraint chapter_stories_session_id_fkey
        foreign key (session_id) references public.game_sessions(id) on delete cascade
);

create index if not exists chapter_stories_session_id_idx
    on public.chapter_stories(session_id);

--------------------------------
-- 🧬 Adventure types (catalog)
--------------------------------

create table if not exists public.adventure_types (
    id uuid not null default gen_random_uuid(),
    code text not null,
    title text not null,
    description text null,
    created_at timestamptz not null default now(),
    constraint adventure_types_pkey primary key (id),
    constraint adventure_types_code_key unique (code)
);

--------------------------------
-- 🧭 Adventures → instances
--------------------------------

alter table public.adventures
    add column if not exists type_id uuid null;

alter table public.adventures
    add constraint adventures_type_id_fkey
    foreign key (type_id) references public.adventure_types(id)
    on delete restrict;

alter table public.adventures
    drop constraint if exists adventures_code_key;

alter table public.adventures
    add column if not exists instance_code text null;

--------------------------------
-- 🔁 Backfill adventure_types
--------------------------------

insert into public.adventure_types (code, title, description, created_at)
select distinct code, title, description, created_at
from public.adventures
where code is not null
on conflict (code) do nothing;

update public.adventures a
set type_id = t.id
from public.adventure_types t
where a.code = t.code;

--------------------------------
-- 🧩 Session binding
--------------------------------

alter table public.adventures
    add column if not exists session_id uuid;

alter table public.adventures
    add constraint adventures_session_id_fkey
    foreign key (session_id) references public.game_sessions(id)
    on delete cascade;

create index if not exists adventures_session_id_idx
    on public.adventures(session_id);

create index if not exists adventures_type_id_idx
    on public.adventures(type_id);

--------------------------------
-- 🏷️ Legacy code
--------------------------------

alter table public.adventures
    alter column code drop not null;

alter table public.adventures
    rename column code to legacy_type_code;

--------------------------------
-- ✍️ Context text
--------------------------------

alter table public.adventures
    add column if not exists context_text text null;

--------------------------------
-- 📚 Chapters — public code
--------------------------------

alter table public.chapters
    add column if not exists chapter_code text;

update public.chapters
set chapter_code = coalesce(
    chapter_code,
    'chapter-' || substr(md5(gen_random_uuid()::text), 1, 8)
)
where chapter_code is null;

create unique index if not exists chapters_chapter_code_uidx
    on public.chapters (chapter_code);

alter table public.chapters
    alter column chapter_code set not null;

--------------------------------
-- 🔐 RLS — adventures
--------------------------------

alter table public.adventures enable row level security;

drop policy if exists adventures_select_own on public.adventures;
create policy adventures_select_own
on public.adventures
for select
to authenticated
using (
    exists (
        select 1
        from public.game_sessions gs
        where gs.id = adventures.session_id
          and gs.user_id = auth.uid()
    )
);

drop policy if exists adventures_insert_own on public.adventures;
create policy adventures_insert_own
on public.adventures
for insert
to authenticated
with check (
    session_id is not null
    and exists (
        select 1
        from public.game_sessions gs
        where gs.id = adventures.session_id
          and gs.user_id = auth.uid()
    )
);

drop policy if exists adventures_update_own on public.adventures;
create policy adventures_update_own
on public.adventures
for update
to authenticated
using (
    exists (
        select 1 from public.game_sessions gs
        where gs.id = adventures.session_id
          and gs.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.game_sessions gs
        where gs.id = adventures.session_id
          and gs.user_id = auth.uid()
    )
);

drop policy if exists adventures_delete_own on public.adventures;
create policy adventures_delete_own
on public.adventures
for delete
to authenticated
using (
    exists (
        select 1 from public.game_sessions gs
        where gs.id = adventures.session_id
          and gs.user_id = auth.uid()
    )
);