# Phase 0 — Cadrage

Ce dossier contient les livrables de la Phase 0 : arborescence, modèle de domaine,
schéma de base, endpoints HTTP, et ADR. Aucun code n'a été écrit à ce stade.

## Versions vérifiées (2026-07-26, via `npm view` sur le registre + sources officielles)

| Paquet | Version `latest` | Remarque |
|---|---|---|
| `@adonisjs/core` | **7.3.5** | v7 est sortie ; voir écart signalé ci-dessous |
| `@adonisjs/lucid` | 22.4.2 | |
| `@adonisjs/auth` | 10.1.0 | utilisé uniquement pour le middleware HTTP, pas pour l'auth elle-même |
| `@adonisjs/queue` | 0.6.2 | **expérimental**, contient le scheduler cron |
| `@adonisjs/transmit` | 3.0.1 | SSE, non utilisé au MVP (cf. spec) |
| `@vinejs/vine` | 4.4.0 | |
| `better-auth` | **1.6.25** (stable) | branche `beta`/`rc` existent, non retenues |
| `kysely` | 0.29.4 | dépendance de l'adapter better-auth |
| `pg` | 8.22.0 | |
| `zod` | **4.4.3** | v4, API différente de v3 sur certains points (cf. écart) |
| `@tanstack/react-start` | **1.168.32** (stable, v1 sortie de RC) | |
| `@tanstack/react-router` | 1.170.18 | |
| `@tanstack/react-query` | 5.101.4 | |
| `shadcn` (CLI) | 4.15.0 | remplace l'ancien `shadcn-ui` (0.9.5, deprecated) |
| `tailwindcss` | 4.3.3 | v4, généré par le CLI shadcn actuel |
| `dependency-cruiser` | 18.1.0 | |
| `eslint-plugin-boundaries` | 7.1.0 | |
| `@japa/runner` | 5.3.0 | |
| `pnpm` | 11.17.0 | déjà installé localement, correspond au `latest` |
| Node.js local | v24.15.0 | satisfait l'exigence `>=24.0.0` d'AdonisJS 7 |

Sources : registre npm (`npm view`), `adonisjs.com/blog/v7`, `adonisjs.com/releases`,
`better-auth.com/docs/plugins/generic-oauth`, `tanstack.com/blog/announcing-tanstack-start-v1`.

## Écarts par rapport à la spec — à valider

Ces points s'écartent de ta description initiale ou comblent une ambiguïté. Je les ai
tranchés pour pouvoir avancer, mais ce sont des décisions réversibles en Phase 1 si tu
préfères autre chose.

1. **AdonisJS 7, pas 6.** La v7 est sortie depuis la rédaction probable de ta spec.
   Le blog officiel indique une migration v6→v7 "avec à peine de breaking changes",
   et elle apporte de la type-safety end-to-end + OpenTelemetry zero-config, utile
   pour un projet neuf. Contrepartie : elle exige **Node ≥ 24** (présent sur ta
   machine) et `ts-exec` remplace `ts-node`. Si tu préfères rester sur la 6.x pour
   la stabilité de la doc/écosystème communautaire, dis-le et je fige les versions
   en conséquence. → [ADR-0001](../adr/0001-versions-dependances.md)

2. **`@adonisjs/scheduler` n'existe pas.** Ce nom de paquet est introuvable sur npm.
   L'option officielle la plus proche est `@adonisjs/queue` (0.6.2, **marqué
   expérimental**, API susceptible de changer) avec son `start/scheduler.ts` et un
   adapter Postgres (pas besoin de Redis). Vu que le besoin réel est un unique job
   périodique (poll `/queue` toutes les 10s), je préfère une commande Ace avec sa
   propre boucle (`setInterval`/`await sleep`), lancée comme process long-running
   dédié — pas de dépendance expérimentale, pas de tables de jobs à gérer pour un
   besoin aussi simple. Le port `DownloadProgressPort` reste conçu pour qu'on
   bascule sur `@adonisjs/queue` plus tard sans toucher au domaine.
   → [ADR-0003](../adr/0003-reconciliation-progression.md)

