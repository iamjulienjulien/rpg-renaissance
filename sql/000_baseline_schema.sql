


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."active_session_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
    select gs.id
    from public.game_sessions gs
    where gs.user_id = auth.uid()
      and gs.is_active = true
    order by gs.updated_at desc
    limit 1;
$$;


ALTER FUNCTION "public"."active_session_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_renown"("p_session_id" "uuid", "p_amount" integer) RETURNS TABLE("value" integer, "level" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
begin
  -- 🔐 utilisateur courant
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- ➕ UPSERT renommée
  insert into public.player_renown (user_id, session_id, value, level)
  values (
    v_user_id,
    p_session_id,
    greatest(p_amount, 0),
    1 + floor(greatest(p_amount, 0) / 100.0)::int
  )
  on conflict (user_id, session_id)
  do update set
    value = greatest(player_renown.value + p_amount, 0),
    level = 1 + floor(greatest(player_renown.value + p_amount, 0) / 100.0)::int,
    updated_at = now()
  returning player_renown.value, player_renown.level
  into value, level;

  return;
end;
$$;


ALTER FUNCTION "public"."add_renown"("p_session_id" "uuid", "p_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adventure_rooms_template_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if new.source = 'template' and new.template_id is null then
        raise exception 'template_id is required when source=template';
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."adventure_rooms_template_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_session_owner"("sid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
    select exists (
        select 1
        from public.game_sessions gs
        where gs.id = sid
          and gs.user_id = auth.uid()
    );
$$;


ALTER FUNCTION "public"."is_session_owner"("sid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."player_renown_check_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  session_owner uuid;
begin
  select gs.user_id
    into session_owner
  from public.game_sessions gs
  where gs.id = new.session_id;

  if session_owner is null then
    raise exception 'Session % introuvable', new.session_id;
  end if;

  if session_owner <> new.user_id then
    raise exception 'user_id (%) ne correspond pas au propriétaire de la session (%)',
      new.user_id, session_owner;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."player_renown_check_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_game"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
    -- Cache des briefs IA (lié aux chapter_quests)
    delete from public.quest_mission_orders where true;

    -- Quêtes jouées (instances)
    delete from public.chapter_quests where true;

    -- Chapitres (runs)
    delete from public.chapters where true;

    -- Backlog de quêtes (setup aventure)
    delete from public.adventure_quests where true;

    -- ✅ Pièces actives par aventure (templates activées + customs)
    delete from public.adventure_rooms where true;

    delete from public.journal_entries where true;

    delete from public.player_profile where true;

    -- ✅ On NE touche PAS à room_templates (bibliothèque globale)
    -- delete from public.room_templates where true; -- NON

end;
$$;


ALTER FUNCTION "public"."reset_game"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."adventure_quests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "adventure_id" "uuid" NOT NULL,
    "room_code" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "difficulty" integer DEFAULT 2 NOT NULL,
    "estimate_min" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid"
);


ALTER TABLE "public"."adventure_quests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."adventure_rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "adventure_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "sort" integer DEFAULT 0 NOT NULL,
    "source" "text" DEFAULT 'custom'::"text" NOT NULL,
    "template_id" "uuid",
    "session_id" "uuid"
);


ALTER TABLE "public"."adventure_rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."adventures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."adventures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chapter_quests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chapter_id" "uuid" NOT NULL,
    "adventure_quest_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid"
);


ALTER TABLE "public"."chapter_quests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chapters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "kind" "text" DEFAULT 'exploration'::"text" NOT NULL,
    "pace" "text" DEFAULT 'standard'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "adventure_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "session_id" "uuid"
);


ALTER TABLE "public"."chapters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."characters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "emoji" "text" DEFAULT '🧙'::"text" NOT NULL,
    "kind" "text" DEFAULT 'fiction'::"text" NOT NULL,
    "archetype" "text" NOT NULL,
    "vibe" "text" NOT NULL,
    "motto" "text" NOT NULL,
    "ai_style" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "sort" integer DEFAULT 1000 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."characters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."game_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journal_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "chapter_id" "uuid",
    "quest_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "adventure_quest_id" "uuid",
    "session_id" "uuid"
);


