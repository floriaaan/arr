import type { MediaKind } from '../catalog/media-kind'
import type { ExternalId } from '../catalog/external-id'
import type { RequestProgress } from './request-progress'
import type { RequestStatus } from './request-filter'

export interface MediaRequest {
  id: string
  requestedBy: { id: string; email: string | null }
  kind: MediaKind
  externalId: ExternalId
  title: string
  status: RequestStatus
  progress: RequestProgress | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}
