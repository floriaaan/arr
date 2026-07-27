import { HttpClient, toApiError } from './http-client'
import { toPosterUrl } from './poster-url'
import { authenticatedUserSchema, sessionSchema } from './schemas/identity.schema'
import {
  onboardingStatusSchema,
  servarrInstanceDtoSchema,
  instanceProfilesSchema,
  oidcDiscoverySchema,
  effectiveAuthSettingsSchema,
  savedSsoConfigSchema,
} from './schemas/settings.schema'
import { mediaItemDtoSchema, mediaDetailDtoSchema } from './schemas/catalog.schema'
import { mediaRequestDtoSchema } from './schemas/requests.schema'
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
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { InstanceDraft } from '#domain/settings/instance-draft'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId, ExternalIdScheme } from '#domain/catalog/external-id'
import type { MediaItem } from '#domain/catalog/media-item'
import type { MediaDetail } from '#domain/catalog/media-detail'
import type { MediaRequest } from '#domain/requests/media-request'
import type { RequestFilter } from '#domain/requests/request-filter'
import type { OnboardingStatus } from '#domain/settings/onboarding-state'
import type { z } from 'zod'

function toMediaItem(dto: z.infer<typeof mediaItemDtoSchema>): MediaItem {
  return { ...dto, posterUrl: toPosterUrl(dto.posterRef) }
}

function toMediaDetail(dto: z.infer<typeof mediaDetailDtoSchema>): MediaDetail {
  return { ...dto, posterUrl: toPosterUrl(dto.posterRef) }
}

export class HttpArrConnector implements ArrConnector {
  private readonly http: HttpClient

  /** `cookieHeader` is only ever passed server-side (cf. docs/phase-5 decision 3). */
  constructor(cookieHeader?: string) {
    this.http = new HttpClient(cookieHeader)
  }

