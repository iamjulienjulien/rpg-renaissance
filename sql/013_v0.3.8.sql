/* ============================================================================
v0.3.8 — Photos (Mode A: upload serveur / signed URLs)
- Bucket storage "photos" (privé)
- Helpers can_access_session / owns_session
- Table public.photos + indexes
- RLS + policies public.photos
NOTE: Mode A => on NE TOUCHE PAS à storage.objects (owner)
============================================================================ */

begin;

-------------------------------------------------------------------------------
-- 0) Extension
-------------------------------------------------------------------------------
create extension if not exists pgcrypto;

-------------------------------------------------------------------------------
-- 1) Helpers accès session
-- Dépend de public.is_admin() (créé en v0.3.6)
-------------------------------------------------------------------------------
create or replace function public.can_access_session(p_session_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.game_sessions gs
      where gs.id = p_session_id
        and gs.user_id = auth.uid()
    );
$$;

create or replace function public.owns_session(p_session_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.game_sessions gs
    where gs.id = p_session_id
      and gs.user_id = auth.uid()
  );
$$;

-------------------------------------------------------------------------------
-- 2) Bucket Storage (privé)
-- (idempotent)
-------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-------------------------------------------------------------------------------
-- 3) Table public.photos
-- On met directement category + chapter_quest_id (pas d'ALTER ensuite)
-------------------------------------------------------------------------------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),

  -- scope
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,

  -- rattachement "quest" (clé principale côté gameplay)
  chapter_quest_id uuid not null references public.chapter_quests(id) on delete cascade,

  -- rattachement métier (0 ou 1)
  adventure_id uuid references public.adventures(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  adventure_quest_id uuid references public.adventure_quests(id) on delete cascade,
  journal_entry_id uuid references public.journal_entries(id) on delete cascade,

  -- storage
  bucket text not null default 'photos',
  path text not null,
  mime_type text,
  size integer,
  width integer,
  height integer,

  -- UI
  caption text,
  is_cover boolean not null default false,
  sort integer not null default 0,

  -- catégorie (initial | final | other)
  category text not null default 'other',

  created_at timestamptz not null default now(),

  constraint photos_bucket_check check (bucket = 'photos'),
  constraint photos_path_not_empty check (btrim(path) <> ''),
  constraint photos_category_check check (category in ('initial','final','other')),
  constraint photos_single_parent_check check (
    num_nonnulls(adventure_id, chapter_id, adventure_quest_id, journal_entry_id) <= 1
  ),
  constraint photos_bucket_path_uniq unique (bucket, path)
);

-------------------------------------------------------------------------------
-- 4) Indexes
-------------------------------------------------------------------------------
create index if not exists photos_session_idx on public.photos (session_id);
create index if not exists photos_user_idx on public.photos (user_id);
create index if not exists photos_chapter_quest_id_idx on public.photos (chapter_quest_id);
create index if not exists photos_category_idx on public.photos (category);

create index if not exists photos_adventure_idx on public.photos (adventure_id);
create index if not exists photos_chapter_idx on public.photos (chapter_id);
create index if not exists photos_aq_idx on public.photos (adventure_quest_id);
create index if not exists photos_journal_idx on public.photos (journal_entry_id);
create index if not exists photos_created_idx on public.photos (created_at desc);

-------------------------------------------------------------------------------
-- 5) Grants (sinon: "permission denied for table photos")
-- RLS s'appliquera ensuite via policies.
-------------------------------------------------------------------------------
grant select, insert, update, delete on table public.photos to authenticated;
grant select on table public.photos to anon;

-------------------------------------------------------------------------------
-- 6) RLS + Policies (public.photos)
-------------------------------------------------------------------------------
alter table public.photos enable row level security;

-- Optionnel: retirer anciennes policies "génériques" si tu en avais
drop policy if exists "photos_read_own_or_admin" on public.photos;
drop policy if exists "photos_insert_own_or_admin" on public.photos;
drop policy if exists "photos_update_own_or_admin" on public.photos;
drop policy if exists "photos_delete_own_or_admin" on public.photos;

-- READ own
drop policy if exists "photos_read_own" on public.photos;
create policy "photos_read_own"
on public.photos
for select
using (public.owns_session(session_id));

-- READ admin
drop policy if exists "photos_read_admin" on public.photos;
create policy "photos_read_admin"
on public.photos
for select
using (public.is_admin());

-- INSERT own
drop policy if exists "photos_insert_own" on public.photos;
create policy "photos_insert_own"
on public.photos
for insert
with check (
  user_id = auth.uid()
  and public.owns_session(session_id)
);

-- INSERT admin
drop policy if exists "photos_insert_admin" on public.photos;
create policy "photos_insert_admin"
on public.photos
for insert
with check (public.is_admin());

-- UPDATE own
drop policy if exists "photos_update_own" on public.photos;
create policy "photos_update_own"
on public.photos
for update
using (public.owns_session(session_id))
with check (
  user_id = auth.uid()
  and public.owns_session(session_id)
);

-- UPDATE admin
drop policy if exists "photos_update_admin" on public.photos;
create policy "photos_update_admin"
on public.photos
for update
using (public.is_admin())
with check (public.is_admin());

-- DELETE own
drop policy if exists "photos_delete_own" on public.photos;
create policy "photos_delete_own"
on public.photos
for delete
using (public.owns_session(session_id));

-- DELETE admin
drop policy if exists "photos_delete_admin" on public.photos;
create policy "photos_delete_admin"
on public.photos
for delete
using (public.is_admin());

commit;