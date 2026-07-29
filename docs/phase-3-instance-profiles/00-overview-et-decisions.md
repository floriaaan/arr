# Phase 3 — Gestion des profils par instance *arr

Ajout d'une page dédiée **`/profiles`** (admin uniquement, hors de `/settings`)
permettant de créer, éditer, supprimer et définir un profil par défaut pour
chaque instance *arr configurée (Radarr, Sonarr, Lidarr).

Un « profil » est un préréglage nommé regroupant les mêmes champs que la
configuration actuelle d'une instance (`rootFolderPath`, `qualityProfileId`,
`metadataProfileId?`, `languageProfileId?`). Aujourd'hui `ServarrInstance` n'en
porte qu'un seul, réglé une fois dans `/settings` au moment du test de
connexion. Cette phase permet d'en avoir **plusieurs** par instance (ex. « 4K »,
« Anime », « Standard »), et de choisir lequel est actif.

Hors périmètre (tranché explicitement) : le choix d'un profil **au moment
d'une requête** n'est pas ajouté. `CreateRequest` continue de ne consommer que
le profil marqué par défaut sur l'instance — comme aujourd'hui. Cette page est
un écran d'administration, pas une option exposée aux demandeurs.

## Portée

- Nouvelle page `/profiles`, protégée par `requireAdmin` (même garde que
  `/settings`), avec sa propre entrée de nav dans `AppShell` (section admin,
  à côté du lien Settings).
- Backend : nouvelle table `instance_profiles`, nouvel aggregate domaine,
  use cases CRUD + « set default », endpoints sous `/api/settings/instances/:kind/saved-profiles`.
- Frontend : nouveau domaine, hooks `application/`, composants
  `presentation/profiles/`.
- Aucune modification de `CreateRequest`, du provisioning, ni du schéma
  `media_requests`.

## Décisions

1. **Le profil par défaut reste consommé via `ServarrInstance`, inchangé.**
   Plutôt que de faire lire à `CreateRequest`/`MediaProvisioning` une nouvelle
   table, définir un profil comme défaut **écrit à travers** dans
   `ServarrInstance.configure(...)` (les 4 champs qu'elle porte déjà) et
   persiste l'instance. `CreateRequest` ne change donc pas d'une ligne — il
   continue de lire `instance.rootFolderPath` / `instance.qualityProfileId` /
   etc. C'est le choix qui limite le plus le blast radius de cette phase.

2. **Le formulaire existant dans `/settings` (`ServiceInstanceForm`) n'est pas
   supprimé.** Il reste le chemin de configuration initiale rapide
   (connexion + test + premier root folder/quality profile). À la première
   sauvegarde réussie d'une instance qui n'a encore aucun profil enregistré,
   `SaveInstance` crée automatiquement une ligne `instance_profiles` nommée
   `"Default"`, marquée `isDefault = true`, à partir des valeurs soumises.
   La nouvelle page `/profiles` prend le relai pour tout ce qui est
   multi-profils (ajout, renommage, suppression, changement de défaut) —
   y compris sur ce profil `"Default"` auto-créé, qui est un profil comme un
   autre une fois créé.

3. **Un seul profil par défaut par instance, contrainte posée en base.**
   Index unique partiel `on instance_profiles (instance_id) where is_default`.
   Définir un nouveau défaut désactive l'ancien dans la même transaction.

4. **Suppression interdite sur le profil par défaut.** Il faut d'abord définir
   un autre profil comme défaut. Si l'instance n'a qu'un seul profil, il n'est
   pas supprimable tant que l'instance existe (supprimer l'instance entière
   reste possible depuis `/settings`, et cascade sur ses profils via
   `on delete cascade` — comportement déjà correct, rien à faire côté
   `DeleteInstance`).

5. **Validation par kind réutilisée, extraite en règle partagée.**
   `ServarrInstance.configure()` contient déjà la logique « `metadataProfileId`
   uniquement pour Lidarr », « `languageProfileId` uniquement pour Sonarr ».
   Extraction en fonction pure `validateProfileSelection(kind, metadataProfileId, languageProfileId): Result<void, ValidationError>`
   dans `domain/settings/`, appelée à la fois par `ServarrInstance.configure()`
   et par le nouvel aggregate `InstanceProfile` — pas de duplication de règle
   métier.

