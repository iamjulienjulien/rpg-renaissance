/* ============================================================================
Renaissance — DB schema v0.6.0
Badges • Renommée • Welcome Message
============================================================================ */

/* ============================================================================
🏅 ACHIEVEMENT BADGES CATALOG
============================================================================ */

create table if not exists public.achievement_badges_catalog (
    id uuid not null default gen_random_uuid(),

    -- Identifiant fonctionnel (slug unique)
    code text not null,

    -- Nom affiché
    title text not null,

    -- Emoji par défaut (fallback UI)
    emoji text,

    -- Description courte (tooltip / détail)
    description text,

    created_at timestamp with time zone not null default now(),

    constraint achievement_badges_catalog_pkey primary key (id),
    constraint achievement_badges_catalog_code_key unique (code),
    constraint achievement_badges_catalog_code_not_blank
        check (btrim(code) <> '')
) tablespace pg_default;

-- 🔍 Lookup rapide par code
create index if not exists achievement_badges_catalog_code_idx
    on public.achievement_badges_catalog using btree (code) tablespace pg_default;

-- 🌱 Seed initial
insert into public.achievement_badges_catalog (code, title, emoji, description)
values
(
    'first_step',
    'Premier pas',
    '✨',
    'Première quête achevée.'
)
on conflict (code) do nothing;


/* ============================================================================
🎖️ PLAYER BADGES
============================================================================ */

create table if not exists public.player_badges (
    id uuid not null default gen_random_uuid(),

    -- Relations
    user_id uuid not null,
    badge_id uuid not null,

    -- Statut / méta
    unlocked_at timestamp with time zone not null default now(),
    source text, -- ex: 'achievement:first_step', 'admin', 'migration'
    metadata jsonb,

    created_at timestamp with time zone not null default now(),

    constraint player_badges_pkey primary key (id),

    constraint player_badges_user_id_fkey
        foreign key (user_id)
        references auth.users (id)
        on delete cascade,

    constraint player_badges_badge_id_fkey
        foreign key (badge_id)
        references public.achievement_badges_catalog (id)
        on delete cascade,

    -- 🔒 Un joueur ne peut avoir qu’une fois un badge donné
    constraint player_badges_user_badge_uniq
        unique (user_id, badge_id)
) tablespace pg_default;

-- 🔍 Index
create index if not exists player_badges_user_id_idx
    on public.player_badges using btree (user_id) tablespace pg_default;

create index if not exists player_badges_badge_id_idx
    on public.player_badges using btree (badge_id) tablespace pg_default;

-- 🔐 RLS
alter table public.player_badges enable row level security;

create policy "player_can_read_own_badges"
    on public.player_badges
    for select
    using (user_id = auth.uid());

create policy "no_direct_insert"
    on public.player_badges
    for insert
    with check (false);


/* ============================================================================
🧭 RENOWN LEVELS CATALOG
============================================================================ */

create table if not exists public.renown_levels_catalog (
    level integer not null, -- 1 → 100
    tier integer not null,  -- 1 → 10 (paliers)
    tier_title text not null, -- ex: Artisan
    level_suffix text, -- ex: de la Sagesse
    full_title text not null, -- ex: Artisan de la Sagesse
    is_milestone boolean not null default false, -- niveaux clés (10,20,…)

    created_at timestamp with time zone not null default now(),

    constraint renown_levels_catalog_pkey primary key (level),
    constraint renown_levels_catalog_level_check
        check (level between 1 and 100),
    constraint renown_levels_catalog_tier_check
        check (tier between 1 and 10)
) tablespace pg_default;

-- 🌌 Seed complet (1 → 100)
insert into public.renown_levels_catalog
(level, tier, tier_title, level_suffix, full_title, is_milestone)
values

-- 🌱 PALIER 1 — Éveillé (1–10)
(1, 1, 'Éveillé', 'de l’Étincelle', 'Éveillé de l’Étincelle', false),
(2, 1, 'Éveillé', 'du Souffle', 'Éveillé du Souffle', false),
(3, 1, 'Éveillé', 'du Regard', 'Éveillé du Regard', false),
(4, 1, 'Éveillé', 'de l’Intention', 'Éveillé de l’Intention', false),
(5, 1, 'Éveillé', 'du Premier Pas', 'Éveillé du Premier Pas', false),
(6, 1, 'Éveillé', 'de la Volonté', 'Éveillé de la Volonté', false),
(7, 1, 'Éveillé', 'de la Décision', 'Éveillé de la Décision', false),
(8, 1, 'Éveillé', 'du Déclic', 'Éveillé du Déclic', false),
(9, 1, 'Éveillé', 'de l’Ouverture', 'Éveillé de l’Ouverture', false),
(10, 1, 'Éveillé', null, 'Éveillé', true),

