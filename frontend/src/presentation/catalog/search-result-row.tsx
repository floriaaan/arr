import { Badge } from '#presentation/ui/badge'
import { MEDIA_KIND_ICONS } from '#presentation/shared/media-kind-icons'
import type { MediaItem } from '#domain/catalog/media-item'

/**
 * Mirrors `library/library-list-item.tsx` — same row geometry, adapted to a
 * `MediaItem`. The palette dropped its poster grid for this: a mixed list of
 * movies, series and albums reads better as rows, and it survives a phone
 * viewport without extra work.
 */
export function SearchResultRow({
  item,
  onSelect,
}: {
  item: MediaItem
  onSelect?: (item: MediaItem) => void
}) {
  const KindIcon = MEDIA_KIND_ICONS[item.kind]

  return (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      className="tap-scale flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="relative aspect-[2/3] w-9 shrink-0 overflow-hidden rounded bg-muted">
        {item.posterUrl ? (
          <img src={item.posterUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <KindIcon className="size-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">{item.year ?? 'Unknown year'}</p>
      </div>

      <KindIcon className="size-4 shrink-0 text-muted-foreground" />
      {item.alreadyManaged ? (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          In library
        </Badge>
      ) : null}
    </button>
  )
}
