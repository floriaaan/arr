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
import type { AuthenticatedUser, UserRole } from '#domain/identity/user'
import type { UserAccount } from '#domain/identity/user-account'
import type { Session } from '#domain/identity/session'
import type { OnboardingStatus } from '#domain/settings/onboarding-state'
import type { ServarrKind, ServarrInstanceDto } from '#domain/settings/servarr-instance'
import type { InstanceDraft } from '#domain/settings/instance-draft'
import type { InstanceProfileDto, InstanceProfileDraft } from '#domain/settings/instance-profile'
import type {
  MediaServerDraft,
  MediaServerDto,
  MediaServerKind,
} from '#domain/settings/media-server'
import type { DiscoveredInstance, DiscoveryScope } from '#domain/settings/discovered-instance'
import type {
  NotificationSettingsDraft,
  NotificationSettingsDto,
  NotificationTestResult,
} from '#domain/settings/notification-settings'
import type { RequestApprovalSettingsDto } from '#domain/settings/request-approval-settings'
import type { QualityProfileRecord } from '#domain/settings/quality-profile-record'
import type { DownloadClientRecord } from '#domain/settings/download-client-record'
import type { IndexerRecord } from '#domain/settings/indexer-record'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId, ExternalIdScheme } from '#domain/catalog/external-id'
import type { MediaItem } from '#domain/catalog/media-item'
import type { MediaDetail } from '#domain/catalog/media-detail'
import type { MediaRequest } from '#domain/requests/media-request'
import type { RequestFilter } from '#domain/requests/request-filter'
import type { RequestEpisode } from '#domain/requests/request-episode'
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

/** Enough options per kind to exercise the root folder suggestions and the quality profile slider. */
const FAKE_ROOT_FOLDERS: Record<ServarrKind, { path: string }[]> = {
  radarr: [{ path: '/data/movies' }, { path: '/data/movies-4k' }, { path: '/data/kids-movies' }],
  sonarr: [{ path: '/data/tv' }, { path: '/data/anime' }, { path: '/data/tv-4k' }],
  lidarr: [{ path: '/data/music' }, { path: '/data/music-lossless' }],
}

const FAKE_QUALITY_PROFILES: Record<ServarrKind, { id: number; name: string }[]> = {
  radarr: [
    { id: 1, name: 'SD' },
    { id: 2, name: 'HD-720p' },
    { id: 3, name: 'HD-1080p' },
    { id: 4, name: 'Ultra-HD' },
    { id: 5, name: 'Any' },
  ],
  sonarr: [
    { id: 1, name: 'SD' },
    { id: 2, name: 'HD-720p' },
    { id: 3, name: 'HD-1080p' },
    { id: 4, name: 'Ultra-HD' },
  ],
  lidarr: [
    { id: 1, name: 'Standard' },
    { id: 2, name: 'Lossless' },
    { id: 3, name: 'Any' },
  ],
}

/**
 * Simulates real *arr Quality Profiles: profile at index `i` cumulatively
 * allows every quality up to and including its own (typical "HD-1080p"
 * style profile), with a cutoff on itself — good enough to exercise the
 * checkboxes/cutoff select without a real instance.
 */
function buildFakeQualityProfiles(kind: ServarrKind): QualityProfileRecord[] {
  const qualities = FAKE_QUALITY_PROFILES[kind]
  return qualities.map((profile, index) => ({
    id: profile.id,
    name: profile.name,
    upgradeAllowed: index < qualities.length - 1,
    cutoff: profile.id,
    items: qualities.map((quality, qualityIndex) => ({
      id: quality.id,
      allowed: qualityIndex <= index,
      quality: { id: quality.id, name: quality.name },
    })),
  }))
}

const FAKE_METADATA_PROFILES = [
  { id: 1, name: 'Standard' },
  { id: 2, name: 'Only Studio Albums' },
  { id: 3, name: 'Everything' },
]

const FAKE_LANGUAGE_PROFILES = [
  { id: 1, name: 'English' },
  { id: 2, name: 'French' },
  { id: 3, name: 'Multi (English + French)' },
]

/**
 * Seeded so that "QBittorrent" ends up configured on all 3 kinds (exercises
 * a fully-merged card) while "SABnzbd" is only on radarr/sonarr (exercises
 * the "missing instance" checkbox in the grouped edit dialog) — cf.
 * docs/phase-4-download-clients-indexers.
 */
