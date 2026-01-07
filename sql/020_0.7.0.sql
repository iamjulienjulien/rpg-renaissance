-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------

do $$ begin
    create type gender_enum as enum ('male', 'female', 'non_binary', 'prefer_not_to_say');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type life_rhythm_enum as enum ('calm', 'busy', 'chaotic', 'transition');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type energy_peak_enum as enum ('morning', 'afternoon', 'evening', 'variable');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type effort_style_enum as enum ('progressive', 'intensive', 'irregular', 'adaptive');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type challenge_preference_enum as enum ('seek_challenge', 'prefer_safety', 'depends');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type motivation_enum as enum ('achievement', 'meaning', 'recognition', 'curiosity', 'discipline');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type failure_response_enum as enum ('guilt', 'reframe', 'avoid', 'restart');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type authority_relation_enum as enum ('reject', 'accept_if_fair', 'need_structure');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type symbolism_relation_enum as enum ('sensitive', 'neutral', 'rational_curious');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type day_time_budget_enum as enum ('min_10_15', 'min_30', 'hour_1_plus', 'variable');
exception
    when duplicate_object then null;
end $$;


create table if not exists public.player_profile_details (
    user_id uuid primary key references auth.users(id) on delete cascade,

    gender gender_enum null,
    birth_date date null,
    locale text null,
    country_code text null,

    main_goal text null,
    wants text[] not null default '{}',
    avoids text[] not null default '{}',

    life_rhythm life_rhythm_enum null,
    energy_peak energy_peak_enum null,
    daily_time_budget day_time_budget_enum null,

    effort_style effort_style_enum null,
    challenge_preference challenge_preference_enum null,
    motivation_primary motivation_enum null,
    failure_response failure_response_enum null,

    values text[] not null default '{}',
    authority_relation authority_relation_enum null,

    archetype text null,
    symbolism_relation symbolism_relation_enum null,
    resonant_elements text[] not null default '{}',

    extra jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


alter table public.player_profile_details enable row level security;

drop policy if exists "ppd_select_own" on public.player_profile_details;
create policy "ppd_select_own"
on public.player_profile_details
for select
using (auth.uid() = user_id);

drop policy if exists "ppd_insert_own" on public.player_profile_details;
create policy "ppd_insert_own"
on public.player_profile_details
for insert
with check (auth.uid() = user_id);

drop policy if exists "ppd_update_own" on public.player_profile_details;
create policy "ppd_update_own"
on public.player_profile_details
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


create table if not exists public.profile_option_refs (
    id uuid primary key default gen_random_uuid(),

    field_key text not null,      -- ex: 'gender', 'life_rhythm', 'motivation_primary'
    value_key text not null,      -- ex: 'male', 'busy', 'achievement'

    label text not null,          -- ex: 'Homme'
    emoji text not null,          -- ex: '👨'
    description text null,        -- ex: 'Je me reconnais plutôt dans le masculin.'

    sort_order int not null default 100,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint profile_option_refs_unique unique (field_key, value_key),
    constraint profile_option_refs_emoji_not_empty check (length(trim(emoji)) > 0),
    constraint profile_option_refs_label_not_empty check (length(trim(label)) > 0)
);

create index if not exists profile_option_refs_field_idx on public.profile_option_refs(field_key);
create index if not exists profile_option_refs_active_idx on public.profile_option_refs(is_active);

drop trigger if exists profile_option_refs_set_updated_at on public.profile_option_refs;
create trigger profile_option_refs_set_updated_at
before update on public.profile_option_refs
for each row execute function public.set_updated_at();


insert into public.profile_option_refs
(field_key, value_key, label, emoji, description, sort_order)
values

/* ============================================================================
gender_enum (player_profile_details.gender)
============================================================================ */
('gender', 'male', 'Homme', '👨', 'Je me reconnais plutôt dans le masculin.', 10),
('gender', 'female', 'Femme', '👩', 'Je me reconnais plutôt dans le féminin.', 20),
('gender', 'non_binary', 'Non-binaire', '🧑‍🎤', 'Je ne me reconnais pas dans un genre binaire.', 30),
('gender', 'prefer_not_to_say', 'Je préfère ne pas répondre', '🤐', 'Je ne souhaite pas préciser.', 40),

/* ============================================================================
life_rhythm_enum (player_profile_details.life_rhythm)
============================================================================ */
('life_rhythm', 'calm', 'Calme', '🌿', 'Rythme stable, peu de pression.', 10),
('life_rhythm', 'busy', 'Bien rempli', '📅', 'Journées chargées mais gérables.', 20),
('life_rhythm', 'chaotic', 'Chaotique', '🌪️', 'Beaucoup d’imprévus, difficile à cadrer.', 30),
('life_rhythm', 'transition', 'En transition', '🧭', 'Période de changement, repères en mouvement.', 40),

/* ============================================================================
energy_peak_enum (player_profile_details.energy_peak)
============================================================================ */
('energy_peak', 'morning', 'Matin', '🌅', 'Je suis au top le matin.', 10),
('energy_peak', 'afternoon', 'Après-midi', '☀️', 'Mon énergie monte après midi.', 20),
('energy_peak', 'evening', 'Soir', '🌙', 'Je suis meilleur en fin de journée.', 30),
('energy_peak', 'variable', 'Variable', '🎛️', 'Ça dépend des jours et du contexte.', 40),

/* ============================================================================
day_time_budget_enum (player_profile_details.daily_time_budget)
============================================================================ */
('daily_time_budget', 'min_10_15', '10-15 min / jour', '⏱️', 'Micro-actions, très court format.', 10),
('daily_time_budget', 'min_30', '30 min / jour', '⏳', 'Un créneau simple, régulier.', 20),
('daily_time_budget', 'hour_1_plus', '1h+ / jour', '🧱', 'Je peux consacrer un vrai bloc de temps.', 30),
('daily_time_budget', 'variable', 'Variable', '🔄', 'Mon temps dispo change souvent.', 40),

/* ============================================================================
effort_style_enum (player_profile_details.effort_style)
============================================================================ */
('effort_style', 'progressive', 'Progressif', '📈', 'Petits pas réguliers, montée en puissance.', 10),
('effort_style', 'intensive', 'Intensif', '🔥', 'Grosses sessions quand je m’y mets.', 20),
('effort_style', 'irregular', 'Irrégulier', '🎲', 'Par vagues, difficile d’être constant.', 30),
('effort_style', 'adaptive', 'Adaptatif', '🦎', 'Je m’adapte aux contraintes du moment.', 40),

/* ============================================================================
challenge_preference_enum (player_profile_details.challenge_preference)
============================================================================ */
('challenge_preference', 'seek_challenge', 'Je cherche le défi', '🏔️', 'J’aime me dépasser et sortir de ma zone.', 10),
('challenge_preference', 'prefer_safety', 'Je préfère la sécurité', '🛟', 'Je progresse mieux avec peu de risque.', 20),
('challenge_preference', 'depends', 'Ça dépend', '⚖️', 'Selon le sujet, l’énergie et le contexte.', 30),

/* ============================================================================
motivation_enum (player_profile_details.motivation_primary)
============================================================================ */
('motivation_primary', 'achievement', 'Accomplissement', '🏁', 'Je suis motivé par les objectifs atteints.', 10),
('motivation_primary', 'meaning', 'Sens', '🧩', 'Je suis motivé quand ça a du sens.', 20),
('motivation_primary', 'recognition', 'Reconnaissance', '🏅', 'J’avance mieux avec validation / feedback.', 30),
('motivation_primary', 'curiosity', 'Curiosité', '🔎', 'Je suis porté par la découverte.', 40),
('motivation_primary', 'discipline', 'Discipline', '🪖', 'J’avance parce que c’est l’heure, point.', 50),

/* ============================================================================
failure_response_enum (player_profile_details.failure_response)
============================================================================ */
('failure_response', 'guilt', 'Culpabilité', '😣', 'Je rumine et je m’en veux facilement.', 10),
('failure_response', 'reframe', 'Reformulation', '🧠', 'Je prends du recul et je réinterprète.', 20),
('failure_response', 'avoid', 'Évitement', '🙈', 'Je fuis le sujet quand ça bloque.', 30),
('failure_response', 'restart', 'Redémarrage', '🔁', 'Je repars vite sur un nouveau départ.', 40),

/* ============================================================================
authority_relation_enum (player_profile_details.authority_relation)
============================================================================ */
('authority_relation', 'reject', 'Je rejette l’autorité', '🧨', 'Je bloque si c’est imposé / vertical.', 10),
('authority_relation', 'accept_if_fair', 'J’accepte si c’est juste', '🤝', 'Ok si c’est logique, clair et respectueux.', 20),
('authority_relation', 'need_structure', 'J’ai besoin de structure', '🧱', 'Je progresse mieux avec cadre et règles.', 30),

/* ============================================================================
symbolism_relation_enum (player_profile_details.symbolism_relation)
============================================================================ */
('symbolism_relation', 'sensitive', 'Très sensible', '✨', 'J’accroche aux symboles, rituels, narratif.', 10),
('symbolism_relation', 'neutral', 'Neutre', '🙂', 'Ça ne change pas grand-chose pour moi.', 20),
('symbolism_relation', 'rational_curious', 'Rationnel curieux', '🧪', 'Je suis rationnel mais j’aime explorer.', 30)
on conflict (field_key, value_key) do update set
    label = excluded.label,
    emoji = excluded.emoji,
    description = excluded.description,
    sort_order = excluded.sort_order,
    updated_at = now();