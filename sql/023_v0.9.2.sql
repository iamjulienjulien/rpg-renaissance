-- ============================================================================
-- MIGRATION v0.9.2 — Ajout de context_fragment
-- ============================================================================

alter table public.profile_option_refs
add column if not exists context_fragment text null;

comment on column public.profile_option_refs.context_fragment is
'Fragment de contexte narratif destiné à être injecté dans le prompt IA (1 phrase max, ton neutre)';

insert into public.profile_option_refs
(field_key, value_key, label, emoji, description, sort_order, context_fragment)
values

/* ============================================================================
gender (player_profile_details.gender)
============================================================================ */
('gender', 'male', 'Homme', '👨',
 'Je me reconnais plutôt dans le masculin.', 10,
 'Le joueur se perçoit et se définit dans une identité masculine.'),

('gender', 'female', 'Femme', '👩',
 'Je me reconnais plutôt dans le féminin.', 20,
 'Le joueur se perçoit et se définit dans une identité féminine.'),

('gender', 'non_binary', 'Non-binaire', '🧑‍🎤',
 'Je ne me reconnais pas dans un genre binaire.', 30,
 'Le joueur ne se reconnaît pas dans une identité de genre strictement binaire.'),

('gender', 'prefer_not_to_say', 'Je préfère ne pas répondre', '🤐',
 'Je ne souhaite pas préciser.', 40,
 'Le joueur ne souhaite pas préciser son identité de genre.'),

/* ============================================================================
life_rhythm
============================================================================ */
('life_rhythm', 'calm', 'Calme', '🌿',
 'Rythme stable, peu de pression.', 10,
 'Le joueur traverse une période calme et relativement stable.'),

('life_rhythm', 'busy', 'Bien rempli', '📅',
 'Journées chargées mais gérables.', 20,
 'Le quotidien du joueur est dense mais encore maîtrisé.'),

('life_rhythm', 'chaotic', 'Chaotique', '🌪️',
 'Beaucoup d’imprévus, difficile à cadrer.', 30,
 'Le joueur vit une période instable marquée par de nombreux imprévus.'),

('life_rhythm', 'transition', 'En transition', '🧭',
 'Période de changement, repères en mouvement.', 40,
 'Le joueur est actuellement dans une phase de transition ou de transformation.'),

/* ============================================================================
energy_peak
============================================================================ */
('energy_peak', 'morning', 'Matin', '🌅',
 'Je suis au top le matin.', 10,
 'Le joueur est généralement plus énergique et lucide le matin.'),

('energy_peak', 'afternoon', 'Après-midi', '☀️',
 'Mon énergie monte après midi.', 20,
 'Le joueur atteint son pic d’énergie en milieu de journée.'),

('energy_peak', 'evening', 'Soir', '🌙',
 'Je suis meilleur en fin de journée.', 30,
 'Le joueur fonctionne mieux mentalement et physiquement en fin de journée.'),

('energy_peak', 'variable', 'Variable', '🎛️',
 'Ça dépend des jours et du contexte.', 40,
 'Le niveau d’énergie du joueur varie fortement selon le contexte.'),

/* ============================================================================
daily_time_budget
============================================================================ */
('daily_time_budget', 'min_10_15', '10-15 min / jour', '⏱️',
 'Micro-actions, très court format.', 10,
 'Le joueur dispose de très peu de temps au quotidien.'),

('daily_time_budget', 'min_30', '30 min / jour', '⏳',
 'Un créneau simple, régulier.', 20,
 'Le joueur peut consacrer un temps court mais régulier chaque jour.'),

('daily_time_budget', 'hour_1_plus', '1h+ / jour', '🧱',
 'Je peux consacrer un vrai bloc de temps.', 30,
 'Le joueur peut dégager des plages de temps conséquentes.'),

('daily_time_budget', 'variable', 'Variable', '🔄',
 'Mon temps dispo change souvent.', 40,
 'La disponibilité quotidienne du joueur est irrégulière.'),

/* ============================================================================
effort_style
============================================================================ */
('effort_style', 'progressive', 'Progressif', '📈',
 'Petits pas réguliers, montée en puissance.', 10,
 'Le joueur progresse par petites étapes régulières.'),

('effort_style', 'intensive', 'Intensif', '🔥',
 'Grosses sessions quand je m’y mets.', 20,
 'Le joueur fonctionne par phases d’engagement intense.'),

('effort_style', 'irregular', 'Irrégulier', '🎲',
 'Par vagues, difficile d’être constant.', 30,
 'Le joueur a une progression irrégulière.'),

('effort_style', 'adaptive', 'Adaptatif', '🦎',
 'Je m’adapte aux contraintes du moment.', 40,
 'Le joueur ajuste son effort selon les contraintes du moment.'),

