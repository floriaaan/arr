# Phase 3 — Addendum : gestion des Quality Profiles natifs *arr

Suite à retour : `InstanceProfile` (le préréglage nommé root folder + quality
profile + langue/metadata + series type + minimum availability, cf.
`00-overview-et-decisions.md`) reste tel quel — il référence un
`qualityProfileId` mais ne le crée pas. Ce document ajoute une gestion
**CRUD des Quality Profiles eux-mêmes**, poussée en direct vers Radarr/Sonarr/
Lidarr via leur API (`/api/v3/qualityprofile`, `/api/v1/qualityprofile` pour
Lidarr) — pas de table locale, l'*arr est la seule source de vérité.

Un Quality Profile *arr n'a **aucun rapport structurel** avec un
`InstanceProfile` : c'est une liste ordonnée de qualités autorisées + un
cutoff + des réglages de format, sans root folder. Les deux concepts
coexistent : `InstanceProfile` référence un `qualityProfileId` par son id
numérique, que ce id vienne d'un profil déjà présent dans l'*arr ou d'un
profil tout juste créé via cette nouvelle gestion.

## Décisions

1. **Passthrough plutôt que modélisation complète.** Le schéma réel
   (`items` peut contenir des groupes imbriqués, `formatItems`,
   `minFormatScore`, `language`…) est trop riche et diverge légèrement entre
   Radarr/Sonarr/Lidarr pour être modélisé champ par champ. Le backend traite
   le corps comme un objet largement opaque (`QualityProfileRecord = Record<string, unknown> & { name, upgradeAllowed, cutoff, items }`),
   ne connaît que les 4 champs qu'il édite, et fait circuler le reste tel
   quel entre le *arr et le frontend — aucun risque de perdre un champ qu'on
   ne modélise pas.

2. **Le formulaire édite un profil à plat.** `GET .../qualityprofile/schema`
   fournit un template pour un nouveau profil ; éditer un profil existant
   réutilise l'objet tel que renvoyé par `GET .../qualityprofile/:id`. Les
   items avec groupes imbriqués (rares, créés manuellement dans l'*arr) sont
   affichés comme une seule ligne togglable sur le champ `allowed` du
   groupe — leurs enfants ne sont pas édités mais restent intacts dans
   l'objet renvoyé.

3. **Aucune nouvelle table.** Le backend ne fait que relayer vers le *arr
   avec les identifiants déjà stockés de l'instance (même pattern que
   `catalogForInstance`) — pas de persistance, pas de synchronisation à
   maintenir.

## Backend

- `domain/settings/interfaces/servarr-quality-profile-manager.interface.ts` —
  port `ServarrQualityProfileManager { list, getSchema, create, update, delete }`.
- `infrastructure/servarr/quality-profile-manager.ts` — implémentation HTTP,
  réutilise `BaseServarrClient` et `apiPathPrefix(kind)`.
- `application/settings/{list,get-schema-for,create,update,delete}-quality-profile*.use-case.ts` —
  résolvent l'instance via `ServarrInstanceRepository.findByKind`, comme
  `FetchInstanceProfiles`/`catalogForInstance`.
- Routes (`adminOnly`, sous `/api/settings/instances/:kind/quality-profiles`) :
  `GET /`, `GET /schema`, `POST /`, `PUT /:id`, `DELETE /:id`.

## Frontend

- `domain/settings/quality-profile-record.ts` — types miroir, passthrough.
- Nouvelle section « Quality profiles » sous chaque instance dans `/profiles`,
  distincte de « Saved presets » (les `InstanceProfile`) : liste des profils
  natifs avec éditer/supprimer, formulaire de création à partir du schema
  (nom, cutoff, upgrade allowed, cases à cocher par qualité).
