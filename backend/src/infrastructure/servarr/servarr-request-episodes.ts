import { Result } from '#domain/shared/result'
import { type ServarrRegistry } from './servarr-registry.js'
import type { RequestEpisodes } from '#domain/requests/interfaces/request-episodes.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { RequestEpisode } from '#domain/requests/request-episode.entity'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'

export class ServarrRequestEpisodes implements RequestEpisodes {
  constructor(private readonly registry: ServarrRegistry) {}

  async list(request: MediaRequest): Promise<Result<RequestEpisode[], ProvisioningError>> {
    // Nothing was ever submitted, so there is nothing to unfold yet.
    const remoteId = request.externalRef?.remoteId
    if (!remoteId) return Result.ok([])

    const adapter = await this.registry.resolveByKind(request.kind)
    if (!adapter) {
      return Result.err({
        type: 'instance_unavailable',
        message: `No active instance for ${request.kind}`,
      })
    }

    try {
      return Result.ok(await adapter.listEpisodes(remoteId))
    } catch (error) {
      return Result.err({
        type: 'instance_unavailable',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
