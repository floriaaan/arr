import type { RequestStatus } from './request-status.vo.js'
import type { MediaKind } from '#domain/catalog/media-kind.vo'

export interface RequestFilter {
  status?: RequestStatus
  kind?: MediaKind
  requestedBy?: string
}