/* ============================================================================
challenge_preference
============================================================================ */
('challenge_preference', 'seek_challenge', 'Je cherche le défi', '🏔️',
 'J’aime me dépasser et sortir de ma zone.', 10,
 'Le joueur est stimulé par le défi et le dépassement de soi.'),

('challenge_preference', 'prefer_safety', 'Je préfère la sécurité', '🛟',
 'Je progresse mieux avec peu de risque.', 20,
 'Le joueur préfère évoluer dans un cadre sécurisant.'),

('challenge_preference', 'depends', 'Ça dépend', '⚖️',
 'Selon le sujet, l’énergie et le contexte.', 30,
 'Le rapport du joueur au défi varie selon les situations.'),

/* ============================================================================
motivation_primary
============================================================================ */
('motivation_primary', 'achievement', 'Accomplissement', '🏁',
 'Je suis motivé par les objectifs atteints.', 10,
 'Le joueur est motivé par l’atteinte d’objectifs concrets.'),

('motivation_primary', 'meaning', 'Sens', '🧩',
 'Je suis motivé quand ça a du sens.', 20,
 'Le joueur recherche avant tout du sens dans ses actions.'),

('motivation_primary', 'recognition', 'Reconnaissance', '🏅',
 'J’avance mieux avec validation / feedback.', 30,
 'Le joueur est sensible à la reconnaissance et au feedback.'),

('motivation_primary', 'curiosity', 'Curiosité', '🔎',
 'Je suis porté par la découverte.', 40,
 'Le joueur est stimulé par la découverte et l’exploration.'),

('motivation_primary', 'discipline', 'Discipline', '🪖',
 'J’avance parce que c’est l’heure, point.', 50,
 'Le joueur avance par discipline plus que par émotion.'),

/* ============================================================================
failure_response
============================================================================ */
('failure_response', 'guilt', 'Culpabilité', '😣',
 'Je rumine et je m’en veux facilement.', 10,
 'Le joueur a tendance à intérioriser l’échec avec culpabilité.'),

('failure_response', 'reframe', 'Reformulation', '🧠',
 'Je prends du recul et je réinterprète.', 20,
 'Le joueur cherche à reformuler l’échec pour en tirer des enseignements.'),

('failure_response', 'avoid', 'Évitement', '🙈',
 'Je fuis le sujet quand ça bloque.', 30,
 'Le joueur a tendance à éviter les situations d’échec.'),

('failure_response', 'restart', 'Redémarrage', '🔁',
 'Je repars vite sur un nouveau départ.', 40,
 'Le joueur redémarre rapidement après un échec.'),

/* ============================================================================
authority_relation
============================================================================ */
('authority_relation', 'reject', 'Je rejette l’autorité', '🧨',
 'Je bloque si c’est imposé / vertical.', 10,
 'Le joueur résiste aux cadres perçus comme imposés.'),

('authority_relation', 'accept_if_fair', 'J’accepte si c’est juste', '🤝',
 'Ok si c’est logique, clair et respectueux.', 20,
 'Le joueur accepte l’autorité lorsqu’elle est perçue comme juste.'),

('authority_relation', 'need_structure', 'J’ai besoin de structure', '🧱',
 'Je progresse mieux avec cadre et règles.', 30,
 'Le joueur progresse mieux dans un cadre structuré.'),

/* ============================================================================
symbolism_relation
============================================================================ */
('symbolism_relation', 'sensitive', 'Très sensible', '✨',
 'J’accroche aux symboles, rituels, narratif.', 10,
 'Le joueur est très réceptif au symbolisme et au narratif.'),

('symbolism_relation', 'neutral', 'Neutre', '🙂',
 'Ça ne change pas grand-chose pour moi.', 20,
 'Le symbolisme a peu d’impact sur le joueur.'),

('symbolism_relation', 'rational_curious', 'Rationnel curieux', '🧪',
 'Je suis rationnel mais j’aime explorer.', 30,
 'Le joueur reste rationnel tout en étant ouvert à l’exploration symbolique.'),

/* ============================================================================
wants — plusieurs réponses possibles
============================================================================ */
('wants', 'clarity', 'Clarté', '🔎',
 'Voir plus clair, comprendre où aller.', 10,
 'Le joueur recherche actuellement plus de clarté et de direction.'),

('wants', 'calm', 'Calme', '🌿',
 'Retrouver de l’apaisement et du contrôle.', 20,
 'Le joueur aspire à davantage de calme et d’apaisement.'),

('wants', 'momentum', 'Élan', '🏃',
 'Remettre du mouvement et du rythme.', 30,
 'Le joueur cherche à retrouver un élan et une dynamique.'),

('wants', 'discipline', 'Discipline', '🪖',
 'Un cadre simple et tenu.', 40,
 'Le joueur souhaite s’appuyer sur une discipline structurante.'),

