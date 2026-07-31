import { PosterCard } from './poster-card'
import type { MediaItem } from '#domain/catalog/media-item'

export function PosterGrid({
  items,
  onSelect,
  showKind = false,
}: {
  items: MediaItem[]
  onSelect?: (item: MediaItem) => void
  /** On a mixed list (the unified search palette), the kind has to be readable per card. */
  showKind?: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <PosterCard
          key={`${item.externalId.scheme}:${item.externalId.value}`}
          item={item}
          onSelect={onSelect}
          showKind={showKind}
        />
      ))}
    </div>
  )
}
