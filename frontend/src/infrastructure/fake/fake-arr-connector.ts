import { movieFixtures } from './fixtures/movies'
import { seriesFixtures } from './fixtures/series'
import { albumFixtures } from './fixtures/albums'
import { advanceRequest } from './progress-simulator'
import type {
  ArrConnector,
  ConnectionTestResult,
  OidcTestResult,
  OidcConfigInput,
} from '#domain/interfaces/arr-connector'
import type { Result } from '#domain/shared/result'
import type { ApiError } from '#domain/shared/api-error'
import type { AuthenticatedUser } from '#domain/identity/user'
import type { Session } from '#domain/identity/session'
import type { OnboardingStatus } from '#domain/settings/onboarding-state'
import type { ServarrKind, ServarrInstanceDto } from '#domain/settings/servarr-instance'
import type { InstanceDraft } from '#domain/settings/instance-draft'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId, ExternalIdScheme } from '#domain/catalog/external-id'
import type { MediaItem } from '#domain/catalog/media-item'
import type { MediaDetail } from '#domain/catalog/media-detail'
import type { MediaRequest } from '#domain/requests/media-request'
import type { RequestFilter } from '#domain/requests/request-filter'
import type { LibraryItem } from '#domain/library/library-item'
import type { CalendarEntry, CalendarEntryKind } from '#domain/calendar/calendar-entry'

const ALL_FIXTURES: MediaDetail[] = [...movieFixtures, ...seriesFixtures, ...albumFixtures]

const SERVARR_KIND_BY_MEDIA_KIND: Record<MediaKind, ServarrKind> = {
  movie: 'radarr',
  series: 'sonarr',
  album: 'lidarr',
}

function sameExternalId(a: ExternalId, b: ExternalId): boolean {
  return a.scheme === b.scheme && a.value === b.value
}

/** Deterministic, timer-free pseudo-randomness — same fixture always gets the same seed. */
function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function notFound(message: string): ApiError {
  return { type: 'not_found', message, status: 404 }
}

const ONBOARDING_STORAGE_KEY = 'arr:fake:onboarding'

interface PersistedOnboardingState {
  adminCreated: boolean
  onboardingStatus: OnboardingStatus
  instances: [ServarrKind, ServarrInstanceDto & { apiKey: string }][]
  ssoConfig: (OidcConfigInput & { claimsMapping?: Record<string, string> }) | null
}

/**
 * Fully offline implementation of `ArrConnector` — no network, no backend
 * (`task dev:fake`). Most state lives on the instance and is reset on
 * reload — the point of a disposable sandbox. Onboarding progress is the
 * exception: it's mirrored to `localStorage` (browser only — the SSR
 * instance still starts fresh) so a page refresh mid-setup doesn't bounce
 * you back to `/setup` every time Vite HMR recreates this singleton.
 */
export class FakeArrConnector implements ArrConnector {
  private user: AuthenticatedUser | null = null
  private adminCreated = false
  private onboardingStatus: OnboardingStatus = 'not_started'
  private readonly instances = new Map<ServarrKind, ServarrInstanceDto & { apiKey: string }>()
  private ssoConfig: (OidcConfigInput & { claimsMapping?: Record<string, string> }) | null = null
  private readonly requests = new Map<string, MediaRequest>()

  constructor() {
    this.restoreOnboardingState()
  }

  private restoreOnboardingState(): void {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (!raw) return
    try {
      const persisted = JSON.parse(raw) as PersistedOnboardingState
      this.adminCreated = persisted.adminCreated
      this.onboardingStatus = persisted.onboardingStatus
      for (const [kind, instance] of persisted.instances) this.instances.set(kind, instance)
      this.ssoConfig = persisted.ssoConfig
    } catch {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    }
  }

