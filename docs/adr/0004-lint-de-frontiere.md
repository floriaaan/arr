# ADR-0004 — `dependency-cruiser` comme unique outil de lint de frontière

## Statut
Accepté.

## Contexte
La spec autorise explicitement `eslint-plugin-boundaries` ou `dependency-cruiser`
pour garantir mécaniquement la règle de dépendance entre couches, côté backend
comme côté frontend.

## Décision
Utiliser `dependency-cruiser` pour les deux packages du monorepo, avec une config
racine partagée (`.dependency-cruiser.cjs`) étendue par chaque package pour ses
spécificités (alias de subpath imports différents entre backend Node/ESM et
frontend Vite/React).

Raisons du choix par rapport à `eslint-plugin-boundaries` :
- `dependency-cruiser` fonctionne sur le graphe de modules résolu (imports réels),
  indépendamment de la configuration ESLint de chaque package — un seul mental
  model pour tout le monorepo plutôt que deux configurations ESLint à maintenir
  en synchronisation.
- Il produit un graphe visuel (`--output-type dot`) utile pour auditer
  l'architecture en revue, sans changer d'outil.
- Il tourne aussi bien en CLI qu'en test (`tests/boundaries.spec.ts` invoque son
  API programmatique), ce qui permet d'en faire une assertion Japa/Vitest normale
  plutôt qu'un script CI séparé.

## Conséquences
- `eslint-plugin-boundaries` n'est pas installé ; la fonctionnalité analogue passe
  entièrement par `dependency-cruiser`.
- `task check` inclut une étape dédiée (`dependency-cruiser --config
  .dependency-cruiser.cjs --validate`) en plus de `eslint`/`tsc`/tests.