ALTER TABLE "public"."journal_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_profiles" (
    "user_id" "uuid" NOT NULL,
    "character_id" "uuid",
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_renown" (
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "value" integer DEFAULT 0 NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_renown" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quest_mission_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chapter_quest_id" "uuid" NOT NULL,
    "mission_json" "jsonb" NOT NULL,
    "mission_md" "text" NOT NULL,
    "model" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid"
);


ALTER TABLE "public"."quest_mission_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'todo'::"text" NOT NULL,
    "priority" integer DEFAULT 2 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "chapter_id" "uuid"
);


ALTER TABLE "public"."quests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "icon" "text",
    "sort" integer DEFAULT 100 NOT NULL
);


ALTER TABLE "public"."room_templates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."adventure_quests"
    ADD CONSTRAINT "adventure_quests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."adventure_rooms"
    ADD CONSTRAINT "adventure_rooms_adventure_id_code_key" UNIQUE ("adventure_id", "code");



ALTER TABLE ONLY "public"."adventure_rooms"
    ADD CONSTRAINT "adventure_rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."adventures"
    ADD CONSTRAINT "adventures_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."adventures"
    ADD CONSTRAINT "adventures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chapter_quests"
    ADD CONSTRAINT "chapter_quests_chapter_id_adventure_quest_id_key" UNIQUE ("chapter_id", "adventure_quest_id");



ALTER TABLE ONLY "public"."chapter_quests"
    ADD CONSTRAINT "chapter_quests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_sessions"
    ADD CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."player_renown"
    ADD CONSTRAINT "player_renown_pkey" PRIMARY KEY ("user_id", "session_id");



ALTER TABLE ONLY "public"."quest_mission_orders"
    ADD CONSTRAINT "quest_mission_orders_chapter_quest_id_key" UNIQUE ("chapter_quest_id");



ALTER TABLE ONLY "public"."quest_mission_orders"
    ADD CONSTRAINT "quest_mission_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."room_templates"
    ADD CONSTRAINT "room_templates_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."room_templates"
    ADD CONSTRAINT "room_templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "adventure_quests_adventure_idx" ON "public"."adventure_quests" USING "btree" ("adventure_id");



CREATE INDEX "adventure_quests_session_id_idx" ON "public"."adventure_quests" USING "btree" ("session_id");



CREATE INDEX "adventure_rooms_session_id_idx" ON "public"."adventure_rooms" USING "btree" ("session_id");



CREATE INDEX "chapter_quests_chapter_idx" ON "public"."chapter_quests" USING "btree" ("chapter_id");



CREATE INDEX "chapter_quests_session_id_idx" ON "public"."chapter_quests" USING "btree" ("session_id");



CREATE INDEX "chapters_session_id_idx" ON "public"."chapters" USING "btree" ("session_id");



CREATE INDEX "characters_is_enabled_sort_idx" ON "public"."characters" USING "btree" ("is_enabled", "sort");



CREATE UNIQUE INDEX "game_sessions_one_active_per_user" ON "public"."game_sessions" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "game_sessions_user_created_at_idx" ON "public"."game_sessions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "journal_entries_adventure_quest_id_idx" ON "public"."journal_entries" USING "btree" ("adventure_quest_id");



CREATE INDEX "journal_entries_created_at_idx" ON "public"."journal_entries" USING "btree" ("created_at" DESC);



CREATE INDEX "journal_entries_session_id_idx" ON "public"."journal_entries" USING "btree" ("session_id");



CREATE INDEX "player_renown_session_idx" ON "public"."player_renown" USING "btree" ("session_id");



CREATE INDEX "player_renown_user_session_idx" ON "public"."player_renown" USING "btree" ("user_id", "session_id");



CREATE INDEX "quest_mission_orders_session_id_idx" ON "public"."quest_mission_orders" USING "btree" ("session_id");



CREATE INDEX "quests_chapter_id_idx" ON "public"."quests" USING "btree" ("chapter_id");



CREATE INDEX "quests_user_id_idx" ON "public"."quests" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_adventure_rooms_template_guard" BEFORE INSERT OR UPDATE ON "public"."adventure_rooms" FOR EACH ROW EXECUTE FUNCTION "public"."adventure_rooms_template_guard"();