function seedDownloadClients(kind: ServarrKind): DownloadClientRecord[] {
  const category = kind === 'radarr' ? 'movies' : kind === 'sonarr' ? 'tv' : 'music'
  const clients: DownloadClientRecord[] = [
    {
      id: 1,
      name: 'QBittorrent',
      implementation: 'QBittorrent',
      implementationName: 'qBittorrent',
      configContract: 'QBittorrentSettings',
      protocol: 'torrent',
      enable: true,
      priority: 1,
      fields: [
        { name: 'host', label: 'Host', type: 'textbox', value: 'localhost' },
        { name: 'port', label: 'Port', type: 'number', value: 8080 },
        { name: 'username', label: 'Username', type: 'textbox', value: 'admin' },
        { name: 'password', label: 'Password', type: 'password', privacy: 'password', value: '' },
        { name: 'category', label: 'Category', type: 'textbox', value: category },
        { name: 'useSsl', label: 'Use SSL', type: 'checkbox', value: false },
      ],
    },
  ]

  if (kind !== 'lidarr') {
    clients.push({
      id: 2,
      name: 'SABnzbd',
      implementation: 'Sabnzbd',
      implementationName: 'SABnzbd',
      configContract: 'SabnzbdSettings',
      protocol: 'usenet',
      enable: true,
      priority: 1,
      fields: [
        { name: 'host', label: 'Host', type: 'textbox', value: 'localhost' },
        { name: 'port', label: 'Port', type: 'number', value: 8085 },
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          privacy: 'apiKey',
          value: 'fake-sabnzbd-key',
        },
        { name: 'category', label: 'Category', type: 'textbox', value: category },
      ],
    })
  }

  return clients
}

/**
 * "1337x" (radarr+sonarr) and "DrunkenSlug" (sonarr+lidarr) each cover 2 of
 * 3 kinds with a different missing instance, to exercise a couple of
 * partial-coverage combinations for the merged card.
 */
function seedIndexers(kind: ServarrKind): IndexerRecord[] {
  const indexers: IndexerRecord[] = []

  if (kind === 'radarr' || kind === 'sonarr') {
    indexers.push({
      id: 1,
      name: '1337x',
      implementation: 'Torznab',
      implementationName: 'Torznab',
      configContract: 'TorznabSettings',
      protocol: 'torrent',
      enableRss: true,
      enableAutomaticSearch: true,
      enableInteractiveSearch: true,
      priority: 25,
      fields: [
        { name: 'baseUrl', label: 'URL', type: 'textbox', value: 'https://1337x.example.test' },
        { name: 'apiPath', label: 'API Path', type: 'textbox', value: '/api' },
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          privacy: 'apiKey',
          value: 'fake-1337x-key',
        },
        { name: 'categories', label: 'Categories', type: 'tag', value: [2000, 2010] },
      ],
    })
  }

  if (kind === 'sonarr' || kind === 'lidarr') {
    indexers.push({
      id: 2,
      name: 'DrunkenSlug',
      implementation: 'Newznab',
      implementationName: 'Newznab',
      configContract: 'NewznabSettings',
      protocol: 'usenet',
      enableRss: true,
      enableAutomaticSearch: true,
      enableInteractiveSearch: true,
      priority: 25,
      fields: [
        {
          name: 'baseUrl',
          label: 'URL',
          type: 'textbox',
          value: 'https://drunkenslug.example.test',
        },
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          privacy: 'apiKey',
          value: 'fake-drunkenslug-key',
        },
        { name: 'categories', label: 'Categories', type: 'tag', value: [5000, 5030] },
      ],
    })
  }

  return indexers
}

/** Templates for the "Add download client" dialog — one per implementation, no `id`. */
const FAKE_DOWNLOAD_CLIENT_SCHEMAS: DownloadClientRecord[] = [
  {
    name: '',
    implementation: 'QBittorrent',
    implementationName: 'qBittorrent',
    configContract: 'QBittorrentSettings',
    protocol: 'torrent',
    enable: true,
    priority: 1,
    fields: [
      { name: 'host', label: 'Host', type: 'textbox', value: 'localhost' },
      { name: 'port', label: 'Port', type: 'number', value: 8080 },
      { name: 'username', label: 'Username', type: 'textbox', value: '' },
      { name: 'password', label: 'Password', type: 'password', privacy: 'password', value: '' },
      { name: 'category', label: 'Category', type: 'textbox', value: '' },
      { name: 'useSsl', label: 'Use SSL', type: 'checkbox', value: false },
    ],
  },
  {
    name: '',
    implementation: 'Transmission',
    implementationName: 'Transmission',
    configContract: 'TransmissionSettings',
    protocol: 'torrent',
    enable: true,
    priority: 1,
    fields: [
      { name: 'host', label: 'Host', type: 'textbox', value: 'localhost' },
      { name: 'port', label: 'Port', type: 'number', value: 9091 },
      { name: 'username', label: 'Username', type: 'textbox', value: '' },
      { name: 'password', label: 'Password', type: 'password', privacy: 'password', value: '' },
      { name: 'category', label: 'Category', type: 'textbox', value: '' },
    ],
  },
  {
    name: '',
    implementation: 'Sabnzbd',
    implementationName: 'SABnzbd',
    configContract: 'SabnzbdSettings',
    protocol: 'usenet',
    enable: true,
    priority: 1,
    fields: [
      { name: 'host', label: 'Host', type: 'textbox', value: 'localhost' },
      { name: 'port', label: 'Port', type: 'number', value: 8085 },
      { name: 'apiKey', label: 'API Key', type: 'password', privacy: 'apiKey', value: '' },
      { name: 'category', label: 'Category', type: 'textbox', value: '' },
    ],
  },
  {
    name: '',
    implementation: 'NzbGet',
    implementationName: 'NZBGet',
    configContract: 'NzbgetSettings',
    protocol: 'usenet',
    enable: true,
    priority: 1,
    fields: [
      { name: 'host', label: 'Host', type: 'textbox', value: 'localhost' },
      { name: 'port', label: 'Port', type: 'number', value: 6789 },
      { name: 'username', label: 'Username', type: 'textbox', value: 'nzbget' },
      { name: 'password', label: 'Password', type: 'password', privacy: 'password', value: '' },
      { name: 'category', label: 'Category', type: 'textbox', value: '' },
    ],
  },
]

