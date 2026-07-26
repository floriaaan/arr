# ADR-0006 — Une seule instance active par service `*arr` au MVP

## Statut
Proposé (hypothèse à confirmer).

## Contexte
L'onboarding décrit "un panneau par app (Radarr, Sonarr, Lidarr), chacun optionnel
et activable indépendamment" — ce qui suggère une instance par service, sans le
dire explicitement. Rien n'interdit littéralement plusieurs instances Radarr
(ex. un séparé 4K et un 1080p), cas d'usage réel chez certains utilisateurs
self-hosted.

## Décision
Contrainte unique `(kind)` sur `servarr_instances` au MVP : une seule ligne par
`kind`. `MediaKind → adapter actif` dans le `ServarrRegistry` reste donc une
résolution simple sans ambiguïté de choix d'instance côté `CreateRequest`.

Le schéma est conçu pour que cette contrainte soit **la seule chose à lever**
si le multi-instance devient nécessaire : `kind` reste une colonne banale (pas une
clé primaire), et `POST /api/requests` accepte déjà un `instanceId` optionnel
(requis dès qu'il y a ambiguïté) plutôt que de résoudre l'instance implicitement
par `kind` seul.

## Conséquences
- L'écran "Services" de l'onboarding n'a pas besoin d'un flux "ajouter une autre
  instance Radarr" au MVP — un panneau fixe par service suffit.
- Si l'utilisateur confirme vouloir le multi-instance dès le MVP, cet ADR est
  révisé avant la Phase 1 (impact : suppression de la contrainte unique, ajout
  d'un sélecteur d'instance dans l'UI de settings, `instanceId` devient
  systématiquement requis dans `CreateRequest` dès qu'un service a plusieurs
  instances actives).