CREATE OR REPLACE TRIGGER "trg_characters_updated_at" BEFORE UPDATE ON "public"."characters" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_game_sessions_updated_at" BEFORE UPDATE ON "public"."game_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_player_profiles_updated_at" BEFORE UPDATE ON "public"."player_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_player_renown_check_owner" BEFORE INSERT OR UPDATE ON "public"."player_renown" FOR EACH ROW EXECUTE FUNCTION "public"."player_renown_check_owner"();



CREATE OR REPLACE TRIGGER "trg_player_renown_updated_at" BEFORE UPDATE ON "public"."player_renown" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at_qmo" BEFORE UPDATE ON "public"."quest_mission_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."adventure_quests"
    ADD CONSTRAINT "adventure_quests_adventure_id_fkey" FOREIGN KEY ("adventure_id") REFERENCES "public"."adventures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."adventure_quests"
    ADD CONSTRAINT "adventure_quests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."adventure_rooms"
    ADD CONSTRAINT "adventure_rooms_adventure_id_fkey" FOREIGN KEY ("adventure_id") REFERENCES "public"."adventures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."adventure_rooms"
    ADD CONSTRAINT "adventure_rooms_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."adventure_rooms"
    ADD CONSTRAINT "adventure_rooms_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."room_templates"("id");



ALTER TABLE ONLY "public"."chapter_quests"
    ADD CONSTRAINT "chapter_quests_adventure_quest_id_fkey" FOREIGN KEY ("adventure_quest_id") REFERENCES "public"."adventure_quests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapter_quests"
    ADD CONSTRAINT "chapter_quests_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapter_quests"
    ADD CONSTRAINT "chapter_quests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_adventure_id_fkey" FOREIGN KEY ("adventure_id") REFERENCES "public"."adventures"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chapters"
    ADD CONSTRAINT "chapters_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_sessions"
    ADD CONSTRAINT "game_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_adventure_quest_id_fkey" FOREIGN KEY ("adventure_quest_id") REFERENCES "public"."adventure_quests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_profiles"
    ADD CONSTRAINT "player_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_renown"
    ADD CONSTRAINT "player_renown_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_renown"
    ADD CONSTRAINT "player_renown_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quest_mission_orders"
    ADD CONSTRAINT "quest_mission_orders_chapter_quest_id_fkey" FOREIGN KEY ("chapter_quest_id") REFERENCES "public"."chapter_quests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quest_mission_orders"
    ADD CONSTRAINT "quest_mission_orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE SET NULL;



ALTER TABLE "public"."adventure_quests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "adventure_quests_delete_own_session" ON "public"."adventure_quests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_quests"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "adventure_quests_insert_own_session" ON "public"."adventure_quests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_quests"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "adventure_quests_select_own_session" ON "public"."adventure_quests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_quests"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "adventure_quests_update_own_session" ON "public"."adventure_quests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_quests"."session_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_quests"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."adventure_rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "adventure_rooms_delete_own_session" ON "public"."adventure_rooms" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_rooms"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "adventure_rooms_insert_own_session" ON "public"."adventure_rooms" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_rooms"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "adventure_rooms_select_own_session" ON "public"."adventure_rooms" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_rooms"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "adventure_rooms_update_own_session" ON "public"."adventure_rooms" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_rooms"."session_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "adventure_rooms"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."adventures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "adventures_read" ON "public"."adventures" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "adventures_select_all" ON "public"."adventures" FOR SELECT USING (true);



CREATE POLICY "aq_select_own_sessions" ON "public"."adventure_quests" FOR SELECT TO "authenticated" USING ("public"."is_session_owner"("session_id"));



CREATE POLICY "aq_write_active_session" ON "public"."adventure_quests" TO "authenticated" USING (("session_id" = "public"."active_session_id"())) WITH CHECK (("session_id" = "public"."active_session_id"()));



CREATE POLICY "ar_select_own_sessions" ON "public"."adventure_rooms" FOR SELECT TO "authenticated" USING ("public"."is_session_owner"("session_id"));



CREATE POLICY "ar_write_active_session" ON "public"."adventure_rooms" TO "authenticated" USING (("session_id" = "public"."active_session_id"())) WITH CHECK (("session_id" = "public"."active_session_id"()));



