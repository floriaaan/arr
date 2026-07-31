# Endpoints HTTP

Toutes les réponses d'erreur suivent une forme commune :
`{ error: { type: string; message: string; details?: unknown } }` avec le code
HTTP approprié (`400` validation, `401` non authentifié, `403` non autorisé, `404`,
`409` conflit d'état, `502` instance `*arr` inaccessible).

## Auth (`/api/auth/*`)

- `ANY /api/auth/*` → géré entièrement par le handler `fetch` de better-auth
  (email/password sign-up & sign-in, callback OIDC `genericOAuth`, sign-out). Les
  sous-routes exactes sont définies par better-auth, pas par nous — à documenter
  précisément une fois montées en Phase 4.
- `GET /api/session` — wrapper applicatif : résout la session better-auth courante
  et la mappe en `AuthenticatedUser`.
  - 200 → `{ user: { id, email, role } } | { user: null }`

## Onboarding (`/api/onboarding/*`) — accessible uniquement si `OnboardingState !== Completed`

- `GET /api/onboarding/state` — **public, jamais gardé** par `onboardingGuard`
  (contrairement au reste du groupe) : la garde de routing racine (cf.
  décision 5) l'appelle sur chaque requête pour savoir s'il faut rediriger
  vers `/setup`, y compris une fois l'onboarding terminé.
  → `{ state: 'not_started' | 'admin_created' | 'services_configured' | 'completed' }`

- `POST /api/onboarding/admin`
  - body : `{ email: string; password: string }`
  - 201 → `{ userId: string }`
  - 409 → `{ error: { type: 'admin_already_exists' } }`

- `POST /api/onboarding/instances/test`
  - body : `{ kind: 'radarr' | 'sonarr' | 'lidarr'; baseUrl: string; apiKey: string }`
  - 200 → `{ ok: true; detectedVersion: string }`
  - 200 → `{ ok: false; error: { type: 'dns' | 'connection_refused' | 'timeout' | 'unauthorized' | 'unexpected_response'; message: string } }`
    (200 volontaire : un test de connexion raté n'est pas une erreur de requête)

- `POST /api/onboarding/instances/profiles`
  - body : `{ kind; baseUrl; apiKey }` (POST plutôt que GET pour ne jamais faire
    transiter `apiKey` en query string / logs d'accès)
  - 200 → `{ rootFolders: { path: string }[]; qualityProfiles: { id: number; name: string }[]; metadataProfiles?: { id: number; name: string }[]; languageProfiles?: { id: number; name: string }[] }`

- `PUT /api/onboarding/instances/:kind`
  - body : `{ baseUrl; apiKey; rootFolderPath; qualityProfileId; metadataProfileId?; languageProfileId?; enabled: boolean }`
  - 200 → `{ instance: ServarrInstanceDto }` (`apiKey` jamais renvoyé en clair,
    seulement `hasApiKey: true`)

- `PUT /api/onboarding/media-servers/:kind` (`:kind ∈ {plex, jellyfin, emby}`)
  - body : `{ baseUrl: string; enabled: boolean }`
  - 200 → `{ mediaServer: MediaServerDto }`
  - Contrairement à `PUT /api/onboarding/instances/:kind`, ne fait **pas**
    avancer `OnboardingState` : un serveur média est un simple lien de confort
    (cf. [phase 5](../phase-5-quality-of-life/00-overview-et-decisions.md)).

- `POST /api/onboarding/discovery`
  - body : `{ extraHost?: string; scanSubnet?: boolean }`
  - 200 → `{ instances: DiscoveredInstanceDto[] }`
  `DiscoveredInstanceDto = { kind: 'radarr'|'sonarr'|'lidarr'|'plex'|'jellyfin'|'emby'; baseUrl: string; detectedVersion: string | null; serverName: string | null; confidence: 'confirmed' | 'port' }`
  Sonde le réseau à la recherche d'instances (cf.
  [phase 5 / addendum](../phase-5-quality-of-life/01-discovery-et-palette-unifiee.md)) —
  ne renvoie que des URL, jamais de clé d'API, et n'écrit rien.

- `POST /api/onboarding/sso/test`
  - body : `{ issuerUrl: string; clientId: string; clientSecret: string }`
  - 200 → `{ ok: true; discovery: { authorizationEndpoint, tokenEndpoint, userinfoEndpoint } } | { ok: false; error: {...} }`

- `PUT /api/onboarding/sso`
  - body : `{ issuerUrl; clientId; clientSecret; claimsMapping?: Record<string, string> } | null` (`null` = désactiver)
  - 200 → `{ oidcEnabled: boolean }`

- `POST /api/onboarding/complete`
  - 200 → `{ state: 'completed' }`
  - 409 → `{ error: { type: 'no_active_instance' } }` (si la garde du point 5 est retenue)

## Settings (`/api/settings/*`) — admin uniquement, accessible après onboarding

Mêmes formes que les endpoints d'onboarding équivalents, sous un préfixe différent
et avec un contrôle `admin_only_middleware` :

- `GET /api/settings/instances` → `{ instances: ServarrInstanceDto[] }`
- `PUT /api/settings/instances/:kind`, `DELETE /api/settings/instances/:kind`
- `POST /api/settings/instances/:kind/test-connection`
- `POST /api/settings/discovery` → `{ instances: DiscoveredInstanceDto[] }` (même
  forme que `/api/onboarding/discovery`)
- `PUT /api/settings/media-servers/:kind` → `{ mediaServer: MediaServerDto }`,
  `DELETE /api/settings/media-servers/:kind` → 204
- `GET /api/settings/sso`, `PUT /api/settings/sso`, `POST /api/settings/sso/test`

- `GET /api/settings/auth` — **public**, sans `admin_only_middleware` : la page de
  connexion en a besoin avant même qu'une session existe, pour savoir quoi afficher
  (formulaire mot de passe, bouton SSO, ou les deux). Aucune donnée sensible dans la
  réponse (booléens + enum).
  → `{ passwordLoginEnabled: boolean; oidcConfigured: boolean; source: 'database' | 'environment' }`
  (lecture seule côté UI quand `source === 'environment'`)

## Media servers (`/api/media-servers`) — authentifié (pas admin)

- `GET /api/media-servers` → `{ mediaServers: MediaServerDto[] }`
  `MediaServerDto = { id: string; kind: 'plex' | 'jellyfin' | 'emby'; baseUrl: string; enabled: boolean }`
  Hors `/api/settings` et sans `admin_only_middleware`, volontairement : le
  détail d'un item affiche des liens "ouvrir dans Plex/Jellyfin/Emby" pour
  tout utilisateur connecté, et le DTO ne porte aucun secret (aucune clé
  d'API n'est stockée pour un serveur média). Les écritures restent admin,
  cf. section Settings ci-dessus.

## Catalog (`/api/catalog/*`) — authentifié

- `GET /api/catalog/search?kind=movie|series|album&term=...`
  → `{ results: MediaItemDto[] }`
  `MediaItemDto = { externalId: string; kind; title; year: number | null; overview: string; posterRef: string | null; alreadyManaged: boolean }`
  (`posterRef` = chemin signé prêt à passer à `/api/images`, jamais l'URL distante)

- `GET /api/catalog/detail?scheme=tmdb&value=550&kind=movie`
  → `{ detail: MediaDetailDto }` (étend `MediaItemDto` avec `genres`, `runtimeMinutes`, `network`, `status`, `managedBy`)

## Requests (`/api/requests/*`) — authentifié

- `GET /api/requests?status=&kind=&requestedBy=me`
  → `{ requests: MediaRequestDto[] }`

- `POST /api/requests`
  - body : `{ kind; externalId: { scheme; value }; instanceId?: string }`
    (`instanceId` optionnel si une seule instance active existe pour ce `kind`,
    requis sinon — cf. [ADR-0006](../adr/0006-une-instance-par-service.md))
  - 201 → `{ request: MediaRequestDto }`
  - 409 → `{ error: { type: 'already_requested' | 'already_managed' } }`
  - 502 → `{ error: { type: 'provisioning_failed'; message } }`

- `GET /api/requests/:id` → `{ request: MediaRequestDto }`
  - 403 → `{ error: { type: 'forbidden' } }` si la requête appartient à un
    autre utilisateur (les admins voient tout)

- `POST /api/requests/:id/cancel`
  - 200 → `{ request: MediaRequestDto }` — l'annulation est aussi propagée à
    l'instance *arr (retrait de la file + démonitorage) ; si l'instance est
    injoignable, l'annulation locale est conservée quand même et l'échec est
    seulement loggé (cf.
    [phase 6](../phase-6-fiabilite-requests/00-overview-et-decisions.md))
  - 403 → `{ error: { type: 'forbidden' } }` (idem `GET`)
  - 409 → `{ error: { type: 'not_cancellable'; currentStatus } }`

`GET /api/requests` reste volontairement non filtré par utilisateur : sur une
instance partagée, voir ce que les autres ont demandé est utile. Seules les
**écritures** sont restreintes au propriétaire (ou à un admin).

`MediaRequestDto = { id, requestedBy: { id, email }, kind, externalId, title, status, progress: RequestProgressDto | null, failureReason: string | null, createdAt, updatedAt }`

## Library (`/api/library/*`) — authentifié

- `GET /api/library?kind=movie|series|album`
  → `{ items: LibraryItemDto[] }` — sans `kind`, agrège les 3 services (une
    instance en panne est simplement omise, pas d'erreur).
  `LibraryItemDto = { externalId; kind; title; year: number | null; posterRef: string | null; monitored: boolean; hasFile: boolean; sizeOnDiskBytes: number; status: string; instanceId: string }`

## Calendar (`/api/calendar/*`) — authentifié

- `GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD`
  → `{ entries: CalendarEntryDto[] }` — agrège toujours les 3 services, erreurs
    par instance isolées (sous-ensemble partiel renvoyé plutôt qu'un échec
    global).
  `CalendarEntryDto = { id: string; kind: 'movie' | 'episode' | 'album'; title; subtitle: string | null; releaseDate: string; posterRef: string | null; monitored: boolean; hasFile: boolean; instanceId: string; externalId: ExternalIdDto | null }`
  (`externalId` powers "click to open detail" in the UI; `null` only for the rare Sonarr episode whose parent series wasn't embedded)

## Images (`/api/images`)

- `GET /api/images?ref=<signed>`
  - 200 → flux binaire, `Content-Type: image/*`, `Cache-Control: public, max-age=604800`, `ETag`
  - 403 → ref invalide/expirée ou domaine hors allowlist
  - 404 → ressource distante introuvable