/** Templates for the "Add indexer" dialog — one per implementation, no `id`. */
const FAKE_INDEXER_SCHEMAS: IndexerRecord[] = [
  {
    name: '',
    implementation: 'Torznab',
    implementationName: 'Torznab',
    configContract: 'TorznabSettings',
    protocol: 'torrent',
    enableRss: true,
    enableAutomaticSearch: true,
    enableInteractiveSearch: true,
    priority: 25,
    fields: [
      { name: 'baseUrl', label: 'URL', type: 'textbox', value: '' },
      { name: 'apiPath', label: 'API Path', type: 'textbox', value: '/api' },
      { name: 'apiKey', label: 'API Key', type: 'password', privacy: 'apiKey', value: '' },
      { name: 'categories', label: 'Categories', type: 'tag', value: [] },
    ],
  },
  {
    name: '',
    implementation: 'Newznab',
    implementationName: 'Newznab',
    configContract: 'NewznabSettings',
    protocol: 'usenet',
    enableRss: true,
    enableAutomaticSearch: true,
    enableInteractiveSearch: true,
    priority: 25,
    fields: [
      { name: 'baseUrl', label: 'URL', type: 'textbox', value: '' },
      { name: 'apiKey', label: 'API Key', type: 'password', privacy: 'apiKey', value: '' },
      { name: 'categories', label: 'Categories', type: 'tag', value: [] },
    ],
  },
]

const ONBOARDING_STORAGE_KEY = 'arr:fake:onboarding'

