/* ============================================================================
v0.3.9 — Journal meta (JSON)
- Add optional jsonb column to public.journal_entries
============================================================================ */

alter table public.journal_entries
add column if not exists meta jsonb null;

-- Optionnel mais pratique si tu filtres un jour par meta->>'photo_category'
create index if not exists journal_entries_meta_idx
on public.journal_entries
using gin (meta);