import { placeholderPoster } from '../placeholder-poster'
import type { MediaDetail } from '#domain/catalog/media-detail'

export const albumFixtures: MediaDetail[] = [
  {
    externalId: { scheme: 'musicbrainz', value: 'b84ee12a-09ef-421b-82de-0441a926375b' },
    kind: 'album',
    title: 'The Dark Side of the Moon',
    year: 1973,
    overview: 'Pink Floyd — progressive rock concept album.',
    posterUrl: placeholderPoster('The Dark Side of the Moon', 200),
    alreadyManaged: false,
    genres: ['Progressive Rock'],
  },
  {
    externalId: { scheme: 'musicbrainz', value: '9e1610e9-1de5-4b74-8ca5-6c93a5c19d1c' },
    kind: 'album',
    title: 'Discovery',
    year: 2001,
    overview: 'Daft Punk — electronic/dance album.',
    posterUrl: placeholderPoster('Discovery', 300),
    alreadyManaged: true,
    genres: ['Electronic', 'Dance'],
  },
  {
    externalId: { scheme: 'musicbrainz', value: '3c2a5f0c-8f7e-4a0e-9a3d-0f2c1e8f5a6b' },
    kind: 'album',
    title: 'To Pimp a Butterfly',
    year: 2015,
    overview: 'Kendrick Lamar — hip hop, jazz rap, funk.',
    posterUrl: placeholderPoster('To Pimp a Butterfly', 60),
    alreadyManaged: false,
    genres: ['Hip Hop', 'Jazz Rap'],
  },
]
