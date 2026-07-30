import type { Result } from '../shared/result'
import type { ApiError } from '../shared/api-error'
import type { AuthenticatedUser, UserRole } from '../identity/user'
import type { UserAccount } from '../identity/user-account'
import type { Session } from '../identity/session'
import type { OnboardingStatus } from '../settings/onboarding-state'
import type { ServarrKind, ServarrInstanceDto } from '../settings/servarr-instance'
import type { InstanceDraft } from '../settings/instance-draft'
import type { InstanceProfileDto, InstanceProfileDraft } from '../settings/instance-profile'
import type { MediaServerDraft, MediaServerDto, MediaServerKind } from '../settings/media-server'
import type { QualityProfileRecord } from '../settings/quality-profile-record'
import type { DownloadClientRecord } from '../settings/download-client-record'
import type { IndexerRecord } from '../settings/indexer-record'
import type { EffectiveAuthSettings } from '../settings/effective-auth-settings'
import type { MediaKind } from '../catalog/media-kind'
import type { ExternalId, ExternalIdScheme } from '../catalog/external-id'
import type { MediaItem } from '../catalog/media-item'
import type { MediaDetail } from '../catalog/media-detail'
import type { MediaRequest } from '../requests/media-request'
import type { RequestFilter } from '../requests/request-filter'
import type { LibraryItem } from '../library/library-item'
import type { CalendarEntry } from '../calendar/calendar-entry'

export interface OidcConfigInput {
  issuerUrl: string
  clientId: string
  clientSecret: string
  claimsMapping?: Record<string, string>
}

export interface OidcDiscovery {
  authorizationEndpoint: string
  tokenEndpoint: string
  userinfoEndpoint: string
}

export interface InstanceProfiles {
  rootFolders: { path: string }[]
  qualityProfiles: { id: number; name: string }[]
  metadataProfiles?: { id: number; name: string }[]
  languageProfiles?: { id: number; name: string }[]
}

export type ConnectionTestResult =
  { ok: true; detectedVersion: string } | { ok: false; error: ApiError }

export type OidcTestResult = { ok: true; discovery: OidcDiscovery } | { ok: false; error: ApiError }

/**
 * The one contract every screen depends on — never `infrastructure/http/*` or
 * `infrastructure/fake/*` directly (cf. docs/phase-5/01-contrat-arr-connector.md).
 * Every method mirrors one or more backend endpoints from
 * docs/phase-0/04-endpoints-http.md.
 */
export interface ArrConnector {
  // identity
  getSession: () => Promise<Session>
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<Result<AuthenticatedUser, ApiError>>
  startOidcSignIn: (callbackUrl: string) => Promise<Result<{ url: string }, ApiError>>
  signOut: () => Promise<void>

  // identity — admin user management
  listUsers: () => Promise<UserAccount[]>
  setUserRole: (
    userId: string,
    role: UserRole,
  ) => Promise<Result<{ user: UserAccount }, ApiError>>

  // settings — onboarding
  getOnboardingState: () => Promise<{ status: OnboardingStatus }>
  createAdminAccount: (
    email: string,
    password: string,
  ) => Promise<Result<{ userId: string }, ApiError>>
  testInstanceConnection: (
    kind: ServarrKind,
    baseUrl: string,
    apiKey: string,
  ) => Promise<ConnectionTestResult>
  fetchInstanceProfiles: (
    kind: ServarrKind,
    baseUrl: string,
    apiKey: string,
  ) => Promise<Result<InstanceProfiles, ApiError>>
  saveOnboardingInstance: (
    kind: ServarrKind,
    draft: InstanceDraft,
  ) => Promise<Result<ServarrInstanceDto, ApiError>>
  saveOnboardingMediaServer: (
    kind: MediaServerKind,
    draft: MediaServerDraft,
  ) => Promise<Result<MediaServerDto, ApiError>>
  testOidcDiscovery: (
    issuerUrl: string,
    clientId: string,
    clientSecret: string,
  ) => Promise<OidcTestResult>
  saveOnboardingSso: (
    config: OidcConfigInput | null,
  ) => Promise<Result<{ oidcEnabled: boolean }, ApiError>>
  completeOnboarding: () => Promise<Result<{ status: 'completed' }, ApiError>>

  // settings — admin panel
  listInstances: () => Promise<ServarrInstanceDto[]>
  saveInstance: (
    kind: ServarrKind,
    draft: InstanceDraft,
  ) => Promise<Result<ServarrInstanceDto, ApiError>>
  deleteInstance: (kind: ServarrKind) => Promise<void>
  testSavedInstanceConnection: (
    kind: ServarrKind,
    baseUrl: string,
    apiKey: string,
  ) => Promise<ConnectionTestResult>
  fetchSettingsInstanceProfiles: (
    kind: ServarrKind,
    baseUrl: string,
    apiKey: string,
  ) => Promise<Result<InstanceProfiles, ApiError>>
  // settings — admin panel — saved instance profiles (cf. docs/phase-3-instance-profiles)
  /** Live *arr catalog for an already-saved instance, using its stored credentials. */
  fetchStoredInstanceProfiles: (kind: ServarrKind) => Promise<Result<InstanceProfiles, ApiError>>
  listInstanceProfiles: (kind: ServarrKind) => Promise<InstanceProfileDto[]>
  createInstanceProfile: (
    kind: ServarrKind,
    draft: InstanceProfileDraft,
  ) => Promise<Result<InstanceProfileDto, ApiError>>
  updateInstanceProfile: (
    kind: ServarrKind,
    id: string,
    draft: InstanceProfileDraft,
  ) => Promise<Result<InstanceProfileDto, ApiError>>
  deleteInstanceProfile: (kind: ServarrKind, id: string) => Promise<Result<void, ApiError>>
  setDefaultInstanceProfile: (
    kind: ServarrKind,
    id: string,
  ) => Promise<Result<InstanceProfileDto, ApiError>>

