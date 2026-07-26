export type MediaKind = 'movie' | 'series' | 'album'

export const MediaKinds = {
  Movie: 'movie',
  Series: 'series',
  Album: 'album',
} as const satisfies Record<string, MediaKind>
