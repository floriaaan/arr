# Modèle de domaine

Backend uniquement (le frontend reprend des types miroirs plus légers, sans logique
métier — cf. `frontend/src/domain/`). Rien ci-dessous ne dépend d'Adonis, Lucid, HTTP
ou Zod.

## Kernel partagé (`domain/shared`)

- **`Result<T, E>`** — `{ ok: true; value: T } | { ok: false; error: E }`. Toute
  opération métier faillible le retourne plutôt que de lever une exception (les
  exceptions restent réservées aux violations d'invariant = bug).
- **`Entity<Id>`** — égalité par identité (`id`).
- **`AggregateRoot<Id>`** — étend `Entity`, porte une liste d'événements en attente
  (`pullDomainEvents()`), consommée par l'`UnitOfWork` applicatif après persistence.
- **`ValueObject<Props>`** — égalité structurelle, immuable, validation dans le
  constructeur privé + factory `create()` qui retourne un `Result`.
- **`DomainEvent`** — `{ name: string; occurredAt: Date; payload: unknown }`.
- **Interface `Clock`** — `now(): Date`. Le domaine ne fait jamais `new Date()`.
- **Interface `IdGenerator`** — `next(): string` (UUID v7 côté infra, pour des ids
  triables par le temps).

## `identity`

### VO
- **`Email`** — validation format, normalisation en minuscules.
- **`UserRole`** — `'admin' | 'user'`.
- **`AuthenticatedUser`** — VO immuable exposé aux autres contextes :
  `{ id: string; email: Email; role: UserRole }`.

### Entité
- **`User`** — `{ id, email, role, createdAt }`. Pas de setter public sur `role` :
  le changement de rôle passe par better-auth (plugin `admin`), le domaine ne fait
  que refléter l'état lu.

### Événements
- `UserRegistered { userId, email }`

### Ports
- **`UserDirectoryPort`** — `findByEmail(email): Promise<User | null>`,
  `existsAny(): Promise<boolean>` (utilisé pour la garde "premier utilisateur =
  admin" de l'onboarding).
- **`AuthenticationPort`** — `signInWithPassword(credentials): Promise<Result<AuthenticatedUser, AuthenticationError>>`,
  `signOut(sessionToken): Promise<void>`.
- **`SessionPort`** — `resolve(sessionToken: string): Promise<AuthenticatedUser | null>`.

## `settings`

### VO
- **`ServarrKind`** — `'radarr' | 'sonarr' | 'lidarr'`.
- **`Url`** — valide `http(s)://`, rejette les schémas non http.
- **`ApiKey`** — wrapper opaque (`toString()` redacted, valeur réelle accessible via
  `.reveal()` uniquement pour l'infra) — évite qu'une clé finisse dans un log par
  erreur d'un `console.log(instance)`.
- **`RootFolderPath`**, **`QualityProfileId`**, **`MetadataProfileId`**,
  **`LanguageProfileId`** — wrappers dédiés (au lieu de `number` nu) pour qu'un
  quality profile ne puisse pas être passé par erreur là où un metadata profile est
  attendu (Lidarr) — erreur détectée à la compilation, pas à l'exécution.
- **`HealthCheckResult`** — `{ checkedAt: Date; healthy: boolean; detectedVersion?: string; error?: ConnectionError }`.
- **`ConnectionError`** — union taguée : `DnsError | ConnectionRefused | Timeout | Unauthorized | UnexpectedResponse`,
  chacune avec un message technique brut (pour log) et un message pour l'UI.
- **`OidcConfig`** — `{ issuerUrl: Url; clientId: string; clientSecret: ApiKey; claimsMapping?: Record<string, string> }`.
- **`EffectiveAuthSettings`** — read model : `{ passwordLoginEnabled: boolean; oidc: OidcConfig | null; oidcSource: 'database' | 'environment' | 'disabled' }`.

### Agrégats
- **`ServarrInstance`** — racine. Champs : `id, kind, baseUrl, apiKey,
  rootFolderPath, qualityProfileId, metadataProfileId?, languageProfileId?, enabled,
  lastHealthCheck?`.
  Méthodes (aucun setter, transitions explicites) :
  - `static draft(kind, baseUrl, apiKey): ServarrInstance` — état non activable
    avant d'avoir les profils.
  - `configure(rootFolderPath, qualityProfileId, metadataProfileId?, languageProfileId?): Result<void, ValidationError>` —
    valide que `metadataProfileId` n'est fourni que pour `kind === 'lidarr'`.
  - `enable(): Result<void, ValidationError>` — refuse si pas configuré ou si le
    dernier health check est en échec.
  - `disable(): void`
  - `recordHealthCheck(result: HealthCheckResult): void` — émet
    `InstanceHealthCheckFailed` si `!result.healthy`.
  - `rotateApiKey(newKey: ApiKey): void`

- **`AuthSettings`** — racine, singleton logique (une seule instance en base).
  Champs : `{ oidc: OidcConfig | null }`. *Ne contient pas* de flag
  "password login désactivé" : cette politique est une résolution
  infrastructure (`AuthSettingsProviderPort`), jamais un état du domaine, pour
  garantir qu'aucun chemin applicatif ne puisse verrouiller le compte admin hors
  service (cf. spec : le login password reste toujours possible sauf override
  explicite par variable d'environnement).
  Méthodes : `configureOidc(config: OidcConfig): void`, `clearOidc(): void`.

- **`OnboardingState`** — racine, singleton logique. États :
  `NotStarted → AdminCreated → ServicesConfigured → Completed`.
  Méthodes gardées : `markAdminCreated(): Result<void, InvalidTransition>`,
  `markServicesConfigured(): Result<void, InvalidTransition>`,
  `complete(): Result<void, InvalidTransition>` (garde recommandée : au moins une
  `ServarrInstance` `enabled`, cf. point 5 de la vue d'ensemble — à confirmer).
  Pas de retour en arrière possible une fois `Completed` (relire les settings passe
  par le contexte `settings`, pas par une réouverture de l'onboarding).

### Événements
- `InstanceConnected { instanceId, kind, detectedVersion }`
- `InstanceHealthCheckFailed { instanceId, kind, error }`
- `OnboardingCompleted { completedAt }`

### Ports
- `ServarrInstanceRepositoryPort` — `findAll()`, `findByKind(kind)`, `findById(id)`,
  `findActive()`, `save(instance)`, `delete(id)`.
- `ServarrConnectionTesterPort` — `test(kind, baseUrl, apiKey): Promise<Result<HealthCheckResult, ConnectionError>>`
  (implémenté par les adapters `servarr` via `system/status`).
- `ServarrProfileCatalogPort` — `listRootFolders`, `listQualityProfiles`,
  `listMetadataProfiles` (Lidarr uniquement), `listLanguageProfiles` (Sonarr) —
  chacune `(kind, baseUrl, apiKey) => Promise<Result<T[], ConnectionError>>`.
- `AuthSettingsRepositoryPort` — `get(): Promise<AuthSettings>`, `save(settings)`.
- `AuthSettingsProviderPort` — `resolveEffective(): Promise<EffectiveAuthSettings>`
  (merge DB + env, précédence env, cf. ADR dédié dans la spec d'origine).
- `OnboardingStateRepositoryPort` — `get()`, `save(state)`.

## `catalog`

### VO
- **`MediaKind`** — `'movie' | 'series' | 'album'`.
- **`ExternalId`** — `{ scheme: 'tmdb' | 'tvdb' | 'musicbrainz'; value: string }`,
  `format()` → `"tmdb:550"`, `parse(raw: string)`.
- **`PosterRef`** — wrapper opaque autour de l'URL distante brute (TMDB/Fanart) ;
  le domaine ne connaît pas la notion de "signature", ça reste un détail de
  présentation/infra (cf. `infrastructure/images`).

### Entités
- **`MediaItem`** — identité = `ExternalId`. `{ id: ExternalId, kind, title, year,
  overview, posterRef, alreadyManaged: boolean }`.
- **`MediaDetail`** — étend `MediaItem` : `{ genres, runtimeMinutes?, network?,
  status?, managedBy?: { instanceId, rootFolderPath, qualityProfileId } }`.

### Port
- `MediaLookupPort` — `search(kind, term): Promise<MediaItem[]>`,
  `detail(id: ExternalId): Promise<MediaDetail>`.

Pas de persistence : le contexte `catalog` délègue systématiquement à `*arr` via ce
port, sans cache applicatif au MVP (à revoir si la latence de `lookup` s'avère
gênante en usage réel).

## `requests`

### VO
- **`RequestStatus`** — `'pending' | 'submitted' | 'downloading' | 'importing' |
  'available' | 'failed' | 'cancelled'`.
- **`RequestProgress`** — `{ percentage: number; sizeLeftBytes: number; eta: Date | null; stepLabel: string }`.
- **`ExternalRef`** — `{ instanceId: string; remoteId: string }` (ex : id du movie
  côté Radarr) — c'est ce qui permet au reconciler de savoir quoi poller.
- **`ProvisioningError`** — union : `AlreadyExists | InstanceUnavailable |
  ValidationFailed | Unknown`.
- **`RequestFilter`** — `{ status?: RequestStatus; kind?: MediaKind; requestedBy?: string }`.

### Agrégat
- **`MediaRequest`** — racine. `{ id, requestedBy: string, kind, externalId, title,
  instanceId, externalRef?, status, progress?, failureReason?, createdAt, updatedAt }`.
  Cycle de vie, aucun setter public sur `status` :
  - `static request(input): MediaRequest` — factory, état initial `Pending`, émet
    `MediaRequested`.
  - `submit(ref: ExternalRef): Result<void, InvalidTransition>` — `Pending → Submitted`,
    émet `RequestSubmitted`.
  - `startDownloading(progress: RequestProgress): Result<void, InvalidTransition>` —
    `Submitted → Downloading`.
  - `updateProgress(progress: RequestProgress): Result<void, InvalidTransition>` —
    valide uniquement depuis `Downloading`, émet `RequestProgressed`.
  - `startImporting(): Result<void, InvalidTransition>` — `Downloading → Importing`.
  - `complete(): Result<void, InvalidTransition>` — `Importing → Available`, émet
    `RequestCompleted`.
  - `fail(reason: string): void` — depuis tout état actif (`Pending` à `Importing`)
    → `Failed`, émet `RequestFailed`.
  - `cancel(): Result<void, InvalidTransition>` — permis seulement depuis `Pending`,
    `Submitted` ou `Downloading` (pas `Importing`/`Available`, cf. point 7 de la vue
    d'ensemble — à confirmer), émet `RequestCancelled`.

### Événements
`MediaRequested`, `RequestSubmitted`, `RequestProgressed`, `RequestCompleted`,
`RequestFailed`, `RequestCancelled`.

### Ports
- `MediaRequestRepositoryPort` — `findById`, `findByFilter(filter)`, `save(request)`,
  `findActiveWithExternalRef()` (utilisé par le reconciler : toutes les requests en
  `Submitted`/`Downloading`/`Importing` qui ont un `externalRef`).
- `MediaProvisioningPort` — `submit(request: MediaRequest): Promise<Result<ExternalRef, ProvisioningError>>`.
  Pour Lidarr, l'implémentation (`LidarrAdapter`) encapsule la résolution
  "l'artiste existe-t-il déjà côté Lidarr, sinon le créer" — le port et le use case
  `CreateRequest` n'ont aucune connaissance de cette mécanique.
- `DownloadProgressPort` — `fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]>`
  où `ProgressSnapshot = { ref: ExternalRef; status: RequestStatus; progress?: RequestProgress; failureReason?: string }`.
  Conçu pour qu'une implémentation SSE (`@adonisjs/transmit`, hors MVP) puisse
  remplacer le polling sans changer la signature ni les use cases appelants.

## Use cases applicatifs (aperçu, implémentation en Phase 2)

| Contexte | Use case | Entrée | Sortie |
|---|---|---|---|
| identity | `SignInWithPassword` | `{ email, password }` | `Result<AuthenticatedUser, AuthenticationError>` |
| identity | `SignOut` | `{ sessionToken }` | `void` |
| identity | `GetCurrentUser` | `{ sessionToken }` | `AuthenticatedUser \| null` |
| settings | `CreateAdminAccount` | `{ email, password }` | `Result<void, OnboardingError>` (refuse si `existsAny()`) |
| settings | `TestInstanceConnection` | `{ kind, baseUrl, apiKey }` | `Result<HealthCheckResult, ConnectionError>` |
| settings | `FetchInstanceProfiles` | `{ kind, baseUrl, apiKey }` | `Result<ProfileCatalog, ConnectionError>` |
| settings | `SaveInstance` | `InstanceDraft` complet | `Result<ServarrInstance, OnboardingError>` |
| settings | `TestOidcDiscovery` | `{ issuerUrl, clientId, clientSecret }` | `Result<OidcDiscoveryInfo, ConnectionError>` |
| settings | `SaveAuthSettings` | `OidcConfig \| null` | `Result<void, ValidationError>` |
| settings | `GetOnboardingState` / `CompleteOnboarding` | — | `OnboardingState` / `Result<void, InvalidTransition>` |
| catalog | `SearchMedia` | `{ kind, term }` | `MediaItem[]` |
| catalog | `GetMediaDetail` | `{ externalId }` | `MediaDetail` |
| requests | `CreateRequest` | `{ kind, externalId, instanceId? }` | `Result<MediaRequest, RequestError>` |
| requests | `ListRequests` | `RequestFilter` | `MediaRequest[]` |
| requests | `CancelRequest` | `{ id }` | `Result<void, RequestError>` |
| requests | `ReconcileProgress` | — (appelé par la commande Ace) | `void`, effets de bord = `save()` + events |
