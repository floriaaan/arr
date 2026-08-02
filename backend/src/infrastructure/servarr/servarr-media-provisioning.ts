import { type ServarrRegistry } from './servarr-registry.js'
import type { MediaProvisioning } from '#domain/requests/interfaces/media-provisioning.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { ExternalRef } from '#domain/requests/external-ref.vo'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'
import { Result } from '#domain/shared/result'

export class ServarrMediaProvisioning implements MediaProvisioning {
  constructor(private readonly registry: ServarrRegistry) {}

  async submit(request: MediaRequest): Promise<Result<ExternalRef, ProvisioningError>> {
    const adapter = await this.registry.resolveByKind(request.kind)
    if (!adapter) {
      return Result.err({
        type: 'instance_unavailable',
        message: `No active instance for ${request.kind}`,
      })
    }
    return adapter.submit(request)
  }

  async cancel(request: MediaRequest): Promise<Result<void, ProvisioningError>> {
    const adapter = await this.registry.resolveByKind(request.kind)
    if (!adapter) {
      return Result.err({
        type: 'instance_unavailable',
        message: `No active instance for ${request.kind}`,
      })
    }
    return adapter.cancel(request)
  }
}
