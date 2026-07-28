import { Badge } from '#presentation/ui/badge'
import type { LibraryItem } from '#domain/library/library-item'

function formatSize(bytes: number): string {
  if (bytes <= 0) return '—'
  const gb = bytes / 1_000_000_000
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1_000_000).toFixed(0)} MB`
}

export function LibraryCard({ item, onSelect }: { item: LibraryItem; onSelect?: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <Badge className="absolute top-2 right-2" variant={item.hasFile ? 'default' : 'outline'}>
          {item.hasFile ? 'Downloaded' : 'Missing'}
        </Badge>
      </div>
      <div>
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {item.year ?? 'Unknown year'} · {formatSize(item.sizeOnDiskBytes)}
        </p>
      </div>
    </button>
  )
}
