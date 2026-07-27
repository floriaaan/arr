# Contrat `ArrConnector`

Un seul port, `frontend/src/domain/interfaces/arr-connector.ts`, implémenté par
`HttpArrConnector` (infra réelle) et `FakeArrConnector` (offline). Miroir des
endpoints documentés en [phase-0/04-endpoints-http.md](../phase-0/04-endpoints-http.md) —
toute méthode ci-dessous correspond à un ou plusieurs appels backend précis, listés en
commentaire. `tests/contract/arr-connector.contract.spec.ts` exécute la même suite
contre les deux implémentations : un comportement qui ne peut pas être reproduit
fidèlement en Fake (ex: signature de `posterUrl`) est normalisé au niveau du contrat
(cf. décision 2 de l'overview), pas laissé comme une divergence tolérée.

## Types miroirs (`domain/`)

Pas de logique métier ici — validation/transitions restent côté backend. Juste assez
de structure pour que TypeScript attrape les erreurs de câblage.

```ts
// domain/shared/result.ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

// domain/identity/user.ts
interface AuthenticatedUser { id: string; email: string; role: 'admin' | 'user' }

// domain/identity/session.ts
type Session = { user: AuthenticatedUser } | { user: null }

// domain/settings/onboarding-state.ts
type OnboardingStatus = 'not_started' | 'admin_created' | 'services_configured' | 'completed'

// domain/settings/servarr-instance.ts
type ServarrKind = 'radarr' | 'sonarr' | 'lidarr'
interface ServarrInstanceDto {
  id: string; kind: ServarrKind; baseUrl: string; hasApiKey: boolean
  rootFolderPath: string | null; qualityProfileId: number | null
  metadataProfileId: number | null; languageProfileId: number | null
  enabled: boolean
}
interface InstanceDraft {
  baseUrl: string; apiKey: string; rootFolderPath: string
  qualityProfileId: number; metadataProfileId?: number; languageProfileId?: number
  enabled: boolean
}

// domain/settings/effective-auth-settings.ts
interface EffectiveAuthSettings {
  passwordLoginEnabled: boolean
  oidcConfigured: boolean
  source: 'database' | 'environment'
}

// domain/catalog/media-kind.ts
type MediaKind = 'movie' | 'series' | 'album'

// domain/catalog/external-id.ts
type ExternalIdScheme = 'tmdb' | 'tvdb' | 'musicbrainz'
interface ExternalId { scheme: ExternalIdScheme; value: string }

// domain/catalog/media-item.ts
interface MediaItem {
  externalId: ExternalId; kind: MediaKind; title: string; year: number | null
  overview: string; posterUrl: string | null; alreadyManaged: boolean
}

// domain/catalog/media-detail.ts
interface MediaDetail extends MediaItem {
  genres: string[]; runtimeMinutes?: number; network?: string; status?: string
  managedBy?: { instanceId: string; rootFolderPath: string; qualityProfileId: number }
}

// domain/requests/media-request.ts
type RequestStatus = 'pending' | 'submitted' | 'downloading' | 'importing'
  | 'available' | 'failed' | 'cancelled'
interface RequestProgress {
  percentage: number; sizeLeftBytes: number; eta: string | null; stepLabel: string
}
interface MediaRequest {
  id: string; requestedBy: { id: string; email: string | null }
  kind: MediaKind; externalId: ExternalId; title: string; status: RequestStatus
  progress: RequestProgress | null; failureReason: string | null
  createdAt: string; updatedAt: string
}
interface RequestFilter { status?: RequestStatus; kind?: MediaKind; requestedByMe?: boolean }
```

`posterUrl` (pas `posterRef`) — cf. décision 2 de l'overview : `HttpArrConnector`
transforme le jeton signé backend en `/api/images?ref=...`, `FakeArrConnector` renvoie
directement un chemin de fixture. Aucune des deux ne renvoie le jeton brut.

## `ArrConnector`

```ts
interface ArrConnector {
  // identity — GET /api/session, ANY /api/auth/*
  getSession(): Promise<Session>
  signInWithPassword(email: string, password: string): Promise<Result<AuthenticatedUser, ApiError>>
  startOidcSignIn(callbackUrl: string): Promise<Result<{ url: string }, ApiError>>
  signOut(): Promise<void>

  // settings — onboarding, /api/onboarding/*
  getOnboardingState(): Promise<{ status: OnboardingStatus }>
  createAdminAccount(email: string, password: string): Promise<Result<{ userId: string }, ApiError>>
  testInstanceConnection(
    kind: ServarrKind, baseUrl: string, apiKey: string,
  ): Promise<{ ok: true; detectedVersion: string } | { ok: false; error: ApiError }>
  fetchInstanceProfiles(kind: ServarrKind, baseUrl: string, apiKey: string): Promise<Result<{
    rootFolders: { path: string }[]
    qualityProfiles: { id: number; name: string }[]
    metadataProfiles?: { id: number; name: string }[]
    languageProfiles?: { id: number; name: string }[]
  }, ApiError>>
  saveOnboardingInstance(kind: ServarrKind, draft: InstanceDraft): Promise<Result<ServarrInstanceDto, ApiError>>
  testOidcDiscovery(issuerUrl: string, clientId: string, clientSecret: string): Promise<
    { ok: true; discovery: { authorizationEndpoint: string; tokenEndpoint: string; userinfoEndpoint: string } }
    | { ok: false; error: ApiError }
  >
  saveOnboardingSso(config: { issuerUrl: string; clientId: string; clientSecret: string } | null): Promise<Result<{ oidcEnabled: boolean }, ApiError>>
  completeOnboarding(): Promise<Result<{ status: 'completed' }, ApiError>>

  // settings — admin panel, /api/settings/*
  listInstances(): Promise<ServarrInstanceDto[]>
  saveInstance(kind: ServarrKind, draft: InstanceDraft): Promise<Result<ServarrInstanceDto, ApiError>>
  deleteInstance(kind: ServarrKind): Promise<void>
  testSavedInstanceConnection(kind: ServarrKind): Promise<{ ok: true; detectedVersion: string } | { ok: false; error: ApiError }>
  getSso(): Promise<{ issuerUrl: string; clientId: string; claimsMapping: Record<string, string> | null } | null>
  updateSso(config: { issuerUrl: string; clientId: string; clientSecret: string; claimsMapping?: Record<string, string> } | null): Promise<Result<{ oidcEnabled: boolean }, ApiError>>
  getEffectiveAuthSettings(): Promise<EffectiveAuthSettings>

  // catalog — /api/catalog/*
  searchMedia(kind: MediaKind, term: string): Promise<MediaItem[]>
  getMediaDetail(scheme: ExternalIdScheme, value: string, kind: MediaKind): Promise<Result<MediaDetail, ApiError>>

  // requests — /api/requests/*
  listRequests(filter?: RequestFilter): Promise<MediaRequest[]>
  createRequest(kind: MediaKind, externalId: ExternalId, instanceId?: string): Promise<Result<MediaRequest, ApiError>>
  getRequest(id: string): Promise<MediaRequest | null>
  cancelRequest(id: string): Promise<Result<MediaRequest, ApiError>>
}
```

Notes de câblage :

- `testInstanceConnection`/`testOidcDiscovery`/`testSavedInstanceConnection` gardent la
  forme `{ok:false, error}` du backend (200 volontaire, cf. endpoints doc) plutôt que
  `Result` — un échec de test de connexion n'est pas une erreur de requête, autant
  garder la même distinction côté frontend pour ne pas la perdre en traduisant.
- `getRequest` renvoie `null` (pas `Result`) : le seul cas d'échec documenté est 404,
  qui *est* l'absence de valeur, pas une erreur à traiter séparément.
- `ApiError = { type: string; message: string; details?: unknown; status: number }`,
  construit par `HttpArrConnector` depuis l'enveloppe `{error:{type,message,details?}}` ;
  `FakeArrConnector` construit les mêmes formes à la main pour ses scénarios d'erreur
  simulés (ex: refuser une deuxième création d'admin avec `admin_already_exists`).
- `instanceId` optionnel sur `createRequest` — cf. ADR-0006, une seule instance active
  par `kind` au MVP donc quasi toujours omis ; gardé pour ne pas casser le contrat le
  jour où le multi-instance est levé.
