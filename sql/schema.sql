-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.adventure_quests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  adventure_id uuid NOT NULL,
  room_code text,
  title text NOT NULL,
  description text,
  difficulty integer NOT NULL DEFAULT 2,
  estimate_min integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  session_id uuid,
  CONSTRAINT adventure_quests_pkey PRIMARY KEY (id),
  CONSTRAINT adventure_quests_adventure_id_fkey FOREIGN KEY (adventure_id) REFERENCES public.adventures(id),
  CONSTRAINT adventure_quests_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.adventure_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  adventure_id uuid NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'custom'::text,
  template_id uuid,
  session_id uuid,
  CONSTRAINT adventure_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT adventure_rooms_adventure_id_fkey FOREIGN KEY (adventure_id) REFERENCES public.adventures(id),
  CONSTRAINT adventure_rooms_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.room_templates(id),
  CONSTRAINT adventure_rooms_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.adventure_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT adventure_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.adventures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  legacy_type_code text,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  type_id uuid,
  instance_code text CHECK (instance_code IS NULL OR btrim(instance_code) <> ''::text),
  session_id uuid NOT NULL,
  context_text text,
  CONSTRAINT adventures_pkey PRIMARY KEY (id),
  CONSTRAINT adventures_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.adventure_types(id),
  CONSTRAINT adventures_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.chapter_quests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL,
  adventure_quest_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'todo'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  session_id uuid,
  CONSTRAINT chapter_quests_pkey PRIMARY KEY (id),
  CONSTRAINT chapter_quests_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id),
  CONSTRAINT chapter_quests_adventure_quest_id_fkey FOREIGN KEY (adventure_quest_id) REFERENCES public.adventure_quests(id),
  CONSTRAINT chapter_quests_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.chapter_stories (
  chapter_id uuid NOT NULL,
  session_id uuid NOT NULL,
  story_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  story_md text NOT NULL,
  model text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chapter_stories_pkey PRIMARY KEY (chapter_id),
  CONSTRAINT chapter_stories_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id),
  CONSTRAINT chapter_stories_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.chapters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'exploration'::text,
  pace text NOT NULL DEFAULT 'standard'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  adventure_id uuid,
  status text NOT NULL DEFAULT 'draft'::text,
  session_id uuid,
  context_text text,
  chapter_code text NOT NULL,
  CONSTRAINT chapters_pkey PRIMARY KEY (id),
  CONSTRAINT chapters_adventure_id_fkey FOREIGN KEY (adventure_id) REFERENCES public.adventures(id),
  CONSTRAINT chapters_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.characters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🧙'::text,
  kind text NOT NULL DEFAULT 'fiction'::text,
  archetype text NOT NULL,
  vibe text NOT NULL,
  motto text NOT NULL,
  ai_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 1000,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT characters_pkey PRIMARY KEY (id)
);
CREATE TABLE public.game_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT game_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT game_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  content text,
  chapter_id uuid,
  quest_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  adventure_quest_id uuid,
  session_id uuid,
  CONSTRAINT journal_entries_pkey PRIMARY KEY (id),
  CONSTRAINT journal_entries_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id),
  CONSTRAINT journal_entries_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id),
  CONSTRAINT journal_entries_adventure_quest_id_fkey FOREIGN KEY (adventure_quest_id) REFERENCES public.adventure_quests(id),
  CONSTRAINT journal_entries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.player_profiles (
  user_id uuid NOT NULL,
  character_id uuid,
  display_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT player_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT player_profiles_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.player_renown (
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  value integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT player_renown_pkey PRIMARY KEY (user_id, session_id),
  CONSTRAINT player_renown_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT player_renown_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.quest_mission_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  chapter_quest_id uuid NOT NULL UNIQUE,
  mission_json jsonb NOT NULL,
  mission_md text NOT NULL,
  model text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  session_id uuid,
  CONSTRAINT quest_mission_orders_pkey PRIMARY KEY (id),
  CONSTRAINT quest_mission_orders_chapter_quest_id_fkey FOREIGN KEY (chapter_quest_id) REFERENCES public.chapter_quests(id),
  CONSTRAINT quest_mission_orders_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.game_sessions(id)
);
CREATE TABLE public.quests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo'::text,
  priority integer NOT NULL DEFAULT 2,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  chapter_id uuid,
  CONSTRAINT quests_pkey PRIMARY KEY (id),
  CONSTRAINT quests_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id)
);
CREATE TABLE public.room_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  icon text,
  sort integer NOT NULL DEFAULT 100,
  CONSTRAINT room_templates_pkey PRIMARY KEY (id)
);