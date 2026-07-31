import { useMemo } from 'react'
import { useSearchMedia } from '#application/catalog/search-media.query'
import { rankSearchResults } from '#domain/catalog/rank-search-results'
import { PosterGrid } from '#presentation/shared/poster-grid'
import { EmptyState } from '#presentation/shared/empty-state'
import { ErrorState } from '#presentation/shared/error-state'
import { Skeleton } from '#presentation/ui/skeleton'
import type { MediaItem } from '#domain/catalog/media-item'

/**
 * Searches the three kinds at once — there is no kind tab to pick before
 * typing anymore (cf. docs/phase-5-quality-of-life/01). Three fixed hooks
 * rather than a loop, so the hook order never varies; the per-kind query keys
 * are unchanged and nothing had to move in `application/`.
 */
export function SearchResults({
  term,
  onSelect,
}: {
  term: string
  onSelect: (item: MediaItem) => void
}) {
  const movies = useSearchMedia('movie', term)
  const series = useSearchMedia('series', term)
  const albums = useSearchMedia('album', term)
  const queries = [movies, series, albums]

  const items = useMemo(
    () => rankSearchResults(term, [movies.data ?? [], series.data ?? [], albums.data ?? []]),
    [term, movies.data, series.data, albums.data],
  )

  if (term.trim().length === 0) {
    return (
      <EmptyState title="Start typing to search" description="Movies, series and albums at once." />
    )
  }

  if (queries.some((query) => query.isLoading)) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="aspect-[2/3] w-full" />
        ))}
      </div>
    )
  }

  // Only a total failure is an error: one *arr being down must not hide what
  // the other two found — same partial-aggregation rule as `GET /api/calendar`.
  if (queries.every((query) => query.isError)) {
    return (
      <ErrorState
        message="Could not search the catalog."
        onRetry={() => queries.forEach((query) => void query.refetch())}
      />
    )
  }

  if (items.length === 0) {
    return <EmptyState title="No results" description={`Nothing matches "${term}".`} />
  }

  return <PosterGrid items={items} onSelect={onSelect} showKind />
}
