begin;

-- ============================================================================
-- STORAGE: bucket player-photos
-- Upload privé / lecture publique (avatars)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do update
set name   = excluded.name,
    public = excluded.public;

-- ============================================================================
-- STORAGE POLICIES (storage.objects)
-- - Lecture: publique (bucket public → aucune policy select nécessaire)
-- - Écriture: uniquement le propriétaire (owner = auth.uid())
-- ============================================================================

-- INSERT (upload)
drop policy if exists "player_photos_insert_own" on storage.objects;
create policy "player_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'player-photos'
    and auth.uid() = owner
);

-- UPDATE (remplacement / overwrite)
drop policy if exists "player_photos_update_own" on storage.objects;
create policy "player_photos_update_own"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'player-photos'
    and auth.uid() = owner
)
with check (
    bucket_id = 'player-photos'
    and auth.uid() = owner
);

-- DELETE
drop policy if exists "player_photos_delete_own" on storage.objects;
create policy "player_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'player-photos'
    and auth.uid() = owner
);

-- ============================================================================
-- TABLE: public.player_photos (si utilisée comme registre applicatif)
-- ============================================================================

-- Sécurité côté table applicative
alter table public.player_photos enable row level security;

drop policy if exists "player_photos_table_delete_own" on public.player_photos;
create policy "player_photos_table_delete_own"
on public.player_photos
for delete
to authenticated
using (auth.uid() = user_id);

-- (optionnel mais recommandé à terme)
-- create policy player_photos_table_select_own on public.player_photos ...
-- create policy player_photos_table_insert_own on public.player_photos ...
-- create policy player_photos_table_update_own on public.player_photos ...

-- ============================================================================
-- PROFILE OPTIONS (psychological & narrative dimensions)
-- ============================================================================

insert into public.profile_option_refs
(field_key, value_key, label, emoji, description, sort_order)
values

/* ============================================================================
wants (player_profile_details.wants) -- plusieurs réponses possibles
============================================================================ */
('wants', 'clarity', 'Clarté', '🔎', 'Voir plus clair, comprendre où aller.', 10),
('wants', 'calm', 'Calme', '🌿', 'Retrouver de l’apaisement et du contrôle.', 20),
('wants', 'momentum', 'Élan', '🏃', 'Remettre du mouvement et du rythme.', 30),
('wants', 'discipline', 'Discipline', '🪖', 'Un cadre simple et tenu.', 40),
('wants', 'confidence', 'Confiance', '🛡️', 'Me sentir capable et solide.', 50),
('wants', 'meaning', 'Sens', '🧩', 'Relier mes actions à quelque chose de plus grand.', 60),

/* ============================================================================
avoids (player_profile_details.avoids) -- plusieurs réponses possibles
============================================================================ */
('avoids', 'overwhelm', 'Surcharge', '🌪️', 'Trop de choses à gérer en même temps.', 10),
('avoids', 'conflict', 'Conflit', '⚡', 'Tensions, frictions, confrontations.', 20),
('avoids', 'uncertainty', 'Incertitude', '🎲', 'Ne pas savoir où je vais.', 30),
('avoids', 'rigidity', 'Rigidité', '🧱', 'Règles trop strictes, cadre étouffant.', 40),
('avoids', 'shame', 'Honte', '🫥', 'Me sentir jugé ou “pas à la hauteur”.', 50),

/* ============================================================================
values (player_profile_details.values) -- plusieurs réponses possibles
============================================================================ */
('values', 'freedom', 'Liberté', '🕊️', 'Pouvoir choisir et respirer.', 10),
('values', 'family', 'Famille', '🏡', 'Protéger et nourrir le lien.', 20),
('values', 'growth', 'Croissance', '🌱', 'Évoluer, apprendre, se transformer.', 30),
('values', 'health', 'Santé', '🫀', 'Prendre soin du corps et de l’esprit.', 40),
('values', 'honesty', 'Authenticité', '🪞', 'Dire vrai, être aligné.', 50),
('values', 'craft', 'Maîtrise', '🛠️', 'Progresser dans mon art / mes compétences.', 60),

/* ============================================================================
archetype (player_profile_details.archetype) -- réponse unique
============================================================================ */
('archetype', 'knight', 'Chevalier', '🛡️', 'Protecteur, loyal, stable.', 10),
('archetype', 'ranger', 'Rôdeur', '🏹', 'Libre, adaptable, instinctif.', 20),
('archetype', 'sage', 'Sage', '📚', 'Observateur, lucide, posé.', 30),
('archetype', 'mage', 'Mage', '🔮', 'Curieux, créatif, expérimental.', 40),
('archetype', 'artisan', 'Artisan', '🧰', 'Concret, patient, construit brique par brique.', 50),

/* ============================================================================
resonant_elements (player_profile_details.resonant_elements) -- plusieurs réponses possibles
============================================================================ */
('resonant_elements', 'fire', 'Feu', '🔥', 'Impulsion, courage, énergie.', 10),
('resonant_elements', 'water', 'Eau', '🌊', 'Émotions, fluidité, adaptation.', 20),
('resonant_elements', 'earth', 'Terre', '🪨', 'Ancrage, routine, stabilité.', 30),
('resonant_elements', 'air', 'Air', '🌬️', 'Clarté, idées, légèreté.', 40),
('resonant_elements', 'ether', 'Éther', '✨', 'Symbolique, intuition, mystère.', 50)

on conflict (field_key, value_key) do update set
    label       = excluded.label,
    emoji       = excluded.emoji,
    description = excluded.description,
    sort_order  = excluded.sort_order,
    updated_at  = now();

commit;