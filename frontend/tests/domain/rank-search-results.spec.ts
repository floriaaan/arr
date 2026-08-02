import { describe, test, expect } from 'vitest'
import { rankSearchResults } from '#domain/catalog/rank-search-results'
import type { MediaItem } from '#domain/catalog/media-item'
import type { MediaKind } from '#domain/catalog/media-kind'

function anItem(title: string, kind: MediaKind, year: number | null = 2020): MediaItem {
  return {
    externalId: { scheme: 'tmdb', value: `${kind}-${title}` },
    kind,
    title,
    year,
    overview: '',
    posterUrl: null,
    alreadyManaged: false,
  }
}

describe('rankSearchResults', () => {
  test('puts an exact title first, whatever its kind', () => {
    const movies = [anItem('Severance Package', 'movie'), anItem('Severed', 'movie')]
    const series = [anItem('Severance', 'series')]

    const ranked = rankSearchResults('severance', [movies, series, []])

    expect(ranked[0]?.title).toBe('Severance')
    expect(ranked[0]?.kind).toBe('series')
  })

  test('orders by match quality: exact, prefix, contains, rest', () => {
    const items = [
      anItem('The Dune Chronicles', 'movie'),
      anItem('Dune: Part Two', 'movie'),
      anItem('Dune', 'movie'),
      anItem('Sandworms', 'movie'),
    ]

    const ranked = rankSearchResults('dune', [items, [], []])

    expect(ranked.map((item) => item.title)).toEqual([
      'Dune',
      'Dune: Part Two',
      'The Dune Chronicles',
      'Sandworms',
    ])
  })

  test('breaks ties on the most recent year', () => {
    const movies = [anItem('Dune', 'movie', 1984)]
    const series = [anItem('Dune', 'series', 2021)]

    const ranked = rankSearchResults('dune', [movies, series, []])

    expect(ranked.map((item) => item.year)).toEqual([2021, 1984])
  })

  test('is deterministic when rank and year both tie', () => {
    const movies = [anItem('Same', 'movie'), anItem('Same Two', 'movie')]
    const albums = [anItem('Same', 'album')]

    const ranked = rankSearchResults('same', [movies, [], albums])

    // Group order, then in-group order — the movie group comes first.
    expect(ranked.map((item) => item.kind)).toEqual(['movie', 'album', 'movie'])
  })

  test('keeps every item of every group', () => {
    const ranked = rankSearchResults('x', [
      [anItem('a', 'movie')],
      [anItem('b', 'series')],
      [anItem('c', 'album')],
    ])

    expect(ranked).toHaveLength(3)
  })

  test('handles empty groups and an empty term', () => {
    expect(rankSearchResults('', [[], [], []])).toEqual([])
    expect(rankSearchResults('', [[anItem('a', 'movie')], [], []])).toHaveLength(1)
  })
})