ALTER TABLE "public"."chapter_quests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chapter_quests_delete_own_session" ON "public"."chapter_quests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapter_quests"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "chapter_quests_insert_own_session" ON "public"."chapter_quests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapter_quests"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "chapter_quests_select_own_session" ON "public"."chapter_quests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapter_quests"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "chapter_quests_update_own_session" ON "public"."chapter_quests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapter_quests"."session_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapter_quests"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."chapters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chapters_delete_own_session" ON "public"."chapters" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapters"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "chapters_insert_own_session" ON "public"."chapters" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapters"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "chapters_select_own_session" ON "public"."chapters" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapters"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "chapters_update_own_session" ON "public"."chapters" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapters"."session_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "chapters"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."characters" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "characters_read" ON "public"."characters" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "characters_select_all" ON "public"."characters" FOR SELECT USING (true);



CREATE POLICY "cq_select_own_sessions" ON "public"."chapter_quests" FOR SELECT TO "authenticated" USING ("public"."is_session_owner"("session_id"));



CREATE POLICY "cq_write_active_session" ON "public"."chapter_quests" TO "authenticated" USING (("session_id" = "public"."active_session_id"())) WITH CHECK (("session_id" = "public"."active_session_id"()));



ALTER TABLE "public"."game_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "game_sessions_delete_own" ON "public"."game_sessions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "game_sessions_insert_own" ON "public"."game_sessions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "game_sessions_select_own" ON "public"."game_sessions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "game_sessions_update_own" ON "public"."game_sessions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "gs_delete_own" ON "public"."game_sessions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "gs_insert_own" ON "public"."game_sessions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "gs_select_own" ON "public"."game_sessions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "gs_update_own" ON "public"."game_sessions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "je_delete_active_session" ON "public"."journal_entries" FOR DELETE TO "authenticated" USING (("session_id" = "public"."active_session_id"()));



CREATE POLICY "je_insert_active_session" ON "public"."journal_entries" FOR INSERT TO "authenticated" WITH CHECK (("session_id" = "public"."active_session_id"()));



CREATE POLICY "je_select_own_sessions" ON "public"."journal_entries" FOR SELECT TO "authenticated" USING ("public"."is_session_owner"("session_id"));



CREATE POLICY "je_update_active_session" ON "public"."journal_entries" FOR UPDATE TO "authenticated" USING (("session_id" = "public"."active_session_id"())) WITH CHECK (("session_id" = "public"."active_session_id"()));



ALTER TABLE "public"."journal_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "journal_entries_delete_own_session" ON "public"."journal_entries" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "journal_entries"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "journal_entries_insert_own_session" ON "public"."journal_entries" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "journal_entries"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "journal_entries_select_own_session" ON "public"."journal_entries" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "journal_entries"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "journal_entries_update_own_session" ON "public"."journal_entries" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "journal_entries"."session_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "journal_entries"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."player_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "player_profiles_insert_own" ON "public"."player_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "player_profiles_select_own" ON "public"."player_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "player_profiles_update_own" ON "public"."player_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "qmo_select_own_sessions" ON "public"."quest_mission_orders" FOR SELECT TO "authenticated" USING ("public"."is_session_owner"("session_id"));



CREATE POLICY "qmo_write_active_session" ON "public"."quest_mission_orders" TO "authenticated" USING (("session_id" = "public"."active_session_id"())) WITH CHECK (("session_id" = "public"."active_session_id"()));



ALTER TABLE "public"."quest_mission_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quest_mission_orders_delete_own_session" ON "public"."quest_mission_orders" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "quest_mission_orders"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "quest_mission_orders_insert_own_session" ON "public"."quest_mission_orders" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "quest_mission_orders"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "quest_mission_orders_select_own_session" ON "public"."quest_mission_orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "quest_mission_orders"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "quest_mission_orders_update_own_session" ON "public"."quest_mission_orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "quest_mission_orders"."session_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."game_sessions" "s"
  WHERE (("s"."id" = "quest_mission_orders"."session_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."quests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quests_delete_own" ON "public"."quests" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "quests_delete_via_chapter_session" ON "public"."quests" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."chapters" "c"
     JOIN "public"."game_sessions" "s" ON (("s"."id" = "c"."session_id")))
  WHERE (("c"."id" = "quests"."chapter_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "quests_insert_own" ON "public"."quests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "quests_insert_via_chapter_session" ON "public"."quests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."chapters" "c"
     JOIN "public"."game_sessions" "s" ON (("s"."id" = "c"."session_id")))
  WHERE (("c"."id" = "quests"."chapter_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "quests_select_own" ON "public"."quests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "quests_select_via_chapter_session" ON "public"."quests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."chapters" "c"
     JOIN "public"."game_sessions" "s" ON (("s"."id" = "c"."session_id")))
  WHERE (("c"."id" = "quests"."chapter_id") AND ("s"."user_id" = "auth"."uid"())))));



CREATE POLICY "quests_update_own" ON "public"."quests" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "quests_update_via_chapter_session" ON "public"."quests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."chapters" "c"
     JOIN "public"."game_sessions" "s" ON (("s"."id" = "c"."session_id")))
  WHERE (("c"."id" = "quests"."chapter_id") AND ("s"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."chapters" "c"
     JOIN "public"."game_sessions" "s" ON (("s"."id" = "c"."session_id")))
  WHERE (("c"."id" = "quests"."chapter_id") AND ("s"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."room_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_templates_read" ON "public"."room_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "room_templates_select_all" ON "public"."room_templates" FOR SELECT USING (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."active_session_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."active_session_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."active_session_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_renown"("p_session_id" "uuid", "p_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_renown"("p_session_id" "uuid", "p_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_renown"("p_session_id" "uuid", "p_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."adventure_rooms_template_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."adventure_rooms_template_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."adventure_rooms_template_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_session_owner"("sid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_session_owner"("sid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_session_owner"("sid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."player_renown_check_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."player_renown_check_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."player_renown_check_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_game"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_game"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_game"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."adventure_quests" TO "anon";
GRANT ALL ON TABLE "public"."adventure_quests" TO "authenticated";
GRANT ALL ON TABLE "public"."adventure_quests" TO "service_role";



GRANT ALL ON TABLE "public"."adventure_rooms" TO "anon";
GRANT ALL ON TABLE "public"."adventure_rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."adventure_rooms" TO "service_role";



GRANT ALL ON TABLE "public"."adventures" TO "anon";
GRANT ALL ON TABLE "public"."adventures" TO "authenticated";
GRANT ALL ON TABLE "public"."adventures" TO "service_role";



GRANT ALL ON TABLE "public"."chapter_quests" TO "anon";
GRANT ALL ON TABLE "public"."chapter_quests" TO "authenticated";
GRANT ALL ON TABLE "public"."chapter_quests" TO "service_role";



GRANT ALL ON TABLE "public"."chapters" TO "anon";
GRANT ALL ON TABLE "public"."chapters" TO "authenticated";
GRANT ALL ON TABLE "public"."chapters" TO "service_role";



GRANT ALL ON TABLE "public"."characters" TO "anon";
GRANT ALL ON TABLE "public"."characters" TO "authenticated";
GRANT ALL ON TABLE "public"."characters" TO "service_role";



GRANT ALL ON TABLE "public"."game_sessions" TO "anon";
GRANT ALL ON TABLE "public"."game_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."game_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."journal_entries" TO "anon";
GRANT ALL ON TABLE "public"."journal_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_entries" TO "service_role";



GRANT ALL ON TABLE "public"."player_profiles" TO "anon";
GRANT ALL ON TABLE "public"."player_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."player_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."player_renown" TO "anon";
GRANT ALL ON TABLE "public"."player_renown" TO "authenticated";
GRANT ALL ON TABLE "public"."player_renown" TO "service_role";



GRANT ALL ON TABLE "public"."quest_mission_orders" TO "anon";
GRANT ALL ON TABLE "public"."quest_mission_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."quest_mission_orders" TO "service_role";



GRANT ALL ON TABLE "public"."quests" TO "anon";
GRANT ALL ON TABLE "public"."quests" TO "authenticated";
GRANT ALL ON TABLE "public"."quests" TO "service_role";



GRANT ALL ON TABLE "public"."room_templates" TO "anon";
GRANT ALL ON TABLE "public"."room_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."room_templates" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







