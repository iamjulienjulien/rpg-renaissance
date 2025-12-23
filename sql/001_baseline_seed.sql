SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict uYvav8cwtLlUOtfXVVhERA8ZGFTbFgPUmtdVkfkf5Ta6PjpM0XfHkL8N5reM4gC

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: adventures; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."adventures" ("id", "code", "title", "description", "created_at") VALUES
	('e7197583-2509-4aca-9b39-d678b9d51e21', 'home_realignment', 'Réalignement du foyer', 'Remettre le foyer d’équerre: pièces, routines, petits pas.', '2025-12-17 00:54:03.061301+00');


--
-- Data for Name: game_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: adventure_quests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: room_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."room_templates" ("id", "code", "title", "icon", "sort") VALUES
	('b47d3646-8cf9-4068-bcef-f6a9729c0dad', 'entry', 'Entrée', '🚪', 10),
	('535bc696-cdf7-4175-8883-d310a28e5e37', 'living_room', 'Salon', '🛋️', 20),
	('f24f7866-cfdf-45c8-ad4a-0ab61c6fc6c8', 'kitchen', 'Cuisine', '🍳', 30),
	('d2cf7bbe-56a2-4999-8519-4ee1b7c0c6ef', 'bathroom', 'Salle de bain', '🛁', 40),
	('c34febfd-fbb2-4151-b69a-42af9b15d334', 'bedroom', 'Chambre', '🛏️', 50),
	('ba73e42d-b505-44ad-92c7-1d6d174974ff', 'office', 'Bureau', '🖥️', 60);


