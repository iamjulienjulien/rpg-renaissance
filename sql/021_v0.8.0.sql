-- 1) S'assurer que le schéma est utilisable
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2) Donner le droit SELECT à la table
GRANT SELECT ON TABLE public.achievement_catalog TO anon, authenticated;

-- 3) RLS ON (si pas déjà)
ALTER TABLE public.achievement_catalog ENABLE ROW LEVEL SECURITY;

-- 4) Policy SELECT (lecture catalogue)
DROP POLICY IF EXISTS "achievement_catalog_select_authenticated" ON public.achievement_catalog;

CREATE POLICY "achievement_catalog_select_all"
ON public.achievement_catalog
FOR SELECT
TO anon, authenticated
USING (true);


create table public.player_photos (
    id uuid not null default gen_random_uuid(),

    -- Ownership
    user_id uuid not null,

    -- Type de photo
    kind text not null
        check (kind in ('portrait_source', 'avatar_generated')),

    -- Fichier
    bucket text not null default 'player-photos',
    storage_path text not null check (btrim(storage_path) <> ''),
    mime_type text,
    size integer,
    width integer,
    height integer,

    -- Avatar only
    is_active boolean not null default false, -- avatar actuellement utilisé
    avatar_style text,                       -- ex: "fantasy_epic"
    avatar_variant text,                     -- ex: "knight", "mage"
    avatar_format text,                      -- square / portrait / landscape

    -- IA
    ai_job_id uuid,
    ai_model text,
    prompt_json jsonb not null default '{}'::jsonb,
    options_json jsonb not null default '{}'::jsonb,
    source_photo_ids uuid[] not null default '{}'::uuid[],

    -- Meta
    caption text,
    alt_text text,

    created_at timestamptz not null default now(),

    constraint player_photos_pkey primary key (id),
    constraint player_photos_user_id_fkey
        foreign key (user_id) references auth.users(id) on delete cascade
);

-- Lookup rapide par utilisateur
create index idx_player_photos_user_id
    on public.player_photos(user_id);

-- Trouver l’avatar actif
create index idx_player_photos_active_avatar
    on public.player_photos(user_id)
    where kind = 'avatar_generated' and is_active = true;

-- Lien job IA
create index idx_player_photos_ai_job
    on public.player_photos(ai_job_id);


    alter table public.player_photos enable row level security;

-- player_photos privileges (sinon permission denied)
GRANT SELECT, INSERT, UPDATE ON TABLE public.player_photos TO authenticated;

-- RLS policies (update avec check)
DROP POLICY IF EXISTS "player_photos_select_own" ON public.player_photos;
DROP POLICY IF EXISTS "player_photos_insert_own" ON public.player_photos;
DROP POLICY IF EXISTS "player_photos_update_own" ON public.player_photos;

create policy "player_photos_select_own"
on public.player_photos
for select
to authenticated
using (user_id = auth.uid());

create policy "player_photos_insert_own"
on public.player_photos
for insert
to authenticated
with check (user_id = auth.uid());

create policy "player_photos_update_own"
on public.player_photos
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Un seul avatar actif (recommandé)
create unique index uq_player_photos_one_active_avatar_per_user
on public.player_photos(user_id)
where kind = 'avatar_generated' and is_active = true;

-- achievement_catalog idempotence policy
DROP POLICY IF EXISTS "achievement_catalog_select_all" ON public.achievement_catalog;

comment on column public.user_profiles.avatar_url
is 'URL de l’avatar actif du joueur (issu de player_photos)';


create view public.player_active_avatar as
select *
from public.player_photos
where kind = 'avatar_generated'
  and is_active = true;