import type { Result } from '#domain/shared/result'
import type { MediaItem } from '#domain/catalog/media-item.entity'
import type { MediaDetail } from '#domain/catalog/media-detail.entity'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import type { ExternalRef } from '#domain/requests/external-ref.vo'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'
import type { ProgressSnapshot } from '#domain/requests/interfaces/download-progress.interface'

/**
 * Internal ACL contract — never exposed outside infrastructure/servarr.
 * Each of Radarr/Sonarr/Lidarr's adapter implements this once; the registry
 * and the three facade classes (ServarrMediaLookup, ServarrMediaProvisioning,
 * ServarrDownloadProgress) are what actually implement the domain ports.
 */
export interface ServarrKindAdapter {
  search(term: string): Promise<MediaItem[]>
  detail(externalId: ExternalId): Promise<MediaDetail>
  submit(request: MediaRequest): Promise<Result<ExternalRef, ProvisioningError>>
  fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]>
}
