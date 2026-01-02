create or replace function public.reset_game()
returns void
language plpgsql
security definer
as $$
begin
  -- On purge TOUT le runtime, on garde les catalogues:
  -- ✅ keep: achievement_catalog, adventure_types, characters, room_templates

  -- Dépendances profondes d'abord (FK -> parents)
  delete from public.quest_messages where true;
  delete from public.quest_threads where true;

  delete from public.photos where true;

  delete from public.ai_generations where true;
  delete from public.system_logs where true;

  delete from public.user_toasts where true;
  delete from public.achievement_unlocks where true;

  delete from public.quest_mission_orders where true;

  delete from public.chapter_stories where true;
  delete from public.journal_entries where true;

  delete from public.quest_chain_items where true;
  delete from public.quest_chains where true;

  delete from public.chapter_quests where true;

  delete from public.adventure_quests where true;
  delete from public.adventure_rooms where true;

  delete from public.chapters where true;
  delete from public.adventures where true;

  delete from public.player_renown where true;
  delete from public.player_profiles where true;

  delete from public.user_contexts where true;
  delete from public.game_sessions where true;

  -- Optionnel: si tu veux vraiment reset “app data” hors auth
  delete from public.user_profiles where true;
  delete from public.admin_users where true;

  -- (On ne touche pas à auth.users ici)

end;
$$;