-- v0.0.12 - Add adventure context (chapter-scoped)

alter table public.chapters
add column if not exists context_text text;

comment on column public.chapters.context_text is
'Player-provided context for the current adventure/chapter (used by AI generation).';

-- (Optionnel) si tu as RLS et que tes endpoints passent en service role,
-- tu peux ignorer. Sinon, tu peux ajouter une policy d’update/read.
-- Exemple (à adapter à ton modèle auth):
-- alter table public.chapters enable row level security;

-- create policy "chapters_select_own" on public.chapters
-- for select to authenticated
-- using (true);

-- create policy "chapters_update_context" on public.chapters
-- for update to authenticated
-- using (true)
-- with check (true);