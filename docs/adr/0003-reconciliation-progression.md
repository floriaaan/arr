# ADR-0003 — Réconciliation de la progression sans `@adonisjs/scheduler`

## Statut
Proposé (à valider — écart signalé par rapport à la spec initiale).

## Contexte
La spec suggère `@adonisjs/scheduler` ou une commande Ace lancée par un worker.
Vérification faite : **`@adonisjs/scheduler` n'existe pas** sur le registre npm.
L'option officielle la plus proche est `@adonisjs/queue` (0.6.2), qui embarque un
scheduler cron (`start/scheduler.ts`, méthodes `.every()` / `.cron()`) avec un
adapter Postgres — mais le paquet est explicitement marqué **expérimental**, API
susceptible de changer entre versions mineures.

Le besoin réel du MVP est simple : un job unique, qui tourne toutes les 10 secondes
*tant qu'il existe au moins une `MediaRequest` active*, sans garanties de queue
distribuée, retry élaboré, ou concurrence multi-worker.

## Décision
Implémenter le reconciler comme une **commande Ace** (`node ace requests:reconcile`)
contenant sa propre boucle (`while (true) { ...; await sleep(10_000) }`), lancée
comme process long-running dans son propre conteneur/service Docker. Elle appelle le use case
`ReconcileProgress`, qui :
1. lit `MediaRequestRepository.findActiveWithExternalRef()`,
2. groupe par instance concernée, appelle `DownloadProgress.fetchProgress(refs)`,
3. applique les transitions d'état sur chaque agrégat, sauvegarde, laisse les
   événements domaine se propager à l'event bus applicatif.

Pas de dépendance à `@adonisjs/queue` au MVP.

## Conséquences
- Pas de dépendance expérimentale, pas de table de jobs à gérer pour un besoin
  aussi simple, déploiement plus lisible (un process = un rôle).
- Pas de garanties de distribution/idempotence multi-instance du reconciler — non
  nécessaire à l'échelle d'un self-hosted mono-utilisateur/famille.
- Le port `DownloadProgress` ne référence rien de spécifique à Ace : basculer
  vers `@adonisjs/queue` plus tard (si le besoin de retry/observabilité grandit)
  ne touche que `infrastructure/scheduling/`, jamais le domaine ni les use cases.
- Si l'utilisateur préfère malgré tout adopter `@adonisjs/queue` dès le MVP
  (par cohérence avec un futur besoin de queue plus large, ex. jobs d'import),
  cet ADR est révisé sans impact sur le reste de l'architecture.
