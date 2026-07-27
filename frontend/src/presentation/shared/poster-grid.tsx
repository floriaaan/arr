import { PosterCard } from './poster-card'
import type { MediaItem } from '#domain/catalog/media-item'

export function PosterGrid({
  items,
  onSelect,
}: {
  items: MediaItem[]
  onSelect?: (item: MediaItem) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <PosterCard
          key={`${item.externalId.scheme}:${item.externalId.value}`}
          item={item}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
