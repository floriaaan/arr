import { useSearchMedia } from '#application/catalog/search-media.query'
import { PosterGrid } from '#presentation/shared/poster-grid'
import { EmptyState } from '#presentation/shared/empty-state'
import { ErrorState } from '#presentation/shared/error-state'
import { Skeleton } from '#presentation/ui/skeleton'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { MediaItem } from '#domain/catalog/media-item'

export function SearchResults({
  kind,
  term,
  onSelect,
}: {
  kind: MediaKind
  term: string
  onSelect: (item: MediaItem) => void
}) {
  const { data, isLoading, isError, refetch } = useSearchMedia(kind, term)

  if (term.trim().length === 0) {
    return <EmptyState title="Start typing to search" description={`Search for a ${kind}.`} />
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="aspect-[2/3] w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <ErrorState message="Could not search the catalog." onRetry={() => refetch()} />
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No results" description={`Nothing matches "${term}".`} />
  }

  return <PosterGrid items={data} onSelect={onSelect} />
}
