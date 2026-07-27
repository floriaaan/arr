export type ExternalIdScheme = 'tmdb' | 'tvdb' | 'musicbrainz'

export interface ExternalId {
  scheme: ExternalIdScheme
  value: string
}

export function formatExternalId(id: ExternalId): string {
  return `${id.scheme}:${id.value}`
}