6. **Pas de re-validation réseau à l'écriture.** Comme aujourd'hui avec
   `SaveInstance` : les id/paths viennent du catalogue déjà récupéré via
   `FetchInstanceProfiles` (bouton « Test connection » / fetch existant), mais
   le backend ne revérifie pas leur existence côté *arr à la sauvegarde. Pas de
   nouvel appel HTTP sortant introduit par cette phase.

## Modèle de domaine

```ts
// domain/settings/instance-profile.aggregate.ts
interface InstanceProfileProps {
  instanceId: string
  name: string                              // 1..64 chars, unique par instance
  rootFolderPath: RootFolderPath
  qualityProfileId: QualityProfileId
  metadataProfileId: MetadataProfileId | null   // Lidarr uniquement
  languageProfileId: LanguageProfileId | null   // Sonarr uniquement
  isDefault: boolean
}

class InstanceProfile extends AggregateRoot<string> {
  static create(id, instanceId, kind, name, rootFolderPath, qualityProfileId,
    metadataProfileId, languageProfileId, isDefault): Result<InstanceProfile, ValidationError>
  rename(name: string): Result<void, ValidationError>
  updateSelection(kind, rootFolderPath, qualityProfileId, metadataProfileId, languageProfileId): Result<void, ValidationError>
  markDefault(): void
  unmarkDefault(): void
}
```

```ts
// domain/settings/interfaces/instance-profile-repository.interface.ts
interface InstanceProfileRepository {
  listByInstance(instanceId: string): Promise<InstanceProfile[]>
  findById(id: string): Promise<InstanceProfile | null>
  save(profile: InstanceProfile): Promise<void>
  delete(id: string): Promise<void>
}
```

## Use cases (`application/settings/`)

| Use case | Entrée | Sortie | Notes |
|---|---|---|---|
| `ListInstanceProfiles` | `{ instanceId }` | `InstanceProfile[]` | |
| `CreateInstanceProfile` | `{ instanceId, name, rootFolderPath, qualityProfileId, metadataProfileId?, languageProfileId?, setAsDefault? }` | `Result<InstanceProfile, ValidationError>` | si c'est le 1er profil de l'instance, `isDefault` forcé à `true` quoi qu'il arrive |
| `UpdateInstanceProfile` | `{ id, name?, rootFolderPath?, qualityProfileId?, metadataProfileId?, languageProfileId? }` | `Result<InstanceProfile, ValidationError>` | si c'est le profil par défaut, re-sync vers `ServarrInstance.configure()` après écriture |
| `SetDefaultInstanceProfile` | `{ id }` | `Result<InstanceProfile, ValidationError>` | démarque l'ancien défaut, marque le nouveau, `instance.configure()` + save |
| `DeleteInstanceProfile` | `{ id }` | `Result<void, ValidationError>` | erreur si `isDefault === true` |

## Schéma base de données

```sql
create table instance_profiles (
  id                    uuid primary key default gen_random_uuid(),
  instance_id           uuid not null references servarr_instances(id) on delete cascade,
  name                  varchar(64) not null,
  root_folder_path      text not null,
  quality_profile_id    integer not null,
  metadata_profile_id   integer,                 -- Lidarr uniquement
  language_profile_id   integer,                 -- Sonarr uniquement
  is_default            boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint uq_instance_profiles_instance_name unique (instance_id, name)
);

create unique index uq_instance_profiles_default_per_instance
  on instance_profiles (instance_id) where is_default;
```

Nouvelle migration Lucid `xxxx_create_instance_profiles_table.ts`, mêmes
conventions que `1785081135340_create_servarr_instances_table.ts`.

## Endpoints HTTP

