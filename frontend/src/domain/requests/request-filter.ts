import type { MediaKind } from '../catalog/media-kind'

export type RequestStatus =
  'pending' | 'submitted' | 'downloading' | 'importing' | 'available' | 'failed' | 'cancelled'

export const ACTIVE_REQUEST_STATUSES: readonly RequestStatus[] = [
  'submitted',
  'downloading',
  'importing',
]

export interface RequestFilter {
  status?: RequestStatus
  kind?: MediaKind
  requestedByMe?: boolean
}
