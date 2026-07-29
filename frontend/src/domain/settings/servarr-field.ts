/**
 * One entry of a download client / indexer's dynamic `fields[]` — shape
 * varies by `implementation` (host/port for qBittorrent, baseUrl/apiKey for
 * a Torznab indexer, etc.), so this is deliberately a passthrough record
 * rather than a per-implementation type. Mirrors what Radarr/Sonarr/Lidarr's
 * own `/downloadclient` and `/indexer` endpoints return.
 */
export type ServarrField = Record<string, unknown> & {
  name: string
  label?: string
  value?: unknown
  type?: string
  helpText?: string
  advanced?: boolean
  privacy?: 'normal' | 'password' | 'apiKey'
  selectOptions?: Array<{ value: number | string; name: string }>
}