-- 📘 PALIER 2 — Apprenti (11–20)
(11, 2, 'Apprenti', 'Curieux', 'Apprenti Curieux', false),
(12, 2, 'Apprenti', 'Appliqué', 'Apprenti Appliqué', false),
(13, 2, 'Apprenti', 'Patient', 'Apprenti Patient', false),
(14, 2, 'Apprenti', 'Régulier', 'Apprenti Régulier', false),
(15, 2, 'Apprenti', 'Tenace', 'Apprenti Tenace', false),
(16, 2, 'Apprenti', 'Endurant', 'Apprenti Endurant', false),
(17, 2, 'Apprenti', 'Structuré', 'Apprenti Structuré', false),
(18, 2, 'Apprenti', 'Confiant', 'Apprenti Confiant', false),
(19, 2, 'Apprenti', 'Inspiré', 'Apprenti Inspiré', false),
(20, 2, 'Apprenti', 'Accompli', 'Apprenti Accompli', true),

-- 🧭 PALIER 3 — Aligné (21–30)
(21, 3, 'Aligné', 'du Questionnement', 'Aligné du Questionnement', false),
(22, 3, 'Aligné', 'de la Recherche', 'Aligné de la Recherche', false),
(23, 3, 'Aligné', 'de la Boussole', 'Aligné de la Boussole', false),
(24, 3, 'Aligné', 'de l’Équilibre', 'Aligné de l’Équilibre', false),
(25, 3, 'Aligné', 'de la Discipline', 'Aligné de la Discipline', false),
(26, 3, 'Aligné', 'du Rituel', 'Aligné du Rituel', false),
(27, 3, 'Aligné', 'de la Clarté', 'Aligné de la Clarté', false),
(28, 3, 'Aligné', 'de la Stabilité', 'Aligné de la Stabilité', false),
(29, 3, 'Aligné', 'du Cap', 'Aligné du Cap', false),
(30, 3, 'Aligné', null, 'Aligné', true),

-- 🧠 PALIER 4 — Disciple (31–40)
(31, 4, 'Disciple', 'Attentif', 'Disciple Attentif', false),
(32, 4, 'Disciple', 'Réceptif', 'Disciple Réceptif', false),
(33, 4, 'Disciple', 'Engagé', 'Disciple Engagé', false),
(34, 4, 'Disciple', 'Conscient', 'Disciple Conscient', false),
(35, 4, 'Disciple', 'Apaisé', 'Disciple Apaisé', false),
(36, 4, 'Disciple', 'Ancré', 'Disciple Ancré', false),
(37, 4, 'Disciple', 'Persévérant', 'Disciple Persévérant', false),
(38, 4, 'Disciple', 'Serein', 'Disciple Serein', false),
(39, 4, 'Disciple', 'Lucide', 'Disciple Lucide', false),
(40, 4, 'Disciple', null, 'Disciple', true),

-- 🔥 PALIER 5 — Initié (41–50)
(41, 5, 'Initié', 'du Courage', 'Initié du Courage', false),
(42, 5, 'Initié', 'de la Transformation', 'Initié de la Transformation', false),
(43, 5, 'Initié', 'du Lâcher-Prise', 'Initié du Lâcher-Prise', false),
(44, 5, 'Initié', 'de l’Engagement', 'Initié de l’Engagement', false),
(45, 5, 'Initié', 'du Feu Intérieur', 'Initié du Feu Intérieur', false),
(46, 5, 'Initié', 'de la Résilience', 'Initié de la Résilience', false),
(47, 5, 'Initié', 'de la Confiance', 'Initié de la Confiance', false),
(48, 5, 'Initié', 'du Passage', 'Initié du Passage', false),
(49, 5, 'Initié', 'de la Mutation', 'Initié de la Mutation', false),
(50, 5, 'Initié', null, 'Initié', true),

-- ⚒️ PALIER 6 — Artisan (51–60)
(51, 6, 'Artisan', 'du Geste Juste', 'Artisan du Geste Juste', false),
(52, 6, 'Artisan', 'de la Pratique', 'Artisan de la Pratique', false),
(53, 6, 'Artisan', 'de la Maîtrise', 'Artisan de la Maîtrise', false),
(54, 6, 'Artisan', 'de la Patience', 'Artisan de la Patience', false),
(55, 6, 'Artisan', 'du Savoir-Faire', 'Artisan du Savoir-Faire', false),
(56, 6, 'Artisan', 'du Courage', 'Artisan du Courage', false),
(57, 6, 'Artisan', 'du Changement', 'Artisan du Changement', false),
(58, 6, 'Artisan', 'de la Sagesse', 'Artisan de la Sagesse', false),
(59, 6, 'Artisan', 'de l’Harmonie', 'Artisan de l’Harmonie', false),
(60, 6, 'Artisan', 'Maître', 'Maître Artisan', true),