3. **`zod` v4, pas v3.** Certaines API ont changé (`z.email()` remplace
   `z.string().email()`, personnalisation des messages d'erreur différente). Les
   mappers ACL `servarr` cibleront explicitement la v4 — à garder en tête en Phase 3
   pour éviter du code v3 obsolète par réflexe.

4. **Une seule instance par service au MVP** (Radarr/Sonarr/Lidarr = un panneau =
   une instance). Ta spec ne l'interdit pas explicitement mais l'onboarding décrit
   "un panneau par app" — j'ai mis une contrainte unique sur `kind` en base, mais le
   modèle de domaine ne verrouille rien qui empêche de la lever plus tard (le champ
   `kind` reste une colonne banale, pas une clé). Si tu veux du multi-instance par
   service dès le MVP (ex: deux Radarr, 4K et 1080p), dis-le — impact modéré sur le
   schéma et sur `CreateRequest` (choix explicite de l'instance).
   → [ADR-0006](../adr/0006-une-instance-par-service.md)

5. **Complétion de l'onboarding sans aucune instance activée.** Ta spec dit chaque
   service "optionnel et activable indépendamment", ce qui autorise littéralement
   zéro service configuré. J'ai laissé cette porte ouverte dans le modèle (pas de
   garde bloquante), mais une app sans aucun service actif est inutilisable :
   recommandation d'ajouter une garde "au moins une instance active" avant de
   pouvoir passer `OnboardingState` à `Completed`. À confirmer.

6. **Table `user` = celle de better-auth, pas de table `users` Lucid séparée.**
   Ta spec dit "une seule base, deux jeux de tables, pas de synchronisation
   manuelle" — j'ai pris ça au pied de la lettre : `identity.User` est un modèle de
   lecture sur les tables générées par le CLI better-auth (`user`, `session`,
   `account`, `verification`), pas une table applicative dupliquée. Toute écriture
   (création de compte, rôle admin) passe exclusivement par l'API better-auth (et
   son plugin `admin`), jamais par un INSERT/UPDATE SQL direct de notre côté.
   → [ADR-0005](../adr/0005-better-auth-tables-identite.md)

7. **Annulation non permise depuis `Importing`/`Available`.** Cohérent avec "trop
   tard pour annuler un import en cours", mais pas explicite dans ta spec — à
   confirmer si tu veux permettre l'annulation à tout moment (avec les effets de
   bord que ça implique côté `*arr`, potentiellement un fichier déjà importé).

8. **Outil de lint de frontière : `dependency-cruiser` pour les deux monorepo
   packages**, plutôt que `eslint-plugin-boundaries` côté frontend. Les deux sont
   autorisés par ta spec ; j'ai choisi un seul outil pour tout le monorepo (config
   unique, pas deux mentaux différents) plutôt que scinder par package.
   → [ADR-0004](../adr/0004-lint-de-frontiere.md)

Aucun autre point de la spec ne m'a semblé ambigu ou technique discutable — le reste
(architecture en couches, ACL `servarr`, better-auth, connecteur frontend injectable)
est repris tel que décrit, avec juste la mise en forme concrète dans les documents
suivants.

## Sommaire des livrables

- [01 — Arborescence détaillée](./01-arborescence.md)
- [02 — Modèle de domaine (entités, VO, ports)](./02-modele-de-domaine.md)
- [03 — Schéma de base de données](./03-schema-base-de-donnees.md)
- [04 — Endpoints HTTP et payloads](./04-endpoints-http.md)
- ADR : [0001](../adr/0001-versions-dependances.md) ·
  [0002](../adr/0002-structure-en-couches.md) ·
  [0003](../adr/0003-reconciliation-progression.md) ·
  [0004](../adr/0004-lint-de-frontiere.md) ·
  [0005](../adr/0005-better-auth-tables-identite.md) ·
  [0006](../adr/0006-une-instance-par-service.md) ·
  [0007](../adr/0007-pas-de-event-store.md) ·
  [0008](../adr/0008-signature-proxy-images.md)
