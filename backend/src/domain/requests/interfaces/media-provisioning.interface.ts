import type { Result } from '#domain/shared/result'
import type { MediaRequest } from '../media-request.aggregate.js'
import type { ExternalRef } from '../external-ref.vo.js'
import type { ProvisioningError } from '../provisioning-error.vo.js'

/**
 * Implemented per MediaKind by a servarr adapter (Radarr/Sonarr/Lidarr).
 * The Lidarr implementation encapsulates "does the artist already exist,
 * create it if not" internally — this port and its callers never know Lidarr
 * has that extra step.
 */
export interface MediaProvisioning {
  submit(request: MediaRequest): Promise<Result<ExternalRef, ProvisioningError>>
}
