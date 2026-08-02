export type RequestOrigin = 'manual' | 'watchlist'

export const RequestOrigins = {
  Manual: 'manual',
  Watchlist: 'watchlist',
} as const satisfies Record<string, RequestOrigin>