  private persistOnboardingState(): void {
    if (typeof window === 'undefined') return
    const persisted: PersistedOnboardingState = {
      adminCreated: this.adminCreated,
      onboardingStatus: this.onboardingStatus,
      instances: [...this.instances.entries()],
      ssoConfig: this.ssoConfig,
    }
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(persisted))
  }

  async getSession(): Promise<Session> {
    return { user: this.user }
  }

  async signInWithPassword(email: string): Promise<Result<AuthenticatedUser, ApiError>> {
    this.user = { id: 'fake-user', email, role: this.adminCreated ? 'admin' : 'user' }
    return { ok: true, value: this.user }
  }

  async startOidcSignIn(): Promise<Result<{ url: string }, ApiError>> {
    return {
      ok: false,
      error: {
        type: 'not_supported',
        message: 'OIDC sign-in is not available in fake mode.',
        status: 501,
      },
    }
  }

  async signOut(): Promise<void> {
    this.user = null
  }

  async getOnboardingState(): Promise<{ status: OnboardingStatus }> {
    return { status: this.onboardingStatus }
  }

  async createAdminAccount(): Promise<Result<{ userId: string }, ApiError>> {
    if (this.adminCreated) {
      return {
        ok: false,
        error: {
          type: 'admin_already_exists',
          message: 'An admin account already exists.',
          status: 409,
        },
      }
    }
    this.adminCreated = true
    this.onboardingStatus = 'admin_created'
    this.persistOnboardingState()
    return { ok: true, value: { userId: 'fake-admin' } }
  }

  async testInstanceConnection(
    _kind: ServarrKind,
    _baseUrl: string,
    apiKey: string,
  ): Promise<ConnectionTestResult> {
    if (!apiKey)
      return {
        ok: false,
        error: { type: 'unauthorized', message: 'API key rejected.', status: 200 },
      }
    return { ok: true, detectedVersion: '5.14.0-fake' }
  }

  async fetchInstanceProfiles(kind: ServarrKind) {
    return {
      ok: true as const,
      value: {
        rootFolders: [
          {
            path:
              kind === 'lidarr' ? '/data/music' : kind === 'sonarr' ? '/data/tv' : '/data/movies',
          },
        ],
        qualityProfiles: [{ id: 1, name: 'HD-1080p' }],
        ...(kind === 'lidarr' ? { metadataProfiles: [{ id: 1, name: 'Standard' }] } : {}),
        ...(kind === 'sonarr' ? { languageProfiles: [{ id: 1, name: 'English' }] } : {}),
      },
    }
  }

  async saveOnboardingInstance(kind: ServarrKind, draft: InstanceDraft) {
    const instance = this.upsertInstance(kind, draft)
    if (this.onboardingStatus === 'admin_created') {
      this.onboardingStatus = 'services_configured'
      this.persistOnboardingState()
    }
    return { ok: true as const, value: instance }
  }

  async testOidcDiscovery(issuerUrl: string): Promise<OidcTestResult> {
    return {
      ok: true,
      discovery: {
        authorizationEndpoint: `${issuerUrl}/authorize`,
        tokenEndpoint: `${issuerUrl}/token`,
        userinfoEndpoint: `${issuerUrl}/userinfo`,
      },
    }
  }

  async saveOnboardingSso(config: OidcConfigInput | null) {
    this.ssoConfig = config
    this.persistOnboardingState()
    return { ok: true as const, value: { oidcEnabled: config !== null } }
  }

  async completeOnboarding() {
    if (this.onboardingStatus !== 'services_configured') {
      return {
        ok: false as const,
        error: {
          type: 'invalid_transition',
          message: 'Onboarding is not ready to be completed.',
          status: 409,
        },
      }
    }
    if (![...this.instances.values()].some((instance) => instance.enabled)) {
      return {
        ok: false as const,
        error: {
          type: 'no_active_instance',
          message: 'At least one instance must be enabled.',
          status: 409,
        },
      }
    }
    this.onboardingStatus = 'completed'
    this.persistOnboardingState()
    return { ok: true as const, value: { status: 'completed' as const } }
  }

  async listInstances(): Promise<ServarrInstanceDto[]> {
    return [...this.instances.values()].map(({ apiKey: _apiKey, ...dto }) => dto)
  }

  async saveInstance(kind: ServarrKind, draft: InstanceDraft) {
    return { ok: true as const, value: this.upsertInstance(kind, draft) }
  }

  async deleteInstance(kind: ServarrKind): Promise<void> {
    this.instances.delete(kind)
    this.persistOnboardingState()
  }

  async testSavedInstanceConnection(kind: ServarrKind): Promise<ConnectionTestResult> {
    const instance = this.instances.get(kind)
    return this.testInstanceConnection(kind, instance?.baseUrl ?? '', instance?.apiKey ?? '')
  }

  async getSso() {
    if (!this.ssoConfig) return null
    return {
      issuerUrl: this.ssoConfig.issuerUrl,
      clientId: this.ssoConfig.clientId,
      claimsMapping: this.ssoConfig.claimsMapping ?? null,
    }
  }

  async updateSso(config: OidcConfigInput | null) {
    this.ssoConfig = config
    return { ok: true as const, value: { oidcEnabled: config !== null } }
  }

  async getEffectiveAuthSettings() {
    return {
      passwordLoginEnabled: true,
      oidcConfigured: this.ssoConfig !== null,
      source: 'database' as const,
    }
  }

  async searchMedia(kind: MediaKind, term: string): Promise<MediaItem[]> {
    const needle = term.trim().toLowerCase()
    return ALL_FIXTURES.filter(
      (item) => item.kind === kind && (needle === '' || item.title.toLowerCase().includes(needle)),
    )
  }

  async getMediaDetail(scheme: ExternalIdScheme, value: string, kind: MediaKind) {
    const fixture = ALL_FIXTURES.find(
      (item) => item.kind === kind && sameExternalId(item.externalId, { scheme, value }),
    )
    if (!fixture)
      return { ok: false as const, error: notFound(`No fixture for ${scheme}:${value}.`) }
    return { ok: true as const, value: fixture }
  }

  async listRequests(filter: RequestFilter = {}): Promise<MediaRequest[]> {
    const now = new Date()
    return [...this.requests.values()]
      .map((request) => advanceRequest(request, now))
      .filter((request) => !filter.status || request.status === filter.status)
      .filter((request) => !filter.kind || request.kind === filter.kind)
      .filter((request) => !filter.requestedByMe || request.requestedBy.id === this.user?.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async createRequest(kind: MediaKind, externalId: ExternalId, instanceId?: string) {
    const fixture = ALL_FIXTURES.find(
      (item) => item.kind === kind && sameExternalId(item.externalId, externalId),
    )
    if (!fixture)
      return { ok: false as const, error: notFound('This title is not in the fake catalog.') }

    const alreadyRequested = [...this.requests.values()].some(
      (request) => request.kind === kind && sameExternalId(request.externalId, externalId),
    )
    if (alreadyRequested) {
      return {
        ok: false as const,
        error: {
          type: 'already_requested',
          message: 'This media has already been requested.',
          status: 409,
        },
      }
    }
    if (fixture.alreadyManaged) {
      return {
        ok: false as const,
        error: { type: 'already_managed', message: 'This media is already managed.', status: 409 },
      }
    }

    const servarrKind = SERVARR_KIND_BY_MEDIA_KIND[kind]
    const candidate = instanceId ? this.instances.get(servarrKind) : undefined
    const instance = instanceId
      ? candidate?.id === instanceId && candidate.enabled
        ? candidate
        : null
      : [...this.instances.values()].find((i) => i.kind === servarrKind && i.enabled)
    if (instanceId && !instance) {
      return {
        ok: false as const,
        error: { type: 'instance_not_found', message: 'Instance not found.', status: 404 },
      }
    }
    if (!instance) {
      return {
        ok: false as const,
        error: {
          type: 'no_active_instance',
          message: 'No active instance configured for this kind.',
          status: 409,
        },
      }
    }

    const now = new Date().toISOString()
    const request: MediaRequest = {
      id: crypto.randomUUID(),
      requestedBy: { id: this.user?.id ?? 'fake-user', email: this.user?.email ?? null },
      kind,
      externalId,
      title: fixture.title,
      status: 'submitted',
      progress: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    }
    this.requests.set(request.id, request)
    return { ok: true as const, value: request }
  }

  async getRequest(id: string): Promise<MediaRequest | null> {
    const request = this.requests.get(id)
    return request ? advanceRequest(request, new Date()) : null
  }

  async cancelRequest(id: string) {
    const stored = this.requests.get(id)
    if (!stored) return { ok: false as const, error: notFound('Request not found.') }

    const current = advanceRequest(stored, new Date())
    if (
      current.status === 'importing' ||
      current.status === 'available' ||
      current.status === 'cancelled'
    ) {
      return {
        ok: false as const,
        error: {
          type: 'not_cancellable',
          message: 'This request cannot be cancelled from its current status.',
          details: { currentStatus: current.status },
          status: 409,
        },
      }
    }

    const cancelled: MediaRequest = {
      ...current,
      status: 'cancelled',
      progress: null,
      updatedAt: new Date().toISOString(),
    }
    this.requests.set(id, cancelled)
    return { ok: true as const, value: cancelled }
  }

  async listLibrary(kind?: MediaKind): Promise<LibraryItem[]> {
    return ALL_FIXTURES.filter((item) => !kind || item.kind === kind).map((item) => {
      const seed = hashString(item.externalId.value)
      return {
        externalId: item.externalId,
        kind: item.kind,
        title: item.title,
        year: item.year,
        posterUrl: item.posterUrl,
        monitored: seed % 3 !== 0,
        hasFile: seed % 4 !== 0,
        sizeOnDiskBytes: (seed % 20) * 250_000_000,
        status: seed % 4 === 0 ? 'missing' : 'downloaded',
        instanceId: `${SERVARR_KIND_BY_MEDIA_KIND[item.kind]}-fake`,
      }
    })
  }

  async getCalendar(startDate: string, endDate: string): Promise<CalendarEntry[]> {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)

    return ALL_FIXTURES.map((item, index) => {
      const seed = hashString(item.externalId.value)
      const dayOffset = (seed + index) % totalDays
      const releaseDate = new Date(start.getTime() + dayOffset * 86_400_000)
      const entryKind: CalendarEntryKind = item.kind === 'series' ? 'episode' : item.kind

      return {
        id: `${item.kind}:${item.externalId.value}`,
        kind: entryKind,
        title: item.title,
        subtitle:
          entryKind === 'episode' ? `S01E${String((seed % 12) + 1).padStart(2, '0')}` : null,
        releaseDate: releaseDate.toISOString().slice(0, 10),
        posterUrl: item.posterUrl,
        monitored: seed % 3 !== 0,
        hasFile: seed % 4 !== 0,
        instanceId: `${SERVARR_KIND_BY_MEDIA_KIND[item.kind]}-fake`,
        externalId: item.externalId,
      }
    })
  }

  private upsertInstance(kind: ServarrKind, draft: InstanceDraft): ServarrInstanceDto {
    const existing = this.instances.get(kind)
    const instance: ServarrInstanceDto & { apiKey: string } = {
      id: existing?.id ?? crypto.randomUUID(),
      kind,
      baseUrl: draft.baseUrl,
      hasApiKey: true,
      apiKey: draft.apiKey,
      rootFolderPath: draft.rootFolderPath,
      qualityProfileId: draft.qualityProfileId,
      metadataProfileId: draft.metadataProfileId ?? null,
      languageProfileId: draft.languageProfileId ?? null,
      enabled: draft.enabled,
    }
    this.instances.set(kind, instance)
    this.persistOnboardingState()
    const { apiKey: _apiKey, ...dto } = instance
    return dto
  }
}

export const fakeArrConnector = new FakeArrConnector()
