-- 0.4.9_add_photo_ai_description.sql
-- Ajoute un champ pour stocker la description IA générée à l’ajout

alter table public.photos
add column if not exists ai_description text null;

comment on column public.photos.ai_description is
'Description générée par l’IA lors de l’ajout de la photo (analyse/vision).';