import type { Result } from '../shared/result'
import type { ApiError } from '../shared/api-error'
import type { AuthenticatedUser } from '../identity/user'
import type { Session } from '../identity/session'
import type { OnboardingStatus } from '../settings/onboarding-state'
import type { ServarrKind, ServarrInstanceDto } from '../settings/servarr-instance'
import type { InstanceDraft } from '../settings/instance-draft'
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
  testSavedInstanceConnection: (kind: ServarrKind) => Promise<ConnectionTestResult>
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

  // calendar
  getCalendar: (startDate: string, endDate: string) => Promise<CalendarEntry[]>
}