  // settings — admin panel — live *arr Quality Profiles, read-only plumbing used
  // to render/hydrate the profile form (create/update/delete happen through
  // createInstanceProfile/updateInstanceProfile/deleteInstanceProfile above —
  // a profile and a Quality Profile are the same thing, cf. docs/phase-3-instance-profiles/01)
  listQualityProfiles: (kind: ServarrKind) => Promise<Result<QualityProfileRecord[], ApiError>>
  getQualityProfileSchema: (kind: ServarrKind) => Promise<Result<QualityProfileRecord, ApiError>>

  // settings — admin panel — download clients (cf. docs/phase-4-download-clients-indexers)
  // Full CRUD passthrough to the *arr — there is no local table to keep in sync.
  listDownloadClients: (kind: ServarrKind) => Promise<Result<DownloadClientRecord[], ApiError>>
  getDownloadClientSchema: (kind: ServarrKind) => Promise<Result<DownloadClientRecord[], ApiError>>
  createDownloadClient: (
    kind: ServarrKind,
    payload: DownloadClientRecord,
  ) => Promise<Result<DownloadClientRecord, ApiError>>
  updateDownloadClient: (
    kind: ServarrKind,
    id: number,
    payload: DownloadClientRecord,
  ) => Promise<Result<DownloadClientRecord, ApiError>>
  deleteDownloadClient: (kind: ServarrKind, id: number) => Promise<Result<void, ApiError>>
  testDownloadClient: (
    kind: ServarrKind,
    payload: DownloadClientRecord,
  ) => Promise<Result<void, ApiError>>

  // settings — admin panel — indexers (cf. docs/phase-4-download-clients-indexers)
  listIndexers: (kind: ServarrKind) => Promise<Result<IndexerRecord[], ApiError>>
  getIndexerSchema: (kind: ServarrKind) => Promise<Result<IndexerRecord[], ApiError>>
  createIndexer: (
    kind: ServarrKind,
    payload: IndexerRecord,
  ) => Promise<Result<IndexerRecord, ApiError>>
  updateIndexer: (
    kind: ServarrKind,
    id: number,
    payload: IndexerRecord,
  ) => Promise<Result<IndexerRecord, ApiError>>
  deleteIndexer: (kind: ServarrKind, id: number) => Promise<Result<void, ApiError>>
  testIndexer: (kind: ServarrKind, payload: IndexerRecord) => Promise<Result<void, ApiError>>

  // settings — media servers (cf. docs/phase-5-quality-of-life)
  // Reading is open to every signed-in user (the media detail drawer links to
  // them); only the writes are admin-gated, backend-side.
  listMediaServers: () => Promise<MediaServerDto[]>
  saveMediaServer: (
    kind: MediaServerKind,
    draft: MediaServerDraft,
  ) => Promise<Result<MediaServerDto, ApiError>>
  deleteMediaServer: (kind: MediaServerKind) => Promise<void>

  getSso: () => Promise<{
    issuerUrl: string
    clientId: string
    claimsMapping: Record<string, string> | null
  } | null>
  updateSso: (config: OidcConfigInput | null) => Promise<Result<{ oidcEnabled: boolean }, ApiError>>
  getEffectiveAuthSettings: () => Promise<EffectiveAuthSettings>

  // catalog
  searchMedia: (kind: MediaKind, term: string) => Promise<MediaItem[]>
  getMediaDetail: (
    scheme: ExternalIdScheme,
    value: string,
    kind: MediaKind,
  ) => Promise<Result<MediaDetail, ApiError>>

  // requests
  listRequests: (filter?: RequestFilter) => Promise<MediaRequest[]>
  createRequest: (
    kind: MediaKind,
    externalId: ExternalId,
    instanceId?: string,
  ) => Promise<Result<MediaRequest, ApiError>>
  getRequest: (id: string) => Promise<MediaRequest | null>
  cancelRequest: (id: string) => Promise<Result<MediaRequest, ApiError>>

  // library
  listLibrary: (kind?: MediaKind) => Promise<LibraryItem[]>
  removeLibraryItem: (externalId: ExternalId, deleteFiles: boolean) => Promise<Result<void, ApiError>>

  // calendar
  getCalendar: (startDate: string, endDate: string) => Promise<CalendarEntry[]>
}
