# CLAUDE.md

Notes à l'usage de Claude Code (et de tout agent) travaillant sur ce dépôt.
Le [README](./README.md) couvre l'installation et l'usage ; ce fichier couvre
les conventions à respecter en écrivant du code.

## Le projet en une phrase

Monorepo pnpm : un backend AdonisJS 7 et un frontend TanStack Start qui, ensemble,
exposent Radarr / Sonarr / Lidarr derrière une interface unique de recherche, de
requête et de suivi de téléchargement.

## Commandes

Tout passe par [Task](https://taskfile.dev) depuis la racine — pas de `pnpm run`
direct dans les packages sauf besoin ponctuel.

```bash
task check        # LA commande à lancer avant de rendre : lint + typecheck + tests + frontières
task lint         # ESLint sur les deux packages
task format       # Prettier (+ eslint --fix côté frontend)
task typecheck    # tsc --noEmit sur les deux packages
task test         # Japa (backend) + Vitest (frontend)
task test:back    # nécessite Postgres joignable — `task dev:db` suffit
task test:front
task boundaries   # dependency-cruiser, règle de dépendance entre couches
task build

task dev          # stack de dev complète
task dev:fake     # frontend seul contre FakeArrConnector, sans backend ni base
task db:migrate   # migrations
```

`task check` est exactement ce que lance la CI. Si elle passe en local, elle
passe en CI.

## Architecture — la règle à ne pas casser

`backend/src/` et `frontend/src/` ont **la même** structure : la couche d'abord,
le bounded context ensuite (`domain/requests/`, et non `requests/domain/`).

```
presentation ─┐
              ├─→ application ─→ domain
infrastructure┘
```

- **`domain/`** — entités, agrégats, value objects, événements, et les interfaces
  de ports. **Zéro dépendance** : pas de framework, pas de client HTTP, pas même
  Zod. `dependency-cruiser` fait échouer la CI sur le moindre import externe.
- **`application/`** — cas d'usage. Ne dépend que du domaine ; jamais de
  `infrastructure` ni de `presentation`.
- **`infrastructure/`** — implémentations des ports (dépôts Lucid, ACL `servarr`,
  adapter better-auth, cache d'images). Jamais d'import de `presentation`.
- **`presentation/`** — contrôleurs et routes HTTP côté backend, composants React
  et routes côté frontend. **Jamais d'import de `infrastructure`.**

Le câblage port → implémentation se fait **exclusivement dans `providers/`**, en
dehors de `src/`. Si tu as besoin d'une implémentation concrète depuis un cas
d'usage ou un contrôleur, injecte-la ; ne l'importe pas.

Références : [ADR-0002](./docs/adr/0002-structure-en-couches.md) (structure),
[ADR-0004](./docs/adr/0004-lint-de-frontiere.md) (lint de frontière).

### Imports

Les subpath imports reflètent la couche, jamais le contexte — une violation de
couche se voit donc dans le chemin d'import lui-même :

```ts
import { MediaRequest } from '#domain/requests/media-request.aggregate.js' // backend : extension .js obligatoire (ESM)
import { CreateRequest } from '#application/requests/create-request.use-case' // frontend : sans extension
```

Backend : `#domain/*`, `#application/*`, `#infrastructure/*`, `#presentation/*`,
plus les alias AdonisJS (`#controllers/*`, `#config/*`, `#start/*`, `#tests/*`…).
Frontend : les quatre mêmes alias de couche.

### Nommage des fichiers

- **Sous `src/` (les deux packages)** : kebab-case avec un suffixe explicite —
  `*.aggregate.ts`, `*.entity.ts`, `*.vo.ts`, `*.interface.ts`, `*.use-case.ts`,
  `*.events.ts`, `*.repository.ts`, `*.mapper.ts`, `*.controller.ts`, `*.routes.ts`.
  La règle `@unicorn/filename-case` est explicitement désactivée pour ces chemins.
- **Glue AdonisJS (`app/`, `start/`, `config/`, `providers/`, `database/`,
  `commands/`, `tests/functional/`)** : snake_case, convention du framework.

## Style

- Prettier : pas de point-virgule, guillemets simples, virgule finale, 100 colonnes.
  Ne formate pas à la main — `task format`.
- TypeScript strict des deux côtés. Pas de `any` : la base n'en contient
  actuellement aucun, garde-la comme ça.
- Pas de `console.log` dans le code livré — le backend a un logger Pino, le
  frontend n'en a pas besoin en production.
- Les commentaires expliquent **pourquoi**, pas quoi. La base en compte peu mais
  ils sont denses : quand un choix est contre-intuitif (un contournement du
  client de test Japa, un `200` sur un échec de connexion), il est justifié sur
  place, souvent avec un lien vers l'ADR ou la spec de phase. Suis cet usage
  plutôt que d'annoter l'évident.
- La documentation du dépôt (ADR, specs de phase, commentaires de décision) est
  **en français**. Le code, les noms de symboles et les messages d'erreur sont en
  anglais.

## Tests

- **Backend — Japa.** `tests/domain/`, `tests/application/`,
  `tests/infrastructure/`, `tests/presentation/` miroitent `src/` ;
  `tests/functional/` teste les parcours HTTP de bout en bout et a besoin d'une
  vraie base Postgres (`backend/.env.test`).
- **Frontend — Vitest.** `tests/domain/`, `tests/presentation/`, plus
  `tests/contract/` : une suite qui rejoue le même scénario contre
  `HttpArrConnector` et `FakeArrConnector` pour garantir qu'ils restent
  interchangeables. Si tu ajoutes une méthode à `ArrConnector`, implémente-la
  **dans les deux**.
- `tests/boundaries.spec.ts` (frontend) exécute `dependency-cruiser` en mode
  validation — une violation de couche fait échouer les tests, pas seulement le
  lint.

Un bug corrigé mérite un test de non-régression, avec en commentaire ce qui
cassait (c'est le motif suivi par les tests fonctionnels existants).

## Le connecteur frontend

Aucun composant ne parle au backend en direct : tout passe par l'interface
`ArrConnector` (`frontend/src/domain/interfaces/arr-connector.ts`), avec deux
implémentations sélectionnées par `VITE_CONNECTOR` :

- `HttpArrConnector` — le vrai backend.
- `FakeArrConnector` — données en mémoire, permet `task dev:fake` sans backend
  ni base.

## Processus longs

Deux commandes Ace tournent comme services dédiés, en plus du serveur HTTP :

- **`requests:reconcile`** — fait avancer l'état des requêtes en interrogeant les
  instances \*arr. Sans lui, une requête reste bloquée sur « soumise »
  ([ADR-0003](./docs/adr/0003-reconciliation-progression.md)).
- **`instances:health`** — re-teste périodiquement la joignabilité des instances,
  pour ne pas confondre « désactivée » et « injoignable ».

Si tu touches au cycle de vie d'une requête ou à l'état d'une instance, vérifie
l'impact sur ces commandes — elles écrivent en base hors du flux HTTP.

## Sécurité

- Une clé d'API `*arr` n'est **jamais** renvoyée en clair par l'API : les DTO
  exposent `hasApiKey: boolean`. Ne casse pas cette propriété en ajoutant un champ.
- Une clé d'API ne transite jamais en query string (d'où le `POST` sur
  `/api/onboarding/instances/profiles`) — elle finirait dans les logs d'accès.
- Toute écriture sur l'identité passe par l'API better-auth, jamais par un
  `INSERT`/`UPDATE` SQL direct sur ses tables
  ([ADR-0005](./docs/adr/0005-better-auth-tables-identite.md)).
- Les images distantes passent par un proxy signé
  ([ADR-0008](./docs/adr/0008-signature-proxy-images.md)).

## Documentation

- **`docs/adr/`** — décisions d'architecture. Une décision structurante (choix de
  dépendance, changement de frontière, abandon d'un mécanisme) mérite un nouvel
  ADR numéroté, pas une modification d'un ADR existant.
- **`docs/phase-*/`** — spécifications par phase, avec la liste des écarts
  assumés et des points à valider. C'est la source de vérité fonctionnelle :
  lis la phase concernée avant de modifier un comportement métier.
- **`docs/phase-0/04-endpoints-http.md`** — contrat HTTP (formes de réponse,
  codes d'erreur). À tenir à jour en ajoutant un endpoint.

## Avant de rendre

1. `task format`
2. `task check`
3. Un ADR si la décision est structurante ; une mise à jour de la spec de phase
   si le comportement métier change.
