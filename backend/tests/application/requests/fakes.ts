import { Result } from '#domain/shared/result'
import type { Clock } from '#domain/shared/clock.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { MediaItem } from '#domain/catalog/media-item.entity'
import type { MediaDetail } from '#domain/catalog/media-detail.entity'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { RequestFilter } from '#domain/requests/request-filter.vo'
import type { MediaProvisioning } from '#domain/requests/interfaces/media-provisioning.interface'
import type { ExternalRef } from '#domain/requests/external-ref.vo'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'
import type { RequestApprovalSettingsRepository } from '#domain/requests/interfaces/request-approval-settings-repository.interface'
import type { UserRequestPreferencesRepository } from '#domain/requests/interfaces/user-request-preferences-repository.interface'
import { RequestApprovalSettings } from '#domain/requests/request-approval-settings.aggregate'
import type {
  DownloadProgress,
  ProgressSnapshot,
} from '#domain/requests/interfaces/download-progress.interface'

export class FixedClock implements Clock {
  constructor(private readonly fixedNow: Date = new Date('2026-01-01T00:00:00Z')) {}

  now(): Date {
    return this.fixedNow
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0

  next(): string {
    this.counter += 1
    return `id-${this.counter}`
  }
}

export class FakeMediaLookup implements MediaLookup {
  detailResult: MediaDetail | null = null

  async search(_kind: MediaKind, _term: string): Promise<MediaItem[]> {
    return []
  }

  async detail(_id: ExternalId): Promise<MediaDetail> {
    if (!this.detailResult) throw new Error('FakeMediaLookup.detailResult was not set')
    return this.detailResult
  }
}

export class InMemoryServarrInstanceRepository implements ServarrInstanceRepository {
  private byId = new Map<string, ServarrInstance>()

  async findAll(): Promise<ServarrInstance[]> {
    return [...this.byId.values()]
  }

  async findByKind(kind: ServarrKind): Promise<ServarrInstance | null> {
    return [...this.byId.values()].find((instance) => instance.kind === kind) ?? null
  }

  async findById(id: string): Promise<ServarrInstance | null> {
    return this.byId.get(id) ?? null
  }

  async findActive(): Promise<ServarrInstance[]> {
    return [...this.byId.values()].filter((instance) => instance.enabled)
  }

  async save(instance: ServarrInstance): Promise<void> {
    this.byId.set(instance.id, instance)
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id)
  }
}

export class InMemoryMediaRequestRepository implements MediaRequestRepository {
  private byId = new Map<string, MediaRequest>()

  async findById(id: string): Promise<MediaRequest | null> {
    return this.byId.get(id) ?? null
  }

  async findByFilter(filter: RequestFilter): Promise<MediaRequest[]> {
    return [...this.byId.values()].filter((request) => {
      if (filter.status && request.status !== filter.status) return false
      if (filter.kind && request.kind !== filter.kind) return false
      if (filter.requestedBy && request.requestedBy !== filter.requestedBy) return false
      if (
        filter.requiresApproval !== undefined &&
        request.requiresApproval !== filter.requiresApproval
      )
        return false
      return true
    })
  }

  async findByExternalId(kind: MediaKind, externalId: ExternalId): Promise<MediaRequest | null> {
    // Mirrors `LIVE_STATUSES` in the Lucid repository: a cancelled or failed
    // request must not keep a title blocked (cf. docs/phase-6-fiabilite-requests).
    const live = new Set(['pending', 'submitted', 'downloading', 'importing', 'available'])
    return (
      [...this.byId.values()].find(
        (request) =>
          request.kind === kind &&
          request.externalId.equals(externalId) &&
          live.has(request.status),
      ) ?? null
    )
  }

  async save(request: MediaRequest): Promise<void> {
    this.byId.set(request.id, request)
  }

  async findActiveWithExternalRef(): Promise<MediaRequest[]> {
    const active = new Set(['submitted', 'downloading', 'importing'])
    return [...this.byId.values()].filter(
      (request) => active.has(request.status) && request.externalRef !== null,
    )
  }
}

export class FakeMediaProvisioning implements MediaProvisioning {
  nextResult: Result<ExternalRef, ProvisioningError> | null = null
  /** Set to make `cancel()` report the *arr refusing — the request must still cancel. */
  cancelResult: Result<void, ProvisioningError> = Result.ok(undefined)
  cancelledRequestIds: string[] = []

  async submit(_request: MediaRequest): Promise<Result<ExternalRef, ProvisioningError>> {
    if (!this.nextResult) throw new Error('FakeMediaProvisioning.nextResult was not set')
    return this.nextResult
  }

  async cancel(request: MediaRequest): Promise<Result<void, ProvisioningError>> {
    this.cancelledRequestIds.push(request.id)
    return this.cancelResult
  }
}

export class InMemoryRequestApprovalSettingsRepository implements RequestApprovalSettingsRepository {
  private settings = RequestApprovalSettings.create('settings-1')

  async get(): Promise<RequestApprovalSettings> {
    return this.settings
  }

  async save(settings: RequestApprovalSettings): Promise<void> {
    this.settings = settings
  }
}

export class InMemoryUserRequestPreferencesRepository implements UserRequestPreferencesRepository {
  private byUserId = new Map<string, boolean | null>()

  async getAutoApprove(userId: string): Promise<boolean | null> {
    return this.byUserId.get(userId) ?? null
  }

  async setAutoApprove(userId: string, autoApprove: boolean | null): Promise<void> {
    this.byUserId.set(userId, autoApprove)
  }

  async listAll(): Promise<Record<string, boolean | null>> {
    return Object.fromEntries(this.byUserId.entries())
  }
}

export class FakeDownloadProgress implements DownloadProgress {
  snapshots: ProgressSnapshot[] = []

  async fetchProgress(_refs: ExternalRef[]): Promise<ProgressSnapshot[]> {
    return this.snapshots
  }
}
