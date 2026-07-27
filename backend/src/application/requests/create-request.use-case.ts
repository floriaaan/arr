import type { UseCase } from '#application/shared/use-case'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaProvisioning } from '#domain/requests/interfaces/media-provisioning.interface'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { Clock } from '#domain/shared/clock.interface'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { ExternalIdScheme } from '#domain/catalog/external-id.vo'
import type { ValidationError } from '#domain/shared/validation-error'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'
import { Result } from '#domain/shared/result'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { MediaRequest } from '#domain/requests/media-request.aggregate'

export interface CreateRequestInput {
  requestedBy: string
  kind: MediaKind
  externalId: { scheme: ExternalIdScheme; value: string }
  instanceId?: string
}

const SERVARR_KIND_BY_MEDIA_KIND: Record<MediaKind, ServarrKind> = {
  movie: 'radarr',
  series: 'sonarr',
  album: 'lidarr',
}

export type CreateRequestError =
  | ValidationError
  | 'already_requested'
  | 'already_managed'
  | 'no_active_instance'
  | 'instance_not_found'
  | ProvisioningError

export class CreateRequest implements UseCase<
  CreateRequestInput,
  Result<MediaRequest, CreateRequestError>
> {
  constructor(
    private readonly repository: MediaRequestRepository,
    private readonly provisioning: MediaProvisioning,
    private readonly lookup: MediaLookup,
    private readonly instanceRepository: ServarrInstanceRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateRequestInput): Promise<Result<MediaRequest, CreateRequestError>> {
    const externalId = ExternalId.create(input.externalId.scheme, input.externalId.value)
    if (!externalId.ok) return externalId

    const existing = await this.repository.findByExternalId(input.kind, externalId.value)
    if (existing) return Result.err('already_requested')

    const instance = await this.resolveInstance(input.kind, input.instanceId)
    if (!instance.ok) return instance

    const detail = await this.lookup.detail(externalId.value)
    if (detail.alreadyManaged) return Result.err('already_managed')

    const request = MediaRequest.request(
      this.idGenerator.next(),
      {
        requestedBy: input.requestedBy,
        kind: input.kind,
        externalId: externalId.value,
        title: detail.title,
        instanceId: instance.value,
      },
      this.clock.now(),
    )
    await this.repository.save(request)

    const provisioned = await this.provisioning.submit(request)
    if (!provisioned.ok) {
      request.fail(provisioned.error.message, this.clock.now())
      await this.repository.save(request)
      return provisioned
    }

    request.submit(provisioned.value, this.clock.now())
    await this.repository.save(request)
    return Result.ok(request)
  }

  private async resolveInstance(
    kind: MediaKind,
    instanceId: string | undefined,
  ): Promise<Result<string, 'no_active_instance' | 'instance_not_found'>> {
    const servarrKind = SERVARR_KIND_BY_MEDIA_KIND[kind]

    if (instanceId) {
      const instance = await this.instanceRepository.findById(instanceId)
      if (!instance || instance.kind !== servarrKind || !instance.enabled) {
        return Result.err('instance_not_found')
      }
      return Result.ok(instance.id)
    }

    const activeInstances = await this.instanceRepository.findActive()
    const [first] = activeInstances.filter((candidate) => candidate.kind === servarrKind)
    if (!first) return Result.err('no_active_instance')
    return Result.ok(first.id)
  }
}
