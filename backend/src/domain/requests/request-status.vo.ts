export type RequestStatus =
  'pending' | 'submitted' | 'downloading' | 'importing' | 'available' | 'failed' | 'cancelled'

export const RequestStatuses = {
  Pending: 'pending',
  Submitted: 'submitted',
  Downloading: 'downloading',
  Importing: 'importing',
  Available: 'available',
  Failed: 'failed',
  Cancelled: 'cancelled',
} as const satisfies Record<string, RequestStatus>
