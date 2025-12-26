-- v0.0.8 - reset_game: SECURITY DEFINER + droits d'exécution restreints
-- Objectif:
-- - Le reset doit fonctionner même si RLS est activé (DEV)
-- - L'exécution doit être limitée (service_role uniquement)

begin;

create or replace function public.reset_game()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    -- ✅ 1) Cache / contenus dérivés
    if to_regclass('public.quest_mission_orders') is not null then
        execute 'delete from public.quest_mission_orders where true';
    end if;

    if to_regclass('public.journal_entries') is not null then
        execute 'delete from public.journal_entries where true';
    end if;

    -- ✅ 2) Gameplay (instances)
    if to_regclass('public.chapter_quests') is not null then
        execute 'delete from public.chapter_quests where true';
    end if;

    if to_regclass('public.chapters') is not null then
        execute 'delete from public.chapters where true';
    end if;

    -- ✅ 3) Setup aventure (backlog + rooms activées)
    if to_regclass('public.adventure_quests') is not null then
        execute 'delete from public.adventure_quests where true';
    end if;

    if to_regclass('public.adventure_rooms') is not null then
        execute 'delete from public.adventure_rooms where true';
    end if;

    -- ✅ 4) Progression / scoring (renommée)
    if to_regclass('public.player_renown') is not null then
        execute 'delete from public.player_renown where true';
    end if;

    -- ✅ 5) Ancienne table (si elle existe encore)
    if to_regclass('public.player_profile') is not null then
        execute 'delete from public.player_profile where true';
    end if;

    -- ✅ 6) Sessions
    if to_regclass('public.game_sessions') is not null then
        execute 'delete from public.game_sessions where true';
    end if;

    -- ✅ 7) Profil joueur (table actuelle)
    if to_regclass('public.player_profiles') is not null then
        execute 'delete from public.player_profiles where true';
    end if;

    -- ⚠️ On NE touche PAS à room_templates (bibliothèque globale)
end;
$$;

-- 🔒 Hardening des droits: personne ne doit pouvoir exécuter ça côté client
revoke execute on function public.reset_game() from public;

-- ✅ Autorise uniquement le service role (ton endpoint server-side)
grant execute on function public.reset_game() to service_role;

comment on function public.reset_game() is 'DEV ONLY: hard reset game tables. SECURITY DEFINER. Execute restricted to service_role.';

commit;