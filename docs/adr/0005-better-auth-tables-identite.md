# ADR-0005 — better-auth possède les tables d'identité, pas de table `users` dupliquée

## Statut
Accepté (interprétation d'une phrase de la spec, à confirmer).

## Contexte
La spec dit : "Utilise l'adapter Kysely de better-auth sur la même base Postgres,
et génère ses migrations via son CLI. Une seule base, deux jeux de tables, pas de
synchronisation manuelle d'utilisateurs." Deux lectures possibles :
(a) better-auth gère `user`/`session`/`account`/`verification`, et notre domaine
`identity` a *en plus* sa propre table `users` synchronisée par événements ; ou
(b) better-auth gère `user`/`session`/`account`/`verification`, et c'est la
*seule* source de vérité — notre domaine `identity.User` est un modèle de lecture
sur ces tables, sans duplication.

La phrase "pas de synchronisation manuelle d'utilisateurs" pointe vers (b) : s'il y
avait deux tables `user`, il faudrait les synchroniser (manuellement ou par
événements), ce que la spec écarte explicitement.

## Décision
Lecture (b) retenue :
- Aucune table Lucid `users`. `identity.User` (domaine) est reconstruit à la
  lecture depuis les tables better-auth via `UserDirectory`, implémenté par
  une requête Kysely directe sur `user` (`infrastructure/persistence/identity/user-directory.kysely.ts`).
- Toute écriture sur l'identité (création de compte, changement de rôle,
  liaison de compte SSO) passe exclusivement par l'API/les hooks better-auth
  (dont son plugin `admin` pour le rôle), jamais par un `INSERT`/`UPDATE` SQL
  direct de notre côté — évite toute divergence de hashing de mot de passe ou de
  gestion de session entre les deux systèmes.
- Les migrations better-auth (générées une fois via son CLI) sont copiées et
  adaptées comme **première** migration Lucid, pour que `node ace migration:run`
  reste le point d'entrée unique de `task db:migrate` et que l'ordre
  d'exécution (identité avant tout ce qui la référence en FK) soit garanti sans
  étape manuelle supplémentaire.
- `media_requests.requested_by_user_id` référence directement `user.id` par une
  vraie contrainte FK Postgres (même base, donc FK cross-"propriétaire" possible
  et souhaitable pour l'intégrité référentielle).

## Conséquences
- Le premier utilisateur "admin d'office" (règle d'onboarding) est réalisé en
  appelant l'API de création de compte better-auth puis son plugin `admin` pour
  fixer `role = 'admin'` — pas de logique de rôle dupliquée dans notre domaine.
- Si better-auth s'avère trop contraignant à l'usage (cf. la clause de repli déjà
  présente dans la spec vers `@adonisjs/auth` + Ally custom), cette décision
  devra être révisée en même temps : le repli implique de recréer une vraie table
  `users` applicative.
