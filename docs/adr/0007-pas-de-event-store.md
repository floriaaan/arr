# ADR-0007 — Pas d'event store / outbox au MVP

## Statut
Accepté.

## Contexte
Le domaine émet des événements (`MediaRequested`, `RequestProgressed`, etc.). La
spec ne demande pas explicitement de les persister, mais une architecture DDD
event-driven pousse naturellement vers un event store ou un pattern outbox pour
la fiabilité de publication (ex. vers un futur SSE `@adonisjs/transmit`).

## Décision
Les événements domaine restent **en mémoire, dispatchés de façon synchrone** par
un `event-bus.ts` applicatif juste après la sauvegarde de l'agrégat dans le même
use case (pas de table `domain_events`, pas de publication asynchrone garantie).
Les seuls abonnés au MVP : un logger structuré (traçabilité des transitions
d'état) et, potentiellement, un futur hook de notification.

## Conséquences
- Aucune garantie de livraison si le process crash entre la sauvegarde en base et
  le dispatch de l'événement (fenêtre très courte, acceptable pour du logging).
- Pas de replay possible / pas d'audit trail durable au MVP.
- Si un besoin d'audit trail ou de SSE fiable apparaît, cet ADR est le point de
  départ pour introduire un outbox (table `domain_events` + un publisher qui la
  vide) — le reste du domaine n'a pas besoin de changer, seul l'`event-bus`
  applicatif serait remplacé.