  async getSession(): Promise<Session> {
    const response = await this.http.get('/api/session')
    return sessionSchema.parse(await response.json())
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<Result<AuthenticatedUser, ApiError>> {
    const response = await this.http.post('/api/auth/sign-in/email', { email, password })
    if (!response.ok) return { ok: false, error: await toApiError(response) }
    const body: unknown = await response.json()
    const user = (body as { user?: unknown }).user
    return { ok: true, value: authenticatedUserSchema.parse(user) }
  }

  async startOidcSignIn(callbackUrl: string): Promise<Result<{ url: string }, ApiError>> {
    const response = await this.http.post('/api/auth/sign-in/oauth2', {
      providerId: 'pocketid',
      callbackURL: callbackUrl,
    })
    if (!response.ok) return { ok: false, error: await toApiError(response) }
    const body = (await response.json()) as { url: string }
    return { ok: true, value: { url: body.url } }
  }

  async signOut(): Promise<void> {
    await this.http.post('/api/auth/sign-out')
  }

  async getOnboardingState(): Promise<{ status: OnboardingStatus }> {
    const response = await this.http.get('/api/onboarding/state')
    const body = (await response.json()) as { state: unknown }
    return { status: onboardingStatusSchema.parse(body.state) }
  }

  async createAdminAccount(
    email: string,
    password: string,
  ): Promise<Result<{ userId: string }, ApiError>> {
    const response = await this.http.post('/api/onboarding/admin', { email, password })
    if (!response.ok) return { ok: false, error: await toApiError(response) }
    return { ok: true, value: (await response.json()) as { userId: string } }
  }

  async testInstanceConnection(
    kind: ServarrKind,
    baseUrl: string,
    apiKey: string,
  ): Promise<ConnectionTestResult> {
    const response = await this.http.post('/api/onboarding/instances/test', {
      kind,
      baseUrl,
      apiKey,
    })
    return this.parseConnectionTestResult(response)
  }

  async fetchInstanceProfiles(kind: ServarrKind, baseUrl: string, apiKey: string) {
    const response = await this.http.post('/api/onboarding/instances/profiles', {
      kind,
      baseUrl,
      apiKey,
    })
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    return { ok: true as const, value: instanceProfilesSchema.parse(await response.json()) }
  }

  async saveOnboardingInstance(kind: ServarrKind, draft: InstanceDraft) {
    const response = await this.http.put(`/api/onboarding/instances/${kind}`, draft)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { instance: unknown }
    return { ok: true as const, value: servarrInstanceDtoSchema.parse(body.instance) }
  }

  async testOidcDiscovery(
    issuerUrl: string,
    clientId: string,
    clientSecret: string,
  ): Promise<OidcTestResult> {
    const response = await this.http.post('/api/onboarding/sso/test', {
      issuerUrl,
      clientId,
      clientSecret,
    })
    return this.parseOidcTestResult(response)
  }

  async saveOnboardingSso(config: OidcConfigInput | null) {
    const response = await this.http.put('/api/onboarding/sso', config)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    return { ok: true as const, value: (await response.json()) as { oidcEnabled: boolean } }
  }

  async completeOnboarding() {
    const response = await this.http.post('/api/onboarding/complete')
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    return { ok: true as const, value: { status: 'completed' as const } }
  }

  async listInstances() {
    const response = await this.http.get('/api/settings/instances')
    const body = (await response.json()) as { instances: unknown[] }
    return body.instances.map((instance) => servarrInstanceDtoSchema.parse(instance))
  }

  async saveInstance(kind: ServarrKind, draft: InstanceDraft) {
    const response = await this.http.put(`/api/settings/instances/${kind}`, draft)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { instance: unknown }
    return { ok: true as const, value: servarrInstanceDtoSchema.parse(body.instance) }
  }

  async deleteInstance(kind: ServarrKind): Promise<void> {
    await this.http.delete(`/api/settings/instances/${kind}`)
  }

  async testSavedInstanceConnection(kind: ServarrKind): Promise<ConnectionTestResult> {
    const response = await this.http.post(`/api/settings/instances/${kind}/test-connection`)
    return this.parseConnectionTestResult(response)
  }

  async getSso() {
    const response = await this.http.get('/api/settings/sso')
    const body = (await response.json()) as { oidc: unknown }
    return savedSsoConfigSchema.parse(body.oidc)
  }

  async updateSso(config: OidcConfigInput | null) {
    const response = await this.http.put('/api/settings/sso', config)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    return { ok: true as const, value: (await response.json()) as { oidcEnabled: boolean } }
  }

  async getEffectiveAuthSettings() {
    const response = await this.http.get('/api/settings/auth')
    return effectiveAuthSettingsSchema.parse(await response.json())
  }

  async searchMedia(kind: MediaKind, term: string): Promise<MediaItem[]> {
    const qs = new URLSearchParams({ kind, term })
    const response = await this.http.get(`/api/catalog/search?${qs.toString()}`)
    const body = (await response.json()) as { results: unknown[] }
    return body.results.map((item) => toMediaItem(mediaItemDtoSchema.parse(item)))
  }

  async getMediaDetail(scheme: ExternalIdScheme, value: string, kind: MediaKind) {
    const qs = new URLSearchParams({ scheme, value, kind })
    const response = await this.http.get(`/api/catalog/detail?${qs.toString()}`)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { detail: unknown }
    return { ok: true as const, value: toMediaDetail(mediaDetailDtoSchema.parse(body.detail)) }
  }

  async listRequests(filter: RequestFilter = {}): Promise<MediaRequest[]> {
    const qs = new URLSearchParams()
    if (filter.status) qs.set('status', filter.status)
    if (filter.kind) qs.set('kind', filter.kind)
    if (filter.requestedByMe) qs.set('requestedBy', 'me')
    const suffix = qs.toString()
    const response = await this.http.get(`/api/requests${suffix ? `?${suffix}` : ''}`)
    const body = (await response.json()) as { requests: unknown[] }
    return body.requests.map((request) => mediaRequestDtoSchema.parse(request))
  }

  async createRequest(kind: MediaKind, externalId: ExternalId, instanceId?: string) {
    const response = await this.http.post('/api/requests', { kind, externalId, instanceId })
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { request: unknown }
    return { ok: true as const, value: mediaRequestDtoSchema.parse(body.request) }
  }

  async getRequest(id: string): Promise<MediaRequest | null> {
    const response = await this.http.get(`/api/requests/${id}`)
    if (response.status === 404) return null
    const body = (await response.json()) as { request: unknown }
    return mediaRequestDtoSchema.parse(body.request)
  }

  async cancelRequest(id: string) {
    const response = await this.http.post(`/api/requests/${id}/cancel`)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { request: unknown }
    return { ok: true as const, value: mediaRequestDtoSchema.parse(body.request) }
  }

  private async parseConnectionTestResult(response: Response): Promise<ConnectionTestResult> {
    if (!response.ok) return { ok: false, error: await toApiError(response) }
    const body = (await response.json()) as
      | { ok: true; detectedVersion: string }
      | { ok: false; error: { type: string; message: string } }
    if (body.ok) return body
    return { ok: false, error: { ...body.error, status: response.status } }
  }

  private async parseOidcTestResult(response: Response): Promise<OidcTestResult> {
    if (!response.ok) return { ok: false, error: await toApiError(response) }
    const body = (await response.json()) as
      { ok: true; discovery: unknown } | { ok: false; error: { type: string; message: string } }
    if (body.ok) return { ok: true, discovery: oidcDiscoverySchema.parse(body.discovery) }
    return { ok: false, error: { ...body.error, status: response.status } }
  }
}