interface PersistedOnboardingState {
  adminCreated: boolean
  onboardingStatus: OnboardingStatus
  instances: [ServarrKind, ServarrInstanceDto & { apiKey: string }][]
  ssoConfig: (OidcConfigInput & { claimsMapping?: Record<string, string> }) | null
  /** Optional: absent in state persisted before this field existed. */
  savedProfiles?: [ServarrKind, InstanceProfileDto[]][]
  /** Optional: absent in state persisted before this field existed. */
  qualityProfiles?: [ServarrKind, QualityProfileRecord[]][]
  /** Optional: absent in state persisted before this field existed. */
  mediaServers?: [MediaServerKind, MediaServerDto][]
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
  private readonly savedProfiles = new Map<ServarrKind, InstanceProfileDto[]>()
  private readonly qualityProfiles = new Map<ServarrKind, QualityProfileRecord[]>()
  private readonly downloadClients = new Map<ServarrKind, DownloadClientRecord[]>()
  private readonly indexers = new Map<ServarrKind, IndexerRecord[]>()
  private readonly mediaServers = new Map<MediaServerKind, MediaServerDto>()
  private notificationSettings: NotificationSettingsDto & {
    webhookUrl: string | null
    token: string | null
    password: string | null
  } = {
    webhookUrl: null,
    hasWebhookUrl: false,
    authMode: 'none',
    token: null,
    hasToken: false,
    username: null,
    password: null,
    hasPassword: false,
    onRequestCreated: true,
    onRequestAvailable: true,
    onRequestFailed: true,
    onInstanceUnreachable: true,
    onRequestPendingApproval: true,
  }
  private requestApprovalSettings: RequestApprovalSettingsDto = {
    moviePolicy: 'auto',
    seriesPolicy: 'auto',
    albumPolicy: 'auto',
  }
  private readonly userAutoApprove = new Map<string, boolean | null>()
  private ssoConfig: (OidcConfigInput & { claimsMapping?: Record<string, string> }) | null = null
  private readonly requests = new Map<string, MediaRequest>()
  private readonly removedLibraryItems = new Set<string>()
  private readonly users = new Map<string, UserAccount>([
    [
      'fake-user',
      {
        id: 'fake-user',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
    ],
    [
      'fake-sso-1',
      {
        id: 'fake-sso-1',
        email: 'alex@example.com',
        name: 'Alex (via SSO)',
        role: 'user',
        createdAt: new Date().toISOString(),
      },
    ],
    [
      'fake-sso-2',
      {
        id: 'fake-sso-2',
        email: 'sam@example.com',
        name: 'Sam (via SSO)',
        role: 'user',
        createdAt: new Date().toISOString(),
      },
    ],
  ])

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
      for (const [kind, profiles] of persisted.savedProfiles ?? []) this.savedProfiles.set(kind, profiles)
      for (const [kind, profiles] of persisted.qualityProfiles ?? []) {
        this.qualityProfiles.set(kind, profiles)
      }
      for (const [kind, server] of persisted.mediaServers ?? []) this.mediaServers.set(kind, server)
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
      savedProfiles: [...this.savedProfiles.entries()],
      qualityProfiles: [...this.qualityProfiles.entries()],
      mediaServers: [...this.mediaServers.entries()],
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

  async listUsers(): Promise<UserAccount[]> {
    return [...this.users.values()].sort((a, b) => a.email.localeCompare(b.email))
  }

  async setUserRole(userId: string, role: UserRole) {
    const existing = this.users.get(userId)
    if (!existing) {
      return {
        ok: false as const,
        error: { type: 'not_found', message: 'User not found.', status: 404 },
      }
    }
    const updated = { ...existing, role }
    this.users.set(userId, updated)
    if (this.user?.id === userId) this.user = { ...this.user, role }
    return { ok: true as const, value: { user: updated } }
  }

  async listUserRequestPreferences(): Promise<Record<string, boolean | null>> {
    return Object.fromEntries(this.userAutoApprove.entries())
  }

  async setUserAutoApprove(userId: string, autoApprove: boolean | null): Promise<void> {
    this.userAutoApprove.set(userId, autoApprove)
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
        rootFolders: FAKE_ROOT_FOLDERS[kind],
        qualityProfiles: FAKE_QUALITY_PROFILES[kind],
        ...(kind === 'lidarr' ? { metadataProfiles: FAKE_METADATA_PROFILES } : {}),
        ...(kind === 'sonarr' ? { languageProfiles: FAKE_LANGUAGE_PROFILES } : {}),
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

  async testSavedInstanceConnection(
    kind: ServarrKind,
    baseUrl: string,
    apiKey: string,
  ): Promise<ConnectionTestResult> {
    return this.testInstanceConnection(kind, baseUrl, apiKey)
  }

  async saveOnboardingMediaServer(kind: MediaServerKind, draft: MediaServerDraft) {
    return this.saveMediaServer(kind, draft)
  }

  async discoverOnboardingInstances(scope: DiscoveryScope) {
    return this.discoverInstances(scope)
  }

  /**
   * A plausible-looking result set, including one `confidence: 'port'` entry
   * and one Emby-behind-a-reverse-proxy case, so the dialog's edge cases are
   * exercisable without a network.
   */
  async discoverInstances(scope: DiscoveryScope) {
    const host = scope.extraHost?.trim() || 'localhost'
    const instances: DiscoveredInstance[] = [
      {
        kind: 'radarr',
        baseUrl: `http://${host}:7878`,
        detectedVersion: null,
        serverName: null,
        confidence: 'confirmed',
      },
      {
        kind: 'sonarr',
        baseUrl: `http://${host}:8989`,
        detectedVersion: null,
        serverName: null,
        confidence: 'confirmed',
      },
      {
        kind: 'lidarr',
        baseUrl: `http://${host}:8686`,
        detectedVersion: null,
        serverName: null,
        confidence: 'port',
      },
      {
        kind: 'plex',
        baseUrl: `http://${host}:32400`,
        detectedVersion: '1.41.0.8992',
        serverName: null,
        confidence: 'confirmed',
      },
    ]

    if (scope.scanSubnet) {
      instances.push({
        kind: 'jellyfin',
        baseUrl: 'http://192.168.1.24:8096',
        detectedVersion: '10.10.3',
        serverName: 'Living room',
        confidence: 'confirmed',
      })
    }

    return { ok: true as const, value: instances }
  }

  async listMediaServers(): Promise<MediaServerDto[]> {
    return [...this.mediaServers.values()]
  }

  async saveMediaServer(kind: MediaServerKind, draft: MediaServerDraft) {
    if (!/^https?:\/\//.test(draft.baseUrl)) {
      return {
        ok: false as const,
        error: {
          type: 'validation_failed',
          message: `"${draft.baseUrl}" is not a valid URL`,
          status: 400,
        },
      }
    }

    const existing = this.mediaServers.get(kind)
    const server: MediaServerDto = {
      id: existing?.id ?? crypto.randomUUID(),
      kind,
      baseUrl: draft.baseUrl.replace(/\/+$/, ''),
      enabled: draft.enabled,
    }
    this.mediaServers.set(kind, server)
    this.persistOnboardingState()
    return { ok: true as const, value: server }
  }

  async deleteMediaServer(kind: MediaServerKind): Promise<void> {
    this.mediaServers.delete(kind)
    this.persistOnboardingState()
  }

  async fetchSettingsInstanceProfiles(kind: ServarrKind) {
    return this.fetchInstanceProfiles(kind)
  }

  async getNotificationSettings(): Promise<NotificationSettingsDto> {
    const { webhookUrl: _webhookUrl, token: _token, password: _password, ...dto } =
      this.notificationSettings
    return dto
  }

  private resolveNotificationAuth(draft: NotificationSettingsDraft) {
    const existing = this.notificationSettings

    if (draft.authMode === 'none') {
      return { ok: true as const, value: { mode: 'none' as const, token: null, username: null, password: null } }
    }

    if (draft.authMode === 'token') {
      const token = draft.token !== undefined ? draft.token : existing.authMode === 'token' ? existing.token : null
      if (!token) {
        return {
          ok: false as const,
          error: { type: 'validation_failed', message: 'A token is required.', status: 400 },
        }
      }
      return { ok: true as const, value: { mode: 'token' as const, token, username: null, password: null } }
    }

    const username =
      draft.username !== undefined ? draft.username : existing.authMode === 'basic' ? existing.username : null
    if (!username || username.trim() === '') {
      return {
        ok: false as const,
        error: { type: 'validation_failed', message: 'Username must not be empty', status: 400 },
      }
    }
    const password =
      draft.password !== undefined ? draft.password : existing.authMode === 'basic' ? existing.password : null
    if (!password) {
      return {
        ok: false as const,
        error: { type: 'validation_failed', message: 'A password is required.', status: 400 },
      }
    }
    return { ok: true as const, value: { mode: 'basic' as const, token: null, username, password } }
  }

  async saveNotificationSettings(draft: NotificationSettingsDraft) {
    const webhookUrl =
      draft.webhookUrl === undefined ? this.notificationSettings.webhookUrl : draft.webhookUrl
    if (webhookUrl !== null && !/^https?:\/\//.test(webhookUrl)) {
      return {
        ok: false as const,
        error: {
          type: 'validation_failed',
          message: `"${webhookUrl}" is not a valid URL`,
          status: 400,
        },
      }
    }

    const auth = this.resolveNotificationAuth(draft)
    if (!auth.ok) return auth

    this.notificationSettings = {
      webhookUrl,
      hasWebhookUrl: webhookUrl !== null,
      authMode: auth.value.mode,
      token: auth.value.token,
      hasToken: auth.value.token !== null,
      username: auth.value.username,
      password: auth.value.password,
      hasPassword: auth.value.password !== null,
      onRequestCreated: draft.onRequestCreated,
      onRequestAvailable: draft.onRequestAvailable,
      onRequestFailed: draft.onRequestFailed,
      onInstanceUnreachable: draft.onInstanceUnreachable,
      onRequestPendingApproval: draft.onRequestPendingApproval,
    }
    const { webhookUrl: _hidden, token: _hiddenToken, password: _hiddenPassword, ...dto } =
      this.notificationSettings
    return { ok: true as const, value: dto }
  }

  async testNotification(): Promise<NotificationTestResult> {
    if (!this.notificationSettings.webhookUrl) {
      return { ok: false, error: { message: 'No webhook URL configured.' } }
    }
    return { ok: true }
  }

  async getRequestApprovalSettings(): Promise<RequestApprovalSettingsDto> {
    return this.requestApprovalSettings
  }

  async saveRequestApprovalSettings(
    draft: RequestApprovalSettingsDto,
  ): Promise<RequestApprovalSettingsDto> {
    this.requestApprovalSettings = draft
    return this.requestApprovalSettings
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
    if (this.removedLibraryItems.has(`${scheme}:${value}`)) {
      return { ok: true as const, value: { ...fixture, alreadyManaged: false, managedBy: undefined } }
    }
    return { ok: true as const, value: fixture }
  }

  async listRequests(filter: RequestFilter = {}): Promise<MediaRequest[]> {
    const now = new Date()
    return [...this.requests.values()]
      .map((request) => advanceRequest(request, now))
      .filter((request) => !filter.status || request.status === filter.status)
      .filter((request) => !filter.kind || request.kind === filter.kind)
      .filter((request) => !filter.requestedByMe || request.requestedBy.id === this.user?.id)
      .filter((request) => filter.requiresApproval === undefined || request.requiresApproval === filter.requiresApproval)
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
    const requiresApproval = this.resolveRequiresApproval(kind)
    const request: MediaRequest = {
      id: crypto.randomUUID(),
      requestedBy: { id: this.user?.id ?? 'fake-user', email: this.user?.email ?? null },
      kind,
      externalId,
      title: fixture.title,
      status: requiresApproval ? 'pending' : 'submitted',
      progress: null,
      failureReason: null,
      origin: 'manual',
      requiresApproval,
      approvedAt: null,
      approvedByUserId: null,
      rejectedAt: null,
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    }
    this.requests.set(request.id, request)
    return { ok: true as const, value: request }
  }

  /** Mirrors `resolveRequiresApproval` on the backend: admin bypass, then per-user override, then the kind's global policy. */
  private resolveRequiresApproval(kind: MediaKind): boolean {
    if (this.user?.role === 'admin') return false
    const override = this.user ? this.userAutoApprove.get(this.user.id) : undefined
    if (override !== undefined && override !== null) return !override
    const policy =
      kind === 'movie'
        ? this.requestApprovalSettings.moviePolicy
        : kind === 'series'
          ? this.requestApprovalSettings.seriesPolicy
          : this.requestApprovalSettings.albumPolicy
    return policy === 'manual'
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

  async approveRequest(id: string) {
    const stored = this.requests.get(id)
    if (!stored) return { ok: false as const, error: notFound('Request not found.') }
    if (stored.status !== 'pending' || !stored.requiresApproval) {
      return {
        ok: false as const,
        error: {
          type: 'not_cancellable',
          message: 'This request cannot be approved from its current state.',
          details: { currentStatus: stored.status },
          status: 409,
        },
      }
    }

    const approved: MediaRequest = {
      ...stored,
      status: 'submitted',
      requiresApproval: false,
      approvedAt: new Date().toISOString(),
      approvedByUserId: this.user?.id ?? 'fake-user',
      updatedAt: new Date().toISOString(),
    }
    this.requests.set(id, approved)
    return { ok: true as const, value: approved }
  }

  async rejectRequest(id: string, reason: string) {
    const stored = this.requests.get(id)
    if (!stored) return { ok: false as const, error: notFound('Request not found.') }
    if (stored.status !== 'pending' || !stored.requiresApproval) {
      return {
        ok: false as const,
        error: {
          type: 'not_cancellable',
          message: 'This request cannot be rejected from its current state.',
          details: { currentStatus: stored.status },
          status: 409,
        },
      }
    }

    const rejected: MediaRequest = {
      ...stored,
      status: 'cancelled',
      requiresApproval: false,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    }
    this.requests.set(id, rejected)
    return { ok: true as const, value: rejected }
  }

  async removeLibraryItem(externalId: ExternalId, _deleteFiles: boolean) {
    this.removedLibraryItems.add(`${externalId.scheme}:${externalId.value}`)
    return { ok: true as const, value: undefined }
  }

  /**
   * Ten deterministic episodes covering every state the accordion renders, so
   * the UI can be exercised without Sonarr. Empty for anything but a series,
   * mirroring the real adapter.
   */
  async listRequestEpisodes(id: string) {
    const request = this.requests.get(id)
    if (!request) return { ok: false as const, error: notFound(`No request ${id}.`) }
    if (request.kind !== 'series') return { ok: true as const, value: [] }

    const seed = hashString(id)
    const episodes: RequestEpisode[] = Array.from({ length: 10 }, (_, index) => {
      const bucket = (seed + index) % 5
      const state: RequestEpisode['state'] =
        bucket === 0
          ? 'missing'
          : bucket === 1
            ? 'downloading'
            : bucket === 2
              ? 'importing'
              : bucket === 3
                ? 'failed'
                : 'available'

      return {
        seasonNumber: 1,
        episodeNumber: index + 1,
        title: `Episode ${index + 1}`,
        airDate: new Date(Date.now() - (10 - index) * 86_400_000).toISOString(),
        state,
        percentage:
          state === 'downloading' || state === 'importing' ? ((seed + index) % 90) + 5 : null,
      }
    })

    return { ok: true as const, value: episodes }
  }

  async listLibrary(kind?: MediaKind): Promise<LibraryItem[]> {
    return ALL_FIXTURES.filter(
      (item) =>
        (!kind || item.kind === kind) &&
        !this.removedLibraryItems.has(`${item.externalId.scheme}:${item.externalId.value}`),
    ).map((item) => {
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
      seriesType: draft.seriesType ?? null,
      minimumAvailability: draft.minimumAvailability ?? null,
      enabled: draft.enabled,
      // A fake instance is always reachable — the health panel needs
      // something plausible to render.
      lastCheckedAt: new Date().toISOString(),
      healthy: true,
      detectedVersion: '5.0.0.0',
      lastError: null,
    }
    this.instances.set(kind, instance)

    if (!this.savedProfiles.get(kind)?.length) {
      this.savedProfiles.set(kind, [
        {
          id: crypto.randomUUID(),
          instanceId: instance.id,
          name: 'Default',
          rootFolderPath: draft.rootFolderPath,
          qualityProfileId: draft.qualityProfileId,
          metadataProfileId: draft.metadataProfileId ?? null,
          languageProfileId: draft.languageProfileId ?? null,
          seriesType: draft.seriesType ?? null,
          minimumAvailability: draft.minimumAvailability ?? null,
          isDefault: true,
        },
      ])
    }

    this.persistOnboardingState()
    const { apiKey: _apiKey, ...dto } = instance
    return dto
  }

  private syncInstanceFromProfile(kind: ServarrKind, profile: InstanceProfileDto): void {
    const instance = this.instances.get(kind)
    if (!instance) return
    instance.rootFolderPath = profile.rootFolderPath
    instance.qualityProfileId = profile.qualityProfileId
    instance.metadataProfileId = profile.metadataProfileId
    instance.languageProfileId = profile.languageProfileId
    instance.seriesType = profile.seriesType
    instance.minimumAvailability = profile.minimumAvailability
  }

  async fetchStoredInstanceProfiles(kind: ServarrKind) {
    if (!this.instances.get(kind)) return { ok: false as const, error: notFound('Instance not configured.') }
    return this.fetchInstanceProfiles(kind)
  }

  async listInstanceProfiles(kind: ServarrKind): Promise<InstanceProfileDto[]> {
    return this.savedProfiles.get(kind) ?? []
  }

  /** A profile and a Quality Profile are the same thing — creating one creates the other. */
  async createInstanceProfile(kind: ServarrKind, draft: InstanceProfileDraft) {
    const instance = this.instances.get(kind)
    if (!instance) return { ok: false as const, error: notFound('Instance not configured.') }

    const remoteProfile = this.createFakeQualityProfile(kind, {
      name: draft.name,
      upgradeAllowed: draft.qualityProfile.upgradeAllowed,
      cutoff: draft.qualityProfile.cutoff,
      items: draft.qualityProfile.items,
    })

    const existing = this.savedProfiles.get(kind) ?? []
    const isDefault = draft.setAsDefault === true || existing.length === 0

    const profile: InstanceProfileDto = {
      id: crypto.randomUUID(),
      instanceId: instance.id,
      name: draft.name,
      rootFolderPath: draft.rootFolderPath,
      qualityProfileId: remoteProfile.id!,
      metadataProfileId: draft.metadataProfileId ?? null,
      languageProfileId: draft.languageProfileId ?? null,
      seriesType: draft.seriesType ?? null,
      minimumAvailability: draft.minimumAvailability ?? null,
      isDefault,
    }

    const next = isDefault
      ? [...existing.map((p) => ({ ...p, isDefault: false })), profile]
      : [...existing, profile]
    this.savedProfiles.set(kind, next)

    if (isDefault) this.syncInstanceFromProfile(kind, profile)
    this.persistOnboardingState()

    return { ok: true as const, value: profile }
  }

  async updateInstanceProfile(kind: ServarrKind, id: string, draft: InstanceProfileDraft) {
    const existing = this.savedProfiles.get(kind) ?? []
    const current = existing.find((profile) => profile.id === id)
    if (!current) return { ok: false as const, error: notFound('Profile not found.') }

    this.updateFakeQualityProfile(kind, current.qualityProfileId, {
      name: draft.name,
      upgradeAllowed: draft.qualityProfile.upgradeAllowed,
      cutoff: draft.qualityProfile.cutoff,
      items: draft.qualityProfile.items,
    })

    const updated: InstanceProfileDto = {
      ...current,
      name: draft.name,
      rootFolderPath: draft.rootFolderPath,
      metadataProfileId: draft.metadataProfileId ?? null,
      languageProfileId: draft.languageProfileId ?? null,
      seriesType: draft.seriesType ?? null,
      minimumAvailability: draft.minimumAvailability ?? null,
    }

    this.savedProfiles.set(
      kind,
      existing.map((profile) => (profile.id === id ? updated : profile)),
    )

    if (updated.isDefault) this.syncInstanceFromProfile(kind, updated)
    this.persistOnboardingState()

    return { ok: true as const, value: updated }
  }

  async deleteInstanceProfile(kind: ServarrKind, id: string) {
    const existing = this.savedProfiles.get(kind) ?? []
    const target = existing.find((profile) => profile.id === id)
    if (!target) return { ok: false as const, error: notFound('Profile not found.') }
    if (target.isDefault) {
      return {
        ok: false as const,
        error: {
          type: 'default_profile_delete_forbidden',
          message: 'The default profile cannot be deleted. Set another profile as default first.',
          status: 409,
        },
      }
    }

    this.deleteFakeQualityProfile(kind, target.qualityProfileId)

    this.savedProfiles.set(
      kind,
      existing.filter((profile) => profile.id !== id),
    )
    this.persistOnboardingState()

    return { ok: true as const, value: undefined }
  }

  async setDefaultInstanceProfile(kind: ServarrKind, id: string) {
    const existing = this.savedProfiles.get(kind) ?? []
    const target = existing.find((profile) => profile.id === id)
    if (!target) return { ok: false as const, error: notFound('Profile not found.') }

    const next = existing.map((profile) => ({ ...profile, isDefault: profile.id === id }))
    this.savedProfiles.set(kind, next)

    const updatedTarget = next.find((profile) => profile.id === id)!
    this.syncInstanceFromProfile(kind, updatedTarget)
    this.persistOnboardingState()

    return { ok: true as const, value: updatedTarget }
  }

  private getQualityProfilesFor(kind: ServarrKind): QualityProfileRecord[] {
    const existing = this.qualityProfiles.get(kind)
    if (existing) return existing
    const seeded = buildFakeQualityProfiles(kind)
    this.qualityProfiles.set(kind, seeded)
    return seeded
  }

  async listQualityProfiles(kind: ServarrKind) {
    return { ok: true as const, value: this.getQualityProfilesFor(kind) }
  }

  async getQualityProfileSchema(kind: ServarrKind) {
    const qualities = FAKE_QUALITY_PROFILES[kind]
    return {
      ok: true as const,
      value: {
        name: '',
        upgradeAllowed: false,
        cutoff: qualities[0]?.id ?? 1,
        items: qualities.map((quality) => ({
          id: quality.id,
          allowed: false,
          quality: { id: quality.id, name: quality.name },
        })),
      } satisfies QualityProfileRecord,
    }
  }

  private createFakeQualityProfile(
    kind: ServarrKind,
    payload: QualityProfileRecord,
  ): QualityProfileRecord {
    const existing = this.getQualityProfilesFor(kind)
    const nextId = Math.max(0, ...existing.map((profile) => profile.id ?? 0)) + 1
    const created: QualityProfileRecord = { ...payload, id: nextId }
    this.qualityProfiles.set(kind, [...existing, created])
    return created
  }

  private updateFakeQualityProfile(
    kind: ServarrKind,
    id: number,
    payload: QualityProfileRecord,
  ): QualityProfileRecord {
    const existing = this.getQualityProfilesFor(kind)
    const updated: QualityProfileRecord = { ...payload, id }
    this.qualityProfiles.set(
      kind,
      existing.map((profile) => (profile.id === id ? updated : profile)),
    )
    return updated
  }

  private deleteFakeQualityProfile(kind: ServarrKind, id: number): void {
    const existing = this.getQualityProfilesFor(kind)
    this.qualityProfiles.set(
      kind,
      existing.filter((profile) => profile.id !== id),
    )
  }

  private getDownloadClientsFor(kind: ServarrKind): DownloadClientRecord[] {
    const existing = this.downloadClients.get(kind)
    if (existing) return existing
    const seeded = seedDownloadClients(kind)
    this.downloadClients.set(kind, seeded)
    return seeded
  }

  async listDownloadClients(kind: ServarrKind) {
    return { ok: true as const, value: this.getDownloadClientsFor(kind) }
  }

  async getDownloadClientSchema(_kind: ServarrKind) {
    return { ok: true as const, value: FAKE_DOWNLOAD_CLIENT_SCHEMAS }
  }

  async createDownloadClient(kind: ServarrKind, payload: DownloadClientRecord) {
    const existing = this.getDownloadClientsFor(kind)
    const nextId = Math.max(0, ...existing.map((client) => client.id ?? 0)) + 1
    const created: DownloadClientRecord = { ...payload, id: nextId }
    this.downloadClients.set(kind, [...existing, created])
    return { ok: true as const, value: created }
  }

  async updateDownloadClient(kind: ServarrKind, id: number, payload: DownloadClientRecord) {
    const existing = this.getDownloadClientsFor(kind)
    const updated: DownloadClientRecord = { ...payload, id }
    this.downloadClients.set(
      kind,
      existing.map((client) => (client.id === id ? updated : client)),
    )
    return { ok: true as const, value: updated }
  }

  async deleteDownloadClient(kind: ServarrKind, id: number) {
    const existing = this.getDownloadClientsFor(kind)
    this.downloadClients.set(
      kind,
      existing.filter((client) => client.id !== id),
    )
    return { ok: true as const, value: undefined }
  }

  async testDownloadClient(_kind: ServarrKind, _payload: DownloadClientRecord) {
    return { ok: true as const, value: undefined }
  }

  private getIndexersFor(kind: ServarrKind): IndexerRecord[] {
    const existing = this.indexers.get(kind)
    if (existing) return existing
    const seeded = seedIndexers(kind)
    this.indexers.set(kind, seeded)
    return seeded
  }

  async listIndexers(kind: ServarrKind) {
    return { ok: true as const, value: this.getIndexersFor(kind) }
  }

  async getIndexerSchema(_kind: ServarrKind) {
    return { ok: true as const, value: FAKE_INDEXER_SCHEMAS }
  }

  async createIndexer(kind: ServarrKind, payload: IndexerRecord) {
    const existing = this.getIndexersFor(kind)
    const nextId = Math.max(0, ...existing.map((indexer) => indexer.id ?? 0)) + 1
    const created: IndexerRecord = { ...payload, id: nextId }
    this.indexers.set(kind, [...existing, created])
    return { ok: true as const, value: created }
  }

  async updateIndexer(kind: ServarrKind, id: number, payload: IndexerRecord) {
    const existing = this.getIndexersFor(kind)
    const updated: IndexerRecord = { ...payload, id }
    this.indexers.set(
      kind,
      existing.map((indexer) => (indexer.id === id ? updated : indexer)),
    )
    return { ok: true as const, value: updated }
  }

  async deleteIndexer(kind: ServarrKind, id: number) {
    const existing = this.getIndexersFor(kind)
    this.indexers.set(
      kind,
      existing.filter((indexer) => indexer.id !== id),
    )
    return { ok: true as const, value: undefined }
  }

  async testIndexer(_kind: ServarrKind, _payload: IndexerRecord) {
    return { ok: true as const, value: undefined }
  }
}

export const fakeArrConnector = new FakeArrConnector()
