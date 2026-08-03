# arr

[![CI](https://github.com/floriaaan/arr/actions/workflows/ci.yml/badge.svg)](https://github.com/floriaaan/arr/actions/workflows/ci.yml)
[![CodeQL](https://github.com/floriaaan/arr/actions/workflows/codeql.yml/badge.svg)](https://github.com/floriaaan/arr/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Une façade unique au-dessus de tes instances \*arr. `arr` agrège **Radarr**,
**Sonarr** et **Lidarr** derrière une seule interface : on cherche un film, une
série ou un album, on le demande, et on suit sa progression — de la requête au
téléchargement jusqu'à l'import — sans jamais ouvrir les trois applications.

Ce que ça apporte par rapport aux applications natives :

- **Catalogue et requêtes unifiés** — une recherche, une file de requêtes, quel
  que soit le service cible.
- **Progression réelle** — un réconciliateur interroge en continu les instances
  \*arr, donc une requête ne reste jamais bloquée sur « soumise » (cf.
  [ADR-0003](./docs/adr/0003-reconciliation-progression.md)).
- **Bibliothèque et calendrier** — ce qui est déjà disponible, ce qui sort bientôt.
- **Onboarding guidé** — découverte réseau des instances, test de connexion,
  choix des profils de qualité et des dossiers racine depuis l'UI.
- **Auth intégrée** — email/mot de passe et/ou SSO OIDC (PocketID et compatibles),
  avec des rôles administrateur / utilisateur.
- **Santé des instances** — une instance injoignable est signalée comme telle,
  et non confondue avec une instance volontairement désactivée.

## Stack

| Couche           | Technologie                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Backend          | [AdonisJS 7](https://adonisjs.com) (Node ≥ 24), Lucid ORM, VineJS                                     |
| Frontend         | [TanStack Start](https://tanstack.com/start) + React 19, TanStack Router/Query, Tailwind 4, shadcn/ui |
| Base de données  | PostgreSQL 16                                                                                         |
| Authentification | [better-auth](https://better-auth.com) (email/password + OIDC générique)                              |
| Monorepo         | pnpm workspaces, [Task](https://taskfile.dev) comme lanceur de commandes                              |
| Qualité          | ESLint, Prettier, TypeScript strict, Japa (back), Vitest (front), dependency-cruiser                  |

## Démarrage rapide

Prérequis : **Node ≥ 24**, **pnpm 11**, **Docker** (pour Postgres) et
[**Task**](https://taskfile.dev/installation/).

```bash
git clone https://github.com/floriaaan/arr.git
cd arr

task setup   # installe les dépendances, crée les .env depuis les .env.example, build une fois
```

Renseigne ensuite `APP_KEY` dans `.env` et `backend/.env` (une chaîne aléatoire
de 32 caractères, par ex. `openssl rand -base64 32`), puis :

```bash
task dev     # Postgres en conteneur + backend, frontend et réconciliateur en local
```

Le frontend écoute sur <http://localhost:3000>, le backend sur
<http://localhost:3333>. Au premier lancement, l'interface redirige vers
`/setup` pour créer le compte administrateur et connecter les instances.

### Sans backend

Le frontend sait tourner entièrement hors-ligne contre un connecteur factice —
pratique pour travailler l'UI sans base de données ni instance \*arr :

```bash
task dev:fake
```

### Stack complète en Docker

```bash
cp .env.example .env   # renseigne APP_KEY
task up                # build + démarre db, backend, frontend, reconciler, health
task logs
task down
```

Seul le frontend est exposé sur l'hôte ; il relaie `/api/*` vers le backend par
le réseau interne Docker.

## Configuration

Deux fichiers d'environnement, avec des rôles distincts :

- **`.env` (racine)** — consommé par Docker Compose : provisioning Postgres,
  ports publiés, secrets partagés entre conteneurs.
- **`backend/.env`** — consommé par le backend en développement local.

Les variables principales :

| Variable                                                          | Défaut                                       | Rôle                                                                                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_KEY`                                                         | —                                            | **Requis.** Clé de chiffrement AdonisJS (sessions, cookies, clés d'API stockées).                                                               |
| `APP_URL`                                                         | `http://localhost:3333`                      | URL publique du backend.                                                                                                                        |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_DATABASE` | `localhost` / `5432` / `arr` / `arr` / `arr` | Connexion PostgreSQL.                                                                                                                           |
| `CORS_ORIGIN`                                                     | `http://localhost:3000`                      | Origine du frontend — également les `trustedOrigins` better-auth, nécessaire au SSO.                                                            |
| `LOG_LEVEL`                                                       | `info`                                       | Niveau de log Pino.                                                                                                                             |
| `OIDC_ISSUER_URL` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET`       | vide                                         | SSO OIDC. Optionnel : configurable depuis l'UI d'onboarding. Quand elles sont définies, ces variables **priment** sur la configuration en base. |
| `DISABLE_PASSWORD_LOGIN`                                          | `false`                                      | Force le SSO comme unique moyen de connexion.                                                                                                   |
| `VITE_CONNECTOR`                                                  | `http`                                       | `http` = vrai backend, `fake` = connecteur factice hors-ligne.                                                                                  |
| `FRONTEND_PORT` / `BACKEND_PORT`                                  | `3000` / `3333`                              | Ports publiés par Compose.                                                                                                                      |

## Commandes

Tout passe par [Task](https://taskfile.dev) — `task --list` donne la liste complète.

| Commande                                                                  | Effet                                                             |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `task setup`                                                              | Install + `.env` + build initial                                  |
| `task dev`                                                                | Stack de dev complète (db conteneurisée, processus locaux)        |
| `task dev:fake`                                                           | Frontend seul contre le connecteur factice                        |
| `task dev:db`                                                             | Postgres seul                                                     |
| `task check`                                                              | **La commande CI** : lint + typecheck + tests + lint de frontière |
| `task lint` / `task format` / `task typecheck`                            | Sur les deux packages                                             |
| `task test` / `task test:back` / `task test:front`                        | Suites de tests                                                   |
| `task boundaries`                                                         | Vérifie la règle de dépendance entre couches                      |
| `task build`                                                              | Build des deux packages                                           |
| `task db:migrate` / `task db:rollback` / `task db:seed` / `task db:reset` | Migrations et seeds                                               |
| `task up` / `task down` / `task logs`                                     | Stack Docker de type production                                   |

## Architecture

Les deux packages suivent la **même architecture en couches**
([ADR-0002](./docs/adr/0002-structure-en-couches.md)), avec une règle de
dépendance à sens unique, vérifiée automatiquement par `dependency-cruiser`
([ADR-0004](./docs/adr/0004-lint-de-frontiere.md)) :

```
presentation ─┐
              ├─→ application ─→ domain
infrastructure┘
```

- **`domain/`** — entités, agrégats, value objects, événements et _interfaces de
  ports_. Zéro dépendance : ni framework, ni client HTTP, ni Zod.
- **`application/`** — cas d'usage, orchestration. Dépend uniquement du domaine.
- **`infrastructure/`** — implémentations des ports : dépôts Lucid, ACL `servarr`,
  adapter better-auth, cache d'images.
- **`presentation/`** — contrôleurs et routes HTTP côté backend, composants React
  et routes côté frontend.

Le câblage des ports vers leurs implémentations se fait dans `providers/`, en
dehors de `src/` — `presentation` n'importe jamais `infrastructure` directement.

```
arr/
├── backend/                 # AdonisJS 7
│   ├── app/ start/ config/  # glue framework (snake_case)
│   ├── commands/            # commandes Ace : requests:reconcile, instances:health
│   ├── database/            # migrations, schéma
│   ├── providers/           # câblage des ports
│   ├── src/                 # domain / application / infrastructure / presentation
│   └── tests/               # miroir de src/ + tests fonctionnels
├── frontend/                # TanStack Start + React 19
│   ├── providers/           # sélection du connecteur (http | fake)
│   ├── src/                 # mêmes quatre couches
│   └── tests/               # domain, presentation, contrat de connecteur
└── docs/                    # ADR + spécifications par phase
```

### Processus longs

Au-delà du serveur HTTP, deux commandes Ace tournent comme services dédiés
(services `reconciler` et `health` dans `compose.yml`) :

- **`requests:reconcile`** — interroge les instances \*arr et fait avancer l'état
  des requêtes. Sans lui, la progression ne dépasse jamais « soumise ».
- **`instances:health`** — re-vérifie périodiquement la joignabilité des
  instances, pour distinguer « désactivée » de « injoignable ».

En développement local, `task dev` lance le réconciliateur ; le contrôle de santé
se lance à la demande avec `node ace instances:health` depuis `backend/`.

### Connecteur frontend

Le frontend ne parle jamais directement au backend depuis ses composants : il
passe par l'interface `ArrConnector`, dont il existe deux implémentations —
`HttpArrConnector` (vrai backend) et `FakeArrConnector` (données en mémoire).
La sélection se fait par `VITE_CONNECTOR`, et une suite de tests de contrat
garantit que les deux se comportent identiquement.

## Tests

```bash
task test           # backend (Japa) + frontend (Vitest)
task test:back
task test:front
task test:contract  # suite de contrat ArrConnector (Http vs Fake)
```

Les tests backend ont besoin d'une base PostgreSQL joignable
(`task dev:db` suffit) ; sa configuration vit dans `backend/.env.test`.

## Intégration continue

| Workflow                                       | Déclencheur                              | Rôle                                                                |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| [`ci.yml`](./.github/workflows/ci.yml)         | push `main`, pull requests               | `task check` (lint, typecheck, tests, frontières) puis `task build` |
| [`docker.yml`](./.github/workflows/docker.yml) | push `main`, tags `v*.*.*`               | Build et publication des images backend/frontend sur GHCR           |
| [`codeql.yml`](./.github/workflows/codeql.yml) | push `main`, pull requests, hebdomadaire | Analyse statique de sécurité                                        |

Les images publiées sont consommables directement :

```bash
docker pull ghcr.io/floriaaan/arr-backend:latest
docker pull ghcr.io/floriaaan/arr-frontend:latest
```

## Documentation

- [`docs/adr/`](./docs/adr) — décisions d'architecture, avec leur contexte et
  leurs conséquences.
- [`docs/phase-0/`](./docs/phase-0) — cadrage : arborescence, modèle de domaine,
  schéma de base, endpoints HTTP.
- [`docs/phase-1/`](./docs/phase-1) et suivantes — spécifications par phase
  (connecteur, bibliothèque et calendrier, profils d'instance, clients de
  téléchargement et indexeurs, confort d'usage, fiabilité des requêtes).

## Contribuer

Avant d'ouvrir une pull request :

```bash
task format
task check
```

Les décisions structurantes se documentent par un ADR dans `docs/adr/`. Le
[`CLAUDE.md`](./CLAUDE.md) résume les conventions du dépôt à l'usage des agents
de code — il est aussi une bonne mise en route pour un contributeur humain.

## Licence

[MIT](./LICENSE)
