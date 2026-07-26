# ADR-0002 — Structure en couches d'abord, contextes ensuite

## Statut
Accepté.

## Contexte
La spec impose explicitement : le premier niveau sous `src/` est la couche
(`domain/`, `application/`, `infrastructure/`, `presentation/`), les bounded
contexts sont des sous-dossiers à l'intérieur de chaque couche. C'est une
contrainte non négociable de la spec, reprise ici pour fixer les conséquences
concrètes qu'elle implique.

## Décision
- Un contexte n'existe dans une couche que s'il y a quelque chose à y mettre
  (`catalog` n'a pas de `persistence/`, `servarr`/`auth`/`images` n'existent que
  dans `infrastructure/`).
- Le câblage port → implémentation se fait exclusivement dans `providers/`
  (service providers Adonis), jamais par un import direct de l'infra depuis
  l'application.
- Les subpath imports (`#domain/*`, `#application/*`, `#infrastructure/*`,
  `#presentation/*`) reflètent uniquement les couches, jamais les contextes — une
  violation de couche est donc visible dans le chemin d'import lui-même, avant
  même l'exécution du linter de frontière.
- La règle de dépendance (`presentation → application → domain`,
  `infrastructure → application → domain`, `domain → rien`) est vérifiée
  mécaniquement par `dependency-cruiser` (cf. ADR-0004), pas seulement documentée.

## Conséquences
- Naviguer un contexte de bout en bout demande de traverser quatre dossiers
  (`domain/requests`, `application/requests`, `infrastructure/persistence/requests`,
  `presentation/requests`) plutôt qu'un seul dossier `modules/requests/` — accepté
  comme coût délibéré en échange de frontières de couches strictes.
- Un test dédié (`tests/boundaries.spec.ts`) exécute `dependency-cruiser` en mode
  `--validate` et échoue la CI si une règle est violée.
