import type { MediaItem } from './media-item'

/** 0 = exact title, 1 = starts with, 2 = contains, 3 = matched on something else. */
function matchRank(title: string, term: string): number {
  const normalizedTitle = title.trim().toLowerCase()
  const normalizedTerm = term.trim().toLowerCase()

  if (normalizedTerm === '') return 3
  if (normalizedTitle === normalizedTerm) return 0
  if (normalizedTitle.startsWith(normalizedTerm)) return 1
  if (normalizedTitle.includes(normalizedTerm)) return 2
  return 3
}

/**
 * Merges the per-kind result lists of the unified search palette into one.
 *
 * Plain concatenation would put every movie ahead of everything else, burying
 * an exactly-matching series under unrelated films. Sorting by how well the
 * title matches puts the thing the user typed first, whatever its kind; ties
 * go to the most recent, then to the original per-kind order so the output
 * stays deterministic.
 */
export function rankSearchResults(term: string, groups: MediaItem[][]): MediaItem[] {
  return groups
    .flatMap((items, groupIndex) =>
      items.map((item, indexInGroup) => ({ item, groupIndex, indexInGroup })),
    )
    .sort((a, b) => {
      const rankDelta = matchRank(a.item.title, term) - matchRank(b.item.title, term)
      if (rankDelta !== 0) return rankDelta

      const yearDelta = (b.item.year ?? 0) - (a.item.year ?? 0)
      if (yearDelta !== 0) return yearDelta

      return a.groupIndex - b.groupIndex || a.indexInGroup - b.indexInGroup
    })
    .map((entry) => entry.item)
}