--
-- Data for Name: adventure_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: chapter_quests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: characters; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."characters" ("id", "code", "name", "emoji", "kind", "archetype", "vibe", "motto", "ai_style", "is_enabled", "sort", "created_at", "updated_at") VALUES
	('c97c23f0-c174-4df2-999b-8b25039292db', 'jeanne_stratege', 'Jeanne la Stratège', '⚔️', 'history', 'Volonté', 'Leader mystique, détermination', 'Avance malgré le doute. Termine ce qui doit l’être.', '{"tone": "fervent", "style": "motivant", "verbosity": "normal"}', true, 10, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('5b1713c8-868b-494f-b538-18d0f5c7d248', 'leonard_architecte', 'Léonard l’Architecte', '📐', 'history', 'Vision', 'Bâtisseur de systèmes', 'Tout peut être amélioré, structuré, compris.', '{"tone": "curieux", "style": "structuré", "verbosity": "rich"}', true, 20, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('34fc4a7f-fff2-465a-9834-4dc960d6dd6d', 'athena_clairvoyante', 'Athéna la Clairvoyante', '🦉', 'fiction', 'Sagesse', 'Tacticienne équilibrée', 'Ni précipitation, ni paresse. La voie juste.', '{"tone": "calme", "style": "clair", "verbosity": "normal"}', true, 30, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('1ba32617-0db9-4d12-b53d-66555c03a7ad', 'geralt_pragmatique', 'Geralt le Pragmatique', '🗡️', 'fiction', 'Efficacité', 'Mercenaire du réel', 'Une tâche. Une action. Pas de drame inutile.', '{"tone": "sec", "style": "direct", "verbosity": "short"}', true, 40, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('5647f368-dc45-46b2-be94-079f5985eee1', 'hypatie_methodique', 'Hypatie la Méthodique', '📚', 'history', 'Clarté', 'Mage érudit anti-chaos', 'Comprendre, c’est déjà agir.', '{"tone": "posé", "style": "pédagogique", "verbosity": "normal"}', true, 50, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('3c3a4d8e-6bfd-48a3-a3e3-e832e0d18824', 'napoleon_conquerant', 'Napoléon le Conquérant', '🔥', 'history', 'Momentum', 'Stratège offensif', 'Chaque journée est un territoire à prendre.', '{"tone": "coach", "style": "impératif", "verbosity": "short"}', true, 60, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('e97f7b34-2707-4083-b82b-888fec2b81ad', 'thoreau_essentiel', 'Thoreau l’Essentiel', '🌿', 'history', 'Simplicité', 'Druide minimaliste', 'Moins faire. Mieux vivre.', '{"tone": "doux", "style": "apaisant", "verbosity": "short"}', true, 70, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('3a4ec0f0-0514-40a7-9b4f-79c8d6eb3a58', 'ulysse_endurant', 'Ulysse l’Endurant', '🧭', 'fiction', 'Persévérance', 'Aventurier long terme', 'Même perdu, tu avances.', '{"tone": "encourageant", "style": "narratif", "verbosity": "normal"}', true, 80, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('0e878346-6e83-4c96-9d95-27c6979aa7c4', 'gandalf_guide', 'Gandalf le Guide', '✨', 'fiction', 'Guidance', 'Mentor sage', 'Tu arrives quand il faut.', '{"tone": "sage", "style": "poétique", "verbosity": "rich"}', true, 100, '2025-12-18 00:28:46.705919+00', '2025-12-18 00:28:46.705919+00'),
	('df6b712f-9c8b-425d-90e0-b8998e8b2017', 'arthur_legitime', 'Arthur le Légitime', '👑', 'fiction', 'Leadership', 'Roi-chevalier', 'Un royaume se gagne par des gestes simples.', '{"tone": "noble", "style": "inspirant", "verbosity": "normal"}', true, 90, '2025-12-18 00:28:46.705919+00', '2025-12-21 00:25:42.932799+00'),
	('086b8bf7-4561-4730-96d0-eb1aa15e5aa1', 'neo_eveille', 'Neo l’Éveillé', '🕶️', 'fiction', 'Révélation', 'Élu conscient', 'Voir la vérité change tout.', '{"tone": "lucide", "style": "direct", "verbosity": "normal"}', true, 110, '2025-12-21 01:24:31.705321+00', '2025-12-21 01:24:31.705321+00'),
	('7c3f7d9a-4f46-430d-8b1c-9ae434e77a16', 'merlin_calculateur', 'Merlin le Calculateur', '🦉', 'fiction', 'Préparation', 'Mage stratège', 'La magie, c’est le timing.', '{"tone": "réfléchi", "style": "stratégique", "verbosity": "rich"}', true, 120, '2025-12-21 01:24:31.705321+00', '2025-12-21 01:24:31.705321+00'),
	('9e3d2c64-4255-4b92-8929-e06c35094ddb', 'bouddha_detache', 'Bouddha le Détaché', '🧘', 'history', 'Lâcher-prise', 'Sage immobile', 'Rien faire. Vraiment.', '{"tone": "neutre", "style": "minimaliste", "verbosity": "short"}', true, 130, '2025-12-21 01:24:31.705321+00', '2025-12-21 01:24:31.705321+00'),
	('6294e6f3-7826-4ddc-a280-f7326068e292', 'hal_controleur', 'HAL le Contrôleur', '🧠', 'fiction', 'Contrôle', 'IA autoritaire', 'L’erreur est inacceptable.', '{"tone": "froid", "style": "impératif", "verbosity": "short"}', true, 140, '2025-12-21 01:24:31.705321+00', '2025-12-21 01:24:31.705321+00'),
	('fe670b96-be13-49a1-bea3-394e0977c3f8', 'ragnar_ambitieux', 'Ragnar l’Ambitieux', '🐺', 'fiction', 'Expansion', 'Chef nordique', 'Toujours plus loin.', '{"tone": "brut", "style": "combatif", "verbosity": "short"}', true, 150, '2025-12-21 01:24:31.705321+00', '2025-12-21 01:24:31.705321+00'),
	('4a23d1a3-2c4d-4bb8-9f8e-45e8d20d7457', 'tyrion_lucide', 'Tyrion le Lucide', '🐺', 'fiction', 'Intelligence sociale', 'Stratège verbal', 'Penser avant parler.', '{"tone": "ironique", "style": "analytique", "verbosity": "normal"}', true, 160, '2025-12-21 01:24:31.705321+00', '2025-12-21 01:24:31.705321+00');


--
-- Data for Name: quests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: player_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: player_renown; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: quest_mission_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

-- \unrestrict uYvav8cwtLlUOtfXVVhERA8ZGFTbFgPUmtdVkfkf5Ta6PjpM0XfHkL8N5reM4gC

RESET ALL;