Tous sous `/api/settings`, groupe `adminOnly`, `:kind ∈ {radarr,sonarr,lidarr}`
(le contrôleur résout l'instance via `repository.findByKind(kind)`, comme
`deleteInstance` le fait déjà). Nommés `saved-profiles` pour ne pas entrer en
collision avec `POST /instances/:kind/profiles`, qui reste le fetch du
catalogue live *arr existant.

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/instances/:kind/saved-profiles` | Liste les profils enregistrés de l'instance |
| `POST` | `/instances/:kind/saved-profiles` | Crée un profil |
| `PUT` | `/instances/:kind/saved-profiles/:id` | Édite un profil |
| `DELETE` | `/instances/:kind/saved-profiles/:id` | Supprime un profil (422 si défaut) |
| `POST` | `/instances/:kind/saved-profiles/:id/default` | Définit ce profil comme défaut |

DTO de réponse :

```ts
interface InstanceProfileDto {
  id: string
  instanceId: string
  name: string
  rootFolderPath: string
  qualityProfileId: number
  metadataProfileId: number | null
  languageProfileId: number | null
  isDefault: boolean
}
```

## Frontend

- `domain/settings/instance-profile.ts` — `InstanceProfileDto`,
  `InstanceProfileDraft`.
- `application/settings/instance-profiles.query.ts` +
  `create-instance-profile.mutation.ts` / `update-instance-profile.mutation.ts`
  / `delete-instance-profile.mutation.ts` / `set-default-instance-profile.mutation.ts`.
- `routes/profiles/index.tsx` — nouvelle route, `beforeLoad` avec
  `requireOnboarded` + `requireAdmin` (identique à `routes/settings/index.tsx`).
- `presentation/profiles/profiles-page.tsx` — une section par instance
  configurée (radarr/sonarr/lidarr), réutilisant le style `ServiceCard` de
  `settings-panels.tsx` (icône, nom, badge) ; à l'intérieur, la liste des
  profils enregistrés (nom, root folder, quality profile, badge « Default »)
  avec actions éditer / supprimer / définir par défaut, et un formulaire
  d'ajout qui réutilise `useFetchInstanceProfiles` (déjà utilisé dans
  `ServiceInstanceForm`) pour peupler les selects root folder / quality
  profile / metadata / language depuis le catalogue live de l'instance.
- `presentation/shared/app-shell.tsx` — nouvelle entrée de nav admin-only
  « Profiles » (à côté de « Settings »), route `/profiles`.
- Instance non configurée (aucun `baseUrl`/`apiKey` sauvegardé) → section
  affichée mais désactivée avec un renvoi vers `/settings` pour connecter le
  service d'abord (pas de profils sans instance).

## Hors périmètre / non traité par cette phase

- Sélection d'un profil par l'utilisateur au moment de la requête
  (`CreateRequest` reste inchangé).
- Multi-instance par kind (toujours bloqué par la contrainte `unique(kind)`
  sur `servarr_instances`, cf. ADR-0006) — un profil est donc toujours
  rattaché à l'unique instance existante de son kind.
- Réconciliation/validation périodique des profils enregistrés contre le
  catalogue live (si un id de quality profile est supprimé côté *arr, on ne
  le détecte qu'au prochain health check / requête en échec — pas de nouveau
  mécanisme ajouté ici).

## Addendum — Series type (Sonarr) et Minimum availability (Radarr)

Deux champs de profil supplémentaires, ajoutés en suivi de la Phase 3 :
`seriesType` (`standard` | `daily` | `anime`, Sonarr uniquement) et
`minimumAvailability` (`announced` | `inCinemas` | `released` | `preDB`,
Radarr uniquement). Mêmes règles que `metadataProfileId`/`languageProfileId` :
optionnels, valeur interdite si le kind ne correspond pas
(`validateProfileSelection` étendue), stockés en colonnes `nullable` sur
`servarr_instances` et `instance_profiles` (migration
`1785081143200_add_series_type_and_minimum_availability`).

Contrairement aux profils *arr (qualityProfileId, root folder…), ce ne sont
pas des id résolus depuis un catalogue live — ce sont des enums fixes propres
à l'API Radarr/Sonarr, donc pas d'appel réseau supplémentaire pour peupler
leurs selects.

`RadarrAdapter.submit()` et `SonarrAdapter.submit()` les envoient désormais à
la création (`minimumAvailability`, `seriesType`), avec un défaut
(`released`, `standard`) si le profil actif ne les précise pas — ces champs
n'étaient jusque-là jamais transmis à l'API *arr.
