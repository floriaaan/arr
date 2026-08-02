# ADR-0009 — `@better-auth/cli` sorti des devDependencies, override `brace-expansion`

## Statut

Accepté.

## Contexte

Dependabot remontait 15 avis de sécurité sur le dépôt : 1 critique, 10 hautes,
3 modérées, 1 basse. À l'inspection, la répartition n'était pas celle qu'on
imagine — 14 des 15 avis provenaient d'un **unique** paquet, et aucun ne
concernait le code applicatif :

- `@better-auth/cli@1.4.21` épingle `better-auth: "1.4.21"` en version **exacte**
  (ainsi que `@better-auth/core` et `@better-auth/telemetry`). Cette copie
  imbriquée traînait la faille critique (replay de refresh-token OAuth), six
  hautes, une modérée et la basse — alors que la dépendance _directe_ du backend,
  `better-auth@1.6.25`, est au-dessus de tous les correctifs. L'application
  n'était donc pas vulnérable ; sa boîte à outils de développement l'était.
- Le même CLI tirait `drizzle-orm@^0.41.0` (injection SQL, haute) et, via
  `@mrleebo/prisma-ast` → `chevrotain`, `lodash@4.17.21` (injection de code,
  haute, plus deux pollutions de prototype modérées).
- Reste `brace-expansion@1.1.16` (DoS par expansion non bornée, haute), transitif
  sous `eslint` → `minimatch`.

`@better-auth/cli@1.4.21` **est la dernière version publiée** : il n'existait
aucune montée de version capable de corriger ces avis.

Or ce CLI n'était câblé nulle part — ni script npm, ni tâche du Taskfile, ni
import. Les tables better-auth sont créées par une migration Lucid classique
déjà commitée (`create_identity_tables_table`), et
[la spec de schéma](../phase-0/03-schema-base-de-donnees.md) décrit déjà l'outil
comme s'invoquant en `npx @better-auth/cli generate`, sans supposer qu'il soit
déclaré.

## Décision

1. **`@better-auth/cli` retiré des devDependencies du backend.** Pour régénérer le
   schéma better-auth, on l'invoque par `npx` en épinglant `@latest` — ce que la
   spec décrivait déjà.
2. **Override pnpm `brace-expansion@1: ^1.1.17`** dans `pnpm-workspace.yaml`,
   ciblé sur la ligne 1.x pour ne pas forcer une 5.x là où `minimatch` attend une
   1.x.

Une alternative a été écartée : forcer `better-auth` à 1.6.25 sous le CLI par un
override. Le CLI épingle `@better-auth/core@1.4.21` et
`@better-auth/utils@0.3.0`, dont les peer dependencies diffèrent de celles de la
1.6.25 — on aurait obtenu un trio incohérent, et un CLI cassé au lieu d'un CLI
vulnérable.

## Conséquences

- `pnpm audit` ne remonte plus rien (15 → 0).
- Le lockfile perd ~700 lignes : le CLI tirait tout un arbre (`@prisma/client`,
  `drizzle-orm`, Babel, `chevrotain`, `prompts`) dont rien d'autre ne se sert.
  `@prisma/client` et `drizzle-orm` disparaissent complètement. `better-sqlite3`
  reste, tiré par ailleurs — d'où le maintien de son entrée `allowBuilds`.
- Régénérer le schéma better-auth demande un accès réseau au moment où on le
  fait, et donne la version courante du CLI plutôt qu'une version figée. C'est
  plutôt un gain : un CLI figé en 1.4.21 aurait généré un schéma pour une version
  de better-auth que l'application n'utilise plus depuis vingt versions mineures.
- **Ne pas remettre `@better-auth/cli` en devDependency** sans relire cet ADR :
  ce geste réintroduit à lui seul 14 des 15 avis.
- L'override `brace-expansion` est à retirer dès qu'`eslint` remontera de
  lui-même sur une `minimatch` corrigée.
