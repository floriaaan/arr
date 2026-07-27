import { Badge } from '#presentation/ui/badge'
import { cn } from '#presentation/shared/utils'
import type { MediaItem } from '#domain/catalog/media-item'

export function PosterCard({
  item,
  onSelect,
  className,
}: {
  item: MediaItem
  onSelect?: (item: MediaItem) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      className={cn(
        'group flex flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            className="size-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            No poster
          </div>
        )}
        {item.alreadyManaged ? (
          <Badge className="absolute top-2 right-2" variant="secondary">
            In library
          </Badge>
        ) : null}
      </div>
      <div>
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.year ?? 'Unknown year'}</p>
      </div>
    </button>
  )
}
