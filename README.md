# 🌌 RPG Renaissance

**RPG Renaissance** est une web-app expérimentale qui transforme la vie réelle en jeu de rôle narratif.  
Un espace hybride entre journal, RPG, to-do gamifiée et compagnon introspectif, où chaque action devient une quête, chaque période un chapitre, et chaque décision un pas vers la reconstruction.

Ce projet est né d’une conversation, d’un besoin de remettre de l’ordre, et d’une envie simple :  
👉 **redonner du sens au quotidien en le rendant jouable**.

---

## ✨ Concept

RPG Renaissance propose :

- une **gamification douce de la vie réelle**
- une **narration assistée par IA**
- une structure inspirée des **RPG narratifs**, des journaux de bord et des aventures textuelles
- une progression basée sur des **quêtes**, des **aventures**, des **inventaires** et des **états internes**

L’application n’est pas un jeu classique.  
C’est un **outil de transformation personnelle**, déguisé en RPG.

---

## 🧱 Stack technique

Le projet repose sur une stack moderne, orientée performance, itération rapide et narration dynamique.

### Frontend

- **[Next.js](chatgpt://generic-entity?number=0)** (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Composants UI custom (RpgShell, RpgUi…)

### Backend & Data

- **[Supabase](chatgpt://generic-entity?number=1)**
    - PostgreSQL
    - RPC (fonctions SQL)
    - Auth & sécurité
- Stockage structuré (aventures, quêtes, inventaires, événements)

### Infrastructure

- **[Vercel](chatgpt://generic-entity?number=2)**
    - Déploiement continu
    - Edge & Serverless Functions

### IA & génération

- Génération de textes narratifs via IA
- Architecture pensée pour intégrer des **workers asynchrones**
- Objectif : **temps de réponse proche du temps réel**, malgré des générations longues

---

## 🕹️ Fonctionnalités principales

### 🎒 Gameplay narratif

- Aventures jouables
- Quêtes structurées
- Progression par chapitres
- États internes et choix narratifs

### 🧠 IA & narration

- Génération de textes immersifs
- Ton RPG / journal intime
- Contextes globaux + contextes de chapitre
- Schémas JSON stricts pour fiabilité et cohérence

### 🧩 Gamification du réel

- Inventaires du quotidien (objets, souvenirs, vinyles, lieux, symboles)
- Actions réelles transformées en quêtes
- Journal de bord automatique

### 🧪 Expérimentation

- Architecture volontairement modulaire
- Projet en évolution constante
- Terrain de jeu pour explorer :
    - narration interactive
    - productivité gamifiée
    - IA comme compagnon, pas comme outil froid

---

## 🚀 Lancer le projet en local

```bash
npm install
npm run dev
```