('wants', 'confidence', 'Confiance', '🛡️',
 'Me sentir capable et solide.', 50,
 'Le joueur cherche à renforcer sa confiance personnelle.'),

('wants', 'meaning', 'Sens', '🧩',
 'Relier mes actions à quelque chose de plus grand.', 60,
 'Le joueur cherche à donner davantage de sens à ses actions.'),

/* ============================================================================
avoids — plusieurs réponses possibles
============================================================================ */
('avoids', 'overwhelm', 'Surcharge', '🌪️',
 'Trop de choses à gérer en même temps.', 10,
 'Le joueur cherche à éviter les situations de surcharge.'),

('avoids', 'conflict', 'Conflit', '⚡',
 'Tensions, frictions, confrontations.', 20,
 'Le joueur cherche à éviter les conflits et les tensions.'),

('avoids', 'uncertainty', 'Incertitude', '🎲',
 'Ne pas savoir où je vais.', 30,
 'Le joueur est inconfortable face à l’incertitude.'),

('avoids', 'rigidity', 'Rigidité', '🧱',
 'Règles trop strictes, cadre étouffant.', 40,
 'Le joueur cherche à éviter les cadres trop rigides.'),

('avoids', 'shame', 'Honte', '🫥',
 'Me sentir jugé ou “pas à la hauteur”.', 50,
 'Le joueur est sensible au jugement et à la honte.'),

/* ============================================================================
values — plusieurs réponses possibles
============================================================================ */
('values', 'freedom', 'Liberté', '🕊️',
 'Pouvoir choisir et respirer.', 10,
 'La liberté est une valeur centrale pour le joueur.'),

('values', 'family', 'Famille', '🏡',
 'Protéger et nourrir le lien.', 20,
 'Les liens familiaux sont importants pour le joueur.'),

('values', 'growth', 'Croissance', '🌱',
 'Évoluer, apprendre, se transformer.', 30,
 'Le joueur valorise la croissance personnelle.'),

('values', 'health', 'Santé', '🫀',
 'Prendre soin du corps et de l’esprit.', 40,
 'La santé physique et mentale est une priorité pour le joueur.'),

('values', 'honesty', 'Authenticité', '🪞',
 'Dire vrai, être aligné.', 50,
 'L’authenticité est une valeur clé pour le joueur.'),

('values', 'craft', 'Maîtrise', '🛠️',
 'Progresser dans mon art / mes compétences.', 60,
 'Le joueur valorise la maîtrise et le développement de ses compétences.'),

/* ============================================================================
archetype — réponse unique
============================================================================ */
('archetype', 'knight', 'Chevalier', '🛡️',
 'Protecteur, loyal, stable.', 10,
 'Le joueur adopte un archétype protecteur et loyal.'),

('archetype', 'ranger', 'Rôdeur', '🏹',
 'Libre, adaptable, instinctif.', 20,
 'Le joueur se reconnaît dans un archétype libre et adaptable.'),

('archetype', 'sage', 'Sage', '📚',
 'Observateur, lucide, posé.', 30,
 'Le joueur adopte une posture réfléchie et lucide.'),

('archetype', 'mage', 'Mage', '🔮',
 'Curieux, créatif, expérimental.', 40,
 'Le joueur se projette dans un archétype créatif et explorateur.'),

('archetype', 'artisan', 'Artisan', '🧰',
 'Concret, patient, construit brique par brique.', 50,
 'Le joueur se définit par une approche concrète et patiente.'),

/* ============================================================================
resonant_elements — plusieurs réponses possibles
============================================================================ */
('resonant_elements', 'fire', 'Feu', '🔥',
 'Impulsion, courage, énergie.', 10,
 'Le joueur résonne avec l’énergie, l’élan et l’action.'),

('resonant_elements', 'water', 'Eau', '🌊',
 'Émotions, fluidité, adaptation.', 20,
 'Le joueur est sensible aux émotions et à l’adaptation.'),

('resonant_elements', 'earth', 'Terre', '🪨',
 'Ancrage, routine, stabilité.', 30,
 'Le joueur recherche l’ancrage et la stabilité.'),

('resonant_elements', 'air', 'Air', '🌬️',
 'Clarté, idées, légèreté.', 40,
 'Le joueur valorise la clarté mentale et la légèreté.'),

('resonant_elements', 'ether', 'Éther', '✨',
 'Symbolique, intuition, mystère.', 50,
 'Le joueur est réceptif à l’intuition et au symbolisme.')

on conflict (field_key, value_key) do update set
    label = excluded.label,
    emoji = excluded.emoji,
    description = excluded.description,
    sort_order = excluded.sort_order,
    context_fragment = excluded.context_fragment,
    updated_at = now();