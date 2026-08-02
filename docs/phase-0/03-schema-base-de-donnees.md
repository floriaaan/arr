# Schéma de base de données

PostgreSQL 16, une seule base, deux propriétaires de tables (cf.
[ADR-0005](../adr/0005-better-auth-tables-identite.md)) :

- **better-auth** possède `user`, `session`, `account`, `verification` — générées
  par `npx @better-auth/cli@latest generate` (Phase 3/4), jamais éditées à la
  main. Le CLI s'invoque bien par `npx` et n'est **pas** une devDependency :
  la version publiée épingle un `better-auth` obsolète et vulnérable
  ([ADR-0009](../adr/0009-suppression-better-auth-cli.md)).
- **Lucid** possède tout le reste, via des migrations classiques.

## Tables better-auth (générées, forme indicative)

Le schéma exact dépend de la version du CLI au moment de la génération (Phase 3).
Colonnes attendues avec le plugin `admin` + `genericOAuth` activés :

```
user
  id            text primary key
  email         text unique not null
  emailVerified boolean not null default false
  name          text
  image         text
  role          text not null default 'user'      -- plugin admin
  banned        boolean not null default false     -- plugin admin
  banExpires    timestamptz
  createdAt     timestamptz not null
  updatedAt     timestamptz not null

session
  id            text primary key
  userId        text not null references "user"(id) on delete cascade
  token         text unique not null
  expiresAt     timestamptz not null
  ipAddress     text
  userAgent     text
  createdAt     timestamptz not null
  updatedAt     timestamptz not null

account
  id                    text primary key
  userId                text not null references "user"(id) on delete cascade
  providerId            text not null              -- 'credential' | 'pocketid' | ...
  accountId             text not null
  accessToken           text
  refreshToken          text
  idToken               text
  accessTokenExpiresAt  timestamptz
  refreshTokenExpiresAt timestamptz
  password              text                       -- hash, providerId = 'credential'
  createdAt             timestamptz not null
  updatedAt             timestamptz not null

verification
  id            text primary key
  identifier    text not null
  value         text not null
  expiresAt     timestamptz not null
  createdAt     timestamptz
```

Le premier utilisateur créé via l'onboarding reçoit `role = 'admin'` par un appel à
l'API `admin` de better-auth (jamais un `UPDATE "user" SET role = ...` direct).

## Tables applicatives (Lucid)

```sql
create table servarr_instances (
  id                    uuid primary key default gen_random_uuid(),
  kind                  varchar(16) not null check (kind in ('radarr', 'sonarr', 'lidarr')),
  base_url              text not null,
  api_key_encrypted     text not null,
  root_folder_path      text,
  quality_profile_id    integer,
  metadata_profile_id   integer,                 -- Lidarr uniquement
  language_profile_id   integer,                 -- Sonarr uniquement
  enabled               boolean not null default false,
  last_health_check_at  timestamptz,
  last_health_check_ok  boolean,
  last_health_check_error text,
  detected_version      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint uq_servarr_instances_kind unique (kind)
  -- contrainte à lever si le multi-instance par kind est décidé, cf. ADR-0006
);

create table auth_settings (
  id                       uuid primary key default gen_random_uuid(),
  oidc_enabled             boolean not null default false,
  oidc_issuer_url          text,
  oidc_client_id           text,
  oidc_client_secret_encrypted text,
  oidc_claims_mapping      jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
-- singleton applicatif : un seul row jamais créé par le use case SaveAuthSettings,
-- pas de contrainte SQL dédiée (une table à une seule ligne ne justifie pas un
-- verrou en base, la garde vit dans le repository).

create table onboarding_state (
  id                       uuid primary key default gen_random_uuid(),
  state                    varchar(24) not null default 'not_started'
                             check (state in ('not_started', 'admin_created', 'services_configured', 'completed')),
  admin_created_at         timestamptz,
  services_configured_at   timestamptz,
  completed_at             timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
-- singleton applicatif, même remarque que ci-dessus.

create table media_requests (
  id                       uuid primary key default gen_random_uuid(),
  requested_by_user_id     text not null references "user"(id) on delete cascade,
  kind                     varchar(16) not null check (kind in ('movie', 'series', 'album')),
  external_id_scheme       varchar(16) not null check (external_id_scheme in ('tmdb', 'tvdb', 'musicbrainz')),
  external_id_value        varchar(64) not null,
  title                    text not null,             -- dénormalisé pour affichage sans round-trip *arr
  servarr_instance_id      uuid not null references servarr_instances(id),
  external_ref_remote_id   varchar(64),                -- id côté *arr, une fois soumis
  status                   varchar(16) not null default 'pending'
                             check (status in ('pending', 'submitted', 'downloading', 'importing', 'available', 'failed', 'cancelled')),
  progress_percentage      numeric(5,2),
  progress_size_left_bytes bigint,
  progress_eta             timestamptz,
  progress_step_label      text,
  failure_reason           text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint uq_media_requests_kind_external_id unique (kind, external_id_scheme, external_id_value)
  -- une seule request active par média : évite les doublons si quelqu'un reclique
);

create index ix_media_requests_status_active
  on media_requests (status)
  where status in ('submitted', 'downloading', 'importing');
  -- requête du reconciler : "quelles requests pollent /queue ?"

create index ix_media_requests_requested_by on media_requests (requested_by_user_id);
```

Notes :

- Pas de table `domain_events` / outbox au MVP — cf.
  [ADR-0007](../adr/0007-pas-de-event-store.md).
- Pas de table de cache d'images — le cache est sur disque (nom de fichier =
  hash SHA-256 de la ref signée), cf.
  [ADR-0008](../adr/0008-signature-proxy-images.md).
- `api_key_encrypted` et `oidc_client_secret_encrypted` : chiffrés via
  `Encryption` d'Adonis (clé = `APP_KEY`), jamais en clair en base ni dans les
  réponses HTTP (les endpoints de lecture renvoient un booléen `hasApiKey` /
  quelques caractères masqués, jamais la valeur).

## Ordre des migrations

1. Migration générée par le CLI better-auth, copiée/adaptée en première migration
   Lucid (fichier daté le plus ancien) — garantit que `user` existe avant que
   `media_requests` y pointe une FK, tout en gardant `node ace migration:run` comme
   point d'entrée unique pour `task db:migrate` (cf.
   [ADR-0005](../adr/0005-better-auth-tables-identite.md)).
2. `servarr_instances`, `auth_settings`, `onboarding_state` (indépendantes entre
   elles, ordre sans importance).
3. `media_requests` (dépend de `user` et `servarr_instances`).