-- 🏛️ PALIER 7 — Bâtisseur (61–70)
(61, 7, 'Bâtisseur', 'des Fondations', 'Bâtisseur des Fondations', false),
(62, 7, 'Bâtisseur', 'de la Vision', 'Bâtisseur de la Vision', false),
(63, 7, 'Bâtisseur', 'du Sens', 'Bâtisseur du Sens', false),
(64, 7, 'Bâtisseur', 'de la Structure', 'Bâtisseur de la Structure', false),
(65, 7, 'Bâtisseur', 'de la Cohérence', 'Bâtisseur de la Cohérence', false),
(66, 7, 'Bâtisseur', 'de l’Équilibre Durable', 'Bâtisseur de l’Équilibre Durable', false),
(67, 7, 'Bâtisseur', 'de la Transmission', 'Bâtisseur de la Transmission', false),
(68, 7, 'Bâtisseur', 'du Collectif', 'Bâtisseur du Collectif', false),
(69, 7, 'Bâtisseur', 'de l’Héritage', 'Bâtisseur de l’Héritage', false),
(70, 7, 'Bâtisseur', null, 'Bâtisseur', true),

-- 🌌 PALIER 8 — Guide (71–80)
(71, 8, 'Guide', 'Attentif', 'Guide Attentif', false),
(72, 8, 'Guide', 'Bienveillant', 'Guide Bienveillant', false),
(73, 8, 'Guide', 'Inspirant', 'Guide Inspirant', false),
(74, 8, 'Guide', 'Éclairé', 'Guide Éclairé', false),
(75, 8, 'Guide', 'Soutenant', 'Guide Soutenant', false),
(76, 8, 'Guide', 'Visionnaire', 'Guide Visionnaire', false),
(77, 8, 'Guide', 'Ancré', 'Guide Ancré', false),
(78, 8, 'Guide', 'Fédérateur', 'Guide Fédérateur', false),
(79, 8, 'Guide', 'Sage', 'Guide Sage', false),
(80, 8, 'Guide', null, 'Guide', true),

-- 👑 PALIER 9 — Sage (81–90)
(81, 9, 'Sage', 'Observateur', 'Sage Observateur', false),
(82, 9, 'Sage', 'Réconcilié', 'Sage Réconcilié', false),
(83, 9, 'Sage', 'Lucide', 'Sage Lucide', false),
(84, 9, 'Sage', 'Pacifié', 'Sage Pacifié', false),
(85, 9, 'Sage', 'Harmonisé', 'Sage Harmonisé', false),
(86, 9, 'Sage', 'Profond', 'Sage Profond', false),
(87, 9, 'Sage', 'Intégral', 'Sage Intégral', false),
(88, 9, 'Sage', 'Rayonnant', 'Sage Rayonnant', false),
(89, 9, 'Sage', 'Accompli', 'Sage Accompli', false),
(90, 9, 'Sage', null, 'Sage', true),

-- ✨ PALIER 10 — Astre / Renaissance (91–100)
(91, 10, 'Astre', 'Naissant', 'Astre Naissant', false),
(92, 10, 'Astre', 'Stable', 'Astre Stable', false),
(93, 10, 'Astre', 'Éclatant', 'Astre Éclatant', false),
(94, 10, 'Astre', 'Majestueux', 'Astre Majestueux', false),
(95, 10, 'Astre', 'Souverain', 'Astre Souverain', false),
(96, 10, 'Astre', 'Mythique', 'Astre Mythique', false),
(97, 10, 'Astre', 'Intemporel', 'Astre Intemporel', false),
(98, 10, 'Astre', 'Absolu', 'Astre Absolu', false),
(99, 10, 'Astre', 'Ultime', 'Astre Ultime', false),
(100, 10, 'Renaissance', null, 'Renaissance', true)
on conflict (level) do nothing;


/* ============================================================================
✨ ADVENTURES — WELCOME MESSAGE
============================================================================ */

alter table public.adventures
    add column if not exists welcome_text text;




insert into public.achievement_catalog (
    code,
    name,
    description,
    icon,
    scope,
    is_repeatable,
    cooldown_hours,
    trigger_event,
    conditions,
    rewards,
    is_active
) values (
    'first_step',
    'Premier Pas',
    'Tu as terminé ta toute première quête.',
  '👣',
  'user',
    false,
    null,
    'quest_completed',
      jsonb_build_object(
    'operator','AND',
    'rules', jsonb_build_array(
      jsonb_build_object(
        'type','quest_completed_count',
        'scope','global',
        'value',1
      )
    )
  ),
     jsonb_build_array(
    jsonb_build_object('type','renown','value',50),
    jsonb_build_object('type','badge','code','first_step')
  ),
    true
)
on conflict (code) do nothing;