-- 001_inventory_v1.sql
-- v0.5.0 — Inventaire (v1)

--------------------------------------------------------------------------------
-- 1) SCHEMA VERSIONS (catalogue global)
--------------------------------------------------------------------------------

create table if not exists public.inventory_schema_versions (
    id uuid primary key default gen_random_uuid(),

    -- ✅ code lisible et stable (clé métier)
    code text not null,                 -- ex: 'plants.v1'
    version text not null,              -- ex: 'v1'
    title text not null,                -- ex: 'Plantes (v1)'
    description text null,

    -- schéma "source of truth" côté BDD (copie du JSON schema)
    schema_json jsonb not null default '{}'::jsonb,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- ✅ cohérent
    constraint inventory_schema_versions_code_uniq unique (code),
    constraint inventory_schema_versions_code_not_empty check (btrim(code) <> ''),
    constraint inventory_schema_versions_version_not_empty check (btrim(version) <> '')
);

drop trigger if exists trg_inventory_schema_versions_updated_at on public.inventory_schema_versions;
create trigger trg_inventory_schema_versions_updated_at
before update on public.inventory_schema_versions
for each row execute function public.set_updated_at();


--------------------------------------------------------------------------------
-- 2) COLLECTIONS (ex: "Mes plantes")
--------------------------------------------------------------------------------

create table if not exists public.inventory_collections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,

    kid text null,
    code text null,                 -- ex: 'plants'
    title text not null,                -- ex: 'Mes plantes'
    description text null,

    -- ✅ version active utilisée par la collection (ex: 'plants.v1')
    schema_version text not null,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint inventory_collections_user_code_uniq unique (user_id, code),
    constraint inventory_collections_code_not_empty check (btrim(code) <> ''),
    constraint inventory_collections_title_not_empty check (btrim(title) <> ''),

    -- ✅ FK sur code text (pas id)
    constraint inventory_collections_schema_version_fkey
        foreign key (schema_version)
        references public.inventory_schema_versions (code)
        on delete restrict
);

create index if not exists inventory_collections_user_idx
on public.inventory_collections using btree (user_id);

create index if not exists inventory_collections_schema_version_idx
on public.inventory_collections using btree (schema_version);

drop trigger if exists trg_inventory_collections_updated_at on public.inventory_collections;
create trigger trg_inventory_collections_updated_at
before update on public.inventory_collections
for each row execute function public.set_updated_at();


--------------------------------------------------------------------------------
-- 3) ITEMS (1 item = 1 plante)
--------------------------------------------------------------------------------

create table if not exists public.inventory_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,

    collection_id uuid not null references public.inventory_collections (id) on delete cascade,

    -- ✅ la version effective au moment de la création (ex: 'plants.v1')
    schema_version text not null,

    -- champs génériques
    title text not null,                -- ex: "Pachira"
    status text not null default 'active'::text
        check (status = any (array['active'::text, 'archived'::text])),

    -- IA
    ai_description text null,

    -- données structurées (dépendent du schéma)
    data jsonb not null default '{}'::jsonb,

    -- aide perf / filtrage (optionnel, mais pratique)
    tags text[],

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint inventory_items_title_not_empty check (btrim(title) <> ''),

    -- ✅ FK sur code text (pas id)
    constraint inventory_items_schema_version_fkey
        foreign key (schema_version)
        references public.inventory_schema_versions (code)
        on delete restrict
);

create index if not exists inventory_items_user_idx
on public.inventory_items using btree (user_id);

create index if not exists inventory_items_collection_idx
on public.inventory_items using btree (collection_id);

create index if not exists inventory_items_schema_version_idx
on public.inventory_items using btree (schema_version);

-- index GIN utile si tu veux requêter dans data
create index if not exists inventory_items_data_gin
on public.inventory_items using gin (data);

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();


--------------------------------------------------------------------------------
-- 4) ITEM <-> PHOTOS (n-n)
--------------------------------------------------------------------------------

create table if not exists public.inventory_item_photos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,

    item_id uuid not null references public.inventory_items (id) on delete cascade,
    photo_id uuid not null references public.photos (id) on delete cascade,

    kind text not null default 'main'::text
        check (kind = any (array['main'::text, 'detail'::text, 'other'::text])),

    sort integer not null default 0,

    created_at timestamptz not null default now(),

    constraint inventory_item_photos_item_photo_uniq unique (item_id, photo_id)
);

create index if not exists inventory_item_photos_item_idx
on public.inventory_item_photos using btree (item_id);

create index if not exists inventory_item_photos_photo_idx
on public.inventory_item_photos using btree (photo_id);


--------------------------------------------------------------------------------
-- 5) RLS
--------------------------------------------------------------------------------

alter table public.inventory_schema_versions enable row level security;
alter table public.inventory_collections enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_item_photos enable row level security;

-- inventory_schema_versions: lecture pour authenticated (catalogue global)
drop policy if exists "inv_schema_select" on public.inventory_schema_versions;
create policy "inv_schema_select"
on public.inventory_schema_versions
for select
to authenticated
using (true);

-- Pas d'insert/update/delete côté client (admin only via SQL/seed)
drop policy if exists "inv_schema_no_write" on public.inventory_schema_versions;
create policy "inv_schema_no_write"
on public.inventory_schema_versions
for all
to authenticated
using (false)
with check (false);

-- inventory_collections: user owns
drop policy if exists "inv_col_select_own" on public.inventory_collections;
drop policy if exists "inv_col_insert_own" on public.inventory_collections;
drop policy if exists "inv_col_update_own" on public.inventory_collections;
drop policy if exists "inv_col_delete_own" on public.inventory_collections;

create policy "inv_col_select_own"
on public.inventory_collections
for select
to authenticated
using (user_id = auth.uid());

create policy "inv_col_insert_own"
on public.inventory_collections
for insert
to authenticated
with check (user_id = auth.uid());

create policy "inv_col_update_own"
on public.inventory_collections
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "inv_col_delete_own"
on public.inventory_collections
for delete
to authenticated
using (user_id = auth.uid());

-- inventory_items: user owns
drop policy if exists "inv_items_select_own" on public.inventory_items;
drop policy if exists "inv_items_insert_own" on public.inventory_items;
drop policy if exists "inv_items_update_own" on public.inventory_items;
drop policy if exists "inv_items_delete_own" on public.inventory_items;

create policy "inv_items_select_own"
on public.inventory_items
for select
to authenticated
using (user_id = auth.uid());

create policy "inv_items_insert_own"
on public.inventory_items
for insert
to authenticated
with check (user_id = auth.uid());

create policy "inv_items_update_own"
on public.inventory_items
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "inv_items_delete_own"
on public.inventory_items
for delete
to authenticated
using (user_id = auth.uid());

-- inventory_item_photos: user owns
drop policy if exists "inv_item_photos_select_own" on public.inventory_item_photos;
drop policy if exists "inv_item_photos_insert_own" on public.inventory_item_photos;
drop policy if exists "inv_item_photos_delete_own" on public.inventory_item_photos;

create policy "inv_item_photos_select_own"
on public.inventory_item_photos
for select
to authenticated
using (user_id = auth.uid());

create policy "inv_item_photos_insert_own"
on public.inventory_item_photos
for insert
to authenticated
with check (user_id = auth.uid());

create policy "inv_item_photos_delete_own"
on public.inventory_item_photos
for delete
to authenticated
using (user_id = auth.uid());