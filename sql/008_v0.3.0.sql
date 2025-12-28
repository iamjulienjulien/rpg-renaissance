-- ============================================================================
-- v0.3.0 - Admin console + AI generations logs (dev/debug)
-- ============================================================================
-- Objectif:
-- - tracer chaque génération IA (prompt complet + réponse brute + parsing)
-- - relier aux entités métier (session, user, chapter_quest, etc.)
-- - stocker métriques (latence, tokens, statut, erreurs)
-- - permettre des recherches efficaces (par type, par statut, par période, etc.)
-- ============================================================================

begin;

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================================
-- AI GENERATIONS LOGS
-- ============================================================================

create table if not exists public.ai_generations (
    id uuid primary key default gen_random_uuid(),

    -- Multi-tenant / scope
    -- Note: pas de FK sur public.sessions (table inexistante chez toi actuellement)
    session_id uuid not null,
    user_id uuid references auth.users(id) on delete set null,

    -- Liens métier (nullable car toutes les générations ne seront pas des missions)
    chapter_quest_id uuid references public.chapter_quests(id) on delete set null,
    chapter_id uuid references public.chapters(id) on delete set null,
    adventure_id uuid references public.adventures(id) on delete set null,

    -- Classification / routage
    -- Ex: "mission_order", "quest_congrats", "chapter_story", "adventure_briefing", etc.
    generation_type text not null,

    -- Origine code (debug)
    -- Ex: "generateMissionForChapterQuest"
    source text,

    -- Modèle & fournisseur
    provider text not null default 'openai',
    model text not null,

    -- Statut exécution
    status text not null default 'success', -- success | error | timeout | cancelled
    error_message text,
    error_code text,

    -- Timing (perf)
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    duration_ms integer,

    -- Requête (fidèle)
    request_json jsonb not null,
    system_text text,
    user_input_text text,
    context_json jsonb,

    -- Réponse brute + parsing
    response_json jsonb,
    output_text text,
    parsed_json jsonb,
    parse_error text,

    -- Rendu final app (optionnel)
    rendered_md text,

    -- Usage
    usage_json jsonb,

    -- Extra debug
    tags text[],
    metadata jsonb,

    created_at timestamptz not null default now()
);

-- ============================================================================
-- Constraints / enums "light" via CHECK
-- ============================================================================

alter table public.ai_generations
    drop constraint if exists ai_generations_status_check;

alter table public.ai_generations
    add constraint ai_generations_status_check
    check (status in ('success','error','timeout','cancelled'));

alter table public.ai_generations
    drop constraint if exists ai_generations_provider_check;

alter table public.ai_generations
    add constraint ai_generations_provider_check
    check (provider in ('openai'));

-- ============================================================================
-- Indexes (query patterns)
-- ============================================================================

create index if not exists ai_generations_session_id_idx
    on public.ai_generations (session_id);

create index if not exists ai_generations_user_id_idx
    on public.ai_generations (user_id);

create index if not exists ai_generations_type_created_at_idx
    on public.ai_generations (generation_type, created_at desc);

create index if not exists ai_generations_status_created_at_idx
    on public.ai_generations (status, created_at desc);

create index if not exists ai_generations_chapter_quest_id_idx
    on public.ai_generations (chapter_quest_id);

create index if not exists ai_generations_chapter_id_idx
    on public.ai_generations (chapter_id);

create index if not exists ai_generations_adventure_id_idx
    on public.ai_generations (adventure_id);

-- JSON search (debug)
create index if not exists ai_generations_request_gin
    on public.ai_generations using gin (request_json);

create index if not exists ai_generations_response_gin
    on public.ai_generations using gin (response_json);

create index if not exists ai_generations_context_gin
    on public.ai_generations using gin (context_json);

commit;