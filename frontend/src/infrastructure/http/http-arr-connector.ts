import { HttpClient, toApiError } from './http-client'
import { toPosterUrl } from './poster-url'
import {
  authenticatedUserSchema,
  sessionSchema,
  listUsersResponseSchema,
  setUserRoleResponseSchema,
} from './schemas/identity.schema'
import {
  onboardingStatusSchema,
  servarrInstanceDtoSchema,
  instanceProfilesSchema,
  instanceProfileDtoSchema,
  qualityProfileRecordSchema,
  oidcDiscoverySchema,
  effectiveAuthSettingsSchema,
  savedSsoConfigSchema,
} from './schemas/settings.schema'
import { mediaItemDtoSchema, mediaDetailDtoSchema } from './schemas/catalog.schema'
import { mediaRequestDtoSchema } from './schemas/requests.schema'
import { libraryItemDtoSchema, calendarEntryDtoSchema } from './schemas/library.schema'
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
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { InstanceDraft } from '#domain/settings/instance-draft'
import type { InstanceProfileDraft } from '#domain/settings/instance-profile'
import type { QualityProfileRecord } from '#domain/settings/quality-profile-record'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId, ExternalIdScheme } from '#domain/catalog/external-id'
import type { MediaItem } from '#domain/catalog/media-item'
import type { MediaDetail } from '#domain/catalog/media-detail'
import type { MediaRequest } from '#domain/requests/media-request'
import type { RequestFilter } from '#domain/requests/request-filter'
import type { OnboardingStatus } from '#domain/settings/onboarding-state'
import type { LibraryItem } from '#domain/library/library-item'
import type { CalendarEntry } from '#domain/calendar/calendar-entry'
import type { z } from 'zod'

function toMediaItem(dto: z.infer<typeof mediaItemDtoSchema>): MediaItem {
  const { posterRef, ...rest } = dto
  return { ...rest, posterUrl: toPosterUrl(posterRef) }
}

function toMediaDetail(dto: z.infer<typeof mediaDetailDtoSchema>): MediaDetail {
  const { posterRef, ...rest } = dto
  return { ...rest, posterUrl: toPosterUrl(posterRef) }
}

function toLibraryItem(dto: z.infer<typeof libraryItemDtoSchema>): LibraryItem {
  const { posterRef, ...rest } = dto
  return { ...rest, posterUrl: toPosterUrl(posterRef) }
}

function toCalendarEntry(dto: z.infer<typeof calendarEntryDtoSchema>): CalendarEntry {
  const { posterRef, ...rest } = dto
  return { ...rest, posterUrl: toPosterUrl(posterRef) }
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

  /** `admin()` plugin route, not one of ours — mounted under `/api/auth/*` (cf. auth.routes.ts). */
  async listUsers(): Promise<UserAccount[]> {
    const response = await this.http.get('/api/auth/admin/list-users')
    const body = (await response.json()) as { users: unknown[] }
    return listUsersResponseSchema.parse(body).users
  }

  async setUserRole(
    userId: string,
    role: UserRole,
  ): Promise<Result<{ user: UserAccount }, ApiError>> {
    const response = await this.http.post('/api/auth/admin/set-role', { userId, role })
    if (!response.ok) return { ok: false, error: await toApiError(response) }
    return { ok: true, value: setUserRoleResponseSchema.parse(await response.json()) }
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

  async testSavedInstanceConnection(
    kind: ServarrKind,
    baseUrl: string,
    apiKey: string,
  ): Promise<ConnectionTestResult> {
    const response = await this.http.post(`/api/settings/instances/${kind}/test-connection`, {
      baseUrl,
      apiKey,
    })
    return this.parseConnectionTestResult(response)
  }

  async fetchSettingsInstanceProfiles(kind: ServarrKind, baseUrl: string, apiKey: string) {
    const response = await this.http.post(`/api/settings/instances/${kind}/profiles`, {
      baseUrl,
      apiKey,
    })
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    return { ok: true as const, value: instanceProfilesSchema.parse(await response.json()) }
  }

  async fetchStoredInstanceProfiles(kind: ServarrKind) {
    const response = await this.http.get(`/api/settings/instances/${kind}/catalog`)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    return { ok: true as const, value: instanceProfilesSchema.parse(await response.json()) }
  }

  async listInstanceProfiles(kind: ServarrKind) {
    const response = await this.http.get(`/api/settings/instances/${kind}/saved-profiles`)
    const body = (await response.json()) as { profiles: unknown[] }
    return body.profiles.map((profile) => instanceProfileDtoSchema.parse(profile))
  }

  async createInstanceProfile(kind: ServarrKind, draft: InstanceProfileDraft) {
    const response = await this.http.post(`/api/settings/instances/${kind}/saved-profiles`, draft)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { profile: unknown }
    return { ok: true as const, value: instanceProfileDtoSchema.parse(body.profile) }
  }

  async updateInstanceProfile(kind: ServarrKind, id: string, draft: InstanceProfileDraft) {
    const response = await this.http.put(
      `/api/settings/instances/${kind}/saved-profiles/${id}`,
      draft,
    )
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { profile: unknown }
    return { ok: true as const, value: instanceProfileDtoSchema.parse(body.profile) }
  }

  async deleteInstanceProfile(kind: ServarrKind, id: string) {
    const response = await this.http.delete(`/api/settings/instances/${kind}/saved-profiles/${id}`)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    return { ok: true as const, value: undefined }
  }

  async setDefaultInstanceProfile(kind: ServarrKind, id: string) {
    const response = await this.http.post(
      `/api/settings/instances/${kind}/saved-profiles/${id}/default`,
    )
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { profile: unknown }
    return { ok: true as const, value: instanceProfileDtoSchema.parse(body.profile) }
  }

  async listQualityProfiles(kind: ServarrKind) {
    const response = await this.http.get(`/api/settings/instances/${kind}/quality-profiles`)
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { qualityProfiles: unknown[] }
    return {
      ok: true as const,
      value: body.qualityProfiles.map((profile) => qualityProfileRecordSchema.parse(profile)),
    }
  }

  async getQualityProfileSchema(kind: ServarrKind) {
    const response = await this.http.get(
      `/api/settings/instances/${kind}/quality-profiles/schema`,
    )
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { qualityProfile: unknown }
    return { ok: true as const, value: qualityProfileRecordSchema.parse(body.qualityProfile) }
  }

  async createQualityProfile(kind: ServarrKind, payload: QualityProfileRecord) {
    const response = await this.http.post(
      `/api/settings/instances/${kind}/quality-profiles`,
      payload,
    )
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { qualityProfile: unknown }
    return { ok: true as const, value: qualityProfileRecordSchema.parse(body.qualityProfile) }
  }

  async updateQualityProfile(kind: ServarrKind, id: number, payload: QualityProfileRecord) {
    const response = await this.http.put(
      `/api/settings/instances/${kind}/quality-profiles/${id}`,
      payload,
    )
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    const body = (await response.json()) as { qualityProfile: unknown }
    return { ok: true as const, value: qualityProfileRecordSchema.parse(body.qualityProfile) }
  }

  async deleteQualityProfile(kind: ServarrKind, id: number) {
    const response = await this.http.delete(
      `/api/settings/instances/${kind}/quality-profiles/${id}`,
    )
    if (!response.ok) return { ok: false as const, error: await toApiError(response) }
    return { ok: true as const, value: undefined }
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
    if (!response.ok) {
      // 409 on this endpoint puts `currentStatus` as a sibling of
      // `type`/`message`, not under `details` like every other error body —
      // read it directly instead of losing it to `toApiError`'s stricter schema.
      const body: unknown = await response.json().catch(() => null)
      const conflict = body as {
        error?: { type?: string; message?: string; currentStatus?: string }
      }
      const error =
        conflict.error?.type === 'not_cancellable'
          ? {
              type: conflict.error.type,
              message: conflict.error.message ?? 'This request cannot be cancelled.',
              details: { currentStatus: conflict.error.currentStatus },
              status: response.status,
            }
          : {
              type: conflict.error?.type ?? 'unknown',
              message: conflict.error?.message ?? `Unexpected response (${response.status})`,
              status: response.status,
            }
      return { ok: false as const, error }
    }
    const body = (await response.json()) as { request: unknown }
    return { ok: true as const, value: mediaRequestDtoSchema.parse(body.request) }
  }

  async listLibrary(kind?: MediaKind): Promise<LibraryItem[]> {
    const qs = kind ? `?${new URLSearchParams({ kind }).toString()}` : ''
    const response = await this.http.get(`/api/library${qs}`)
    const body = (await response.json()) as { items: unknown[] }
    return body.items.map((item) => toLibraryItem(libraryItemDtoSchema.parse(item)))
  }

  async removeLibraryItem(
    externalId: ExternalId,
    deleteFiles: boolean,
  ): Promise<Result<void, ApiError>> {
    const qs = new URLSearchParams({
      scheme: externalId.scheme,
      value: externalId.value,
      deleteFiles: String(deleteFiles),
    })
    const response = await this.http.delete(`/api/library?${qs.toString()}`)
    if (!response.ok) return { ok: false, error: await toApiError(response) }
    return { ok: true, value: undefined }
  }

  async getCalendar(startDate: string, endDate: string): Promise<CalendarEntry[]> {
    const qs = new URLSearchParams({ start: startDate, end: endDate })
    const response = await this.http.get(`/api/calendar?${qs.toString()}`)
    const body = (await response.json()) as { entries: unknown[] }
    return body.entries.map((entry) => toCalendarEntry(calendarEntryDtoSchema.parse(entry)))
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
