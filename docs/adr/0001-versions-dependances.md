# ADR-0001 — Versions des dépendances majeures

## Statut
Accepté (validé par l'utilisateur, appliqué en Phase 1).

## Contexte
La spec initiale nomme des versions/paquets (AdonisJS 6, `@adonisjs/scheduler`)
qui ne correspondent plus exactement à l'état actuel de l'écosystème (2026-07-26).
Une vérification `npm view` + recherche a été faite avant d'écrire la moindre
ligne de code, comme demandé.

## Décision

| Paquet | Version retenue | Raison |
|---|---|---|
| `@adonisjs/core` | `^7.3.5` | v7 stable, migration v6→v7 documentée comme quasi sans breaking change ; apporte type-safety end-to-end et OpenTelemetry zero-config. Exige Node ≥ 24 (disponible en local : v24.15.0). |
| `@adonisjs/lucid` | `^22.4.2` | dernière compatible core 7 ; connexion par défaut basculée sur `pg` (le starter kit `api` cible SQLite par défaut) |
| `better-auth` | `^1.6.25` | dernière release **stable** (pas `beta`/`rc`/`canary`) |
| `@tanstack/react-start` | `^1.168.32` | v1 sortie de RC, jugée production-ready par l'équipe TanStack elle-même |
| `@tanstack/react-query` | `^5.101.4` | |
| `shadcn` (CLI) | `^4.15.0` | remplace l'ancien paquet `shadcn-ui` (deprecated à 0.9.5) |
| `tailwindcss` | `^4.3.3` | générée par le CLI shadcn actuel, pas de choix indépendant possible |
| `zod` | `^4.4.3` | v4 ; API de validation légèrement différente de v3 (ex. `z.email()` au lieu de `z.string().email()`) — à garder en tête pour les mappers `servarr` en Phase 3 |
| `dependency-cruiser` | `^18.1.0` | cf. ADR-0004 |
| `@japa/runner` | `^5.3.0` | |
| `pnpm` | `^11.17.0` | déjà la version installée localement |

## Conséquences
- Node 24 devient une contrainte dure pour l'image Docker backend et pour tout
  environnement de dev local (le poste actuel la satisfait déjà).
- `ts-node` est remplacé par `ts-exec` dans AdonisJS 7 (confirmé en Phase 1, via
  `@poppinss/ts-exec` embarqué par `@adonisjs/assembler`).

## Notes d'exécution (Phase 1)

Le starter kit `api` d'AdonisJS 7 embarque par défaut `@adonisjs/auth` (guards à
base de tokens Lucid), `@adonisjs/session`, et `@tuyau/core` (générateur de client
RPC typé end-to-end). Les trois ont été **retirés** du squelette :

- `@adonisjs/auth`/`@adonisjs/session` supposent un modèle `User` Lucid et un
  système de session Adonis — strictement redondant avec better-auth
  (cf. [ADR-0005](./0005-better-auth-tables-identite.md)), qui gère déjà ses
  propres cookies de session sans passer par `@adonisjs/session`. Le
  middleware de résolution de session (Phase 4) appellera directement le port
  `SessionPort` implémenté par-dessus better-auth, sans guard Adonis intermédiaire.
- `@tuyau/core` génère un client frontend fortement typé à partir des routes
  backend — à l'opposé du choix délibéré d'un `ArrConnector` découplé avec deux
  implémentations interchangeables (`Http`/`Fake`) et validation Zod aux
  frontières. Le garder aurait entretenu une deuxième façon, concurrente, de
  parler au backend.

Coté frontend, `vite build` sans `--deployment` cible produit un handler
`{ fetch(request) }` (`dist/server/server.js`) plutôt qu'un serveur Node
autonome — `frontend/server.mjs` est un petit pont `node:http` → Fetch API
écrit pour ce MVP plutôt que d'ajouter l'add-on `nitro` (qui exige un arbre
git propre, non disponible avant le premier commit). À reconsidérer une fois
l'historique git initialisé.
