import type { Result } from '#domain/shared/result'
import type { MediaRequest } from '../media-request.aggregate.js'
import type { RequestEpisode } from '../request-episode.entity.js'
import type { ProvisioningError } from '../provisioning-error.vo.js'

export interface RequestEpisodes {
  /**
   * Empty for a kind that has nothing to unfold (a movie), so callers never
   * have to special-case the kind — cf. docs/phase-6-fiabilite-requests,
   * chantier 5 décision 2.
   */
  list(request: MediaRequest): Promise<Result<RequestEpisode[], ProvisioningError>>
}
