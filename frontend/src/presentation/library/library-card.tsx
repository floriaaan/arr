import { Badge } from '#presentation/ui/badge'
import { cn } from '#presentation/shared/utils.ts'
import { MEDIA_KIND_ICONS } from '#presentation/shared/media-kind-icons'
import { formatSize } from '#presentation/shared/format-size'
import type { LibraryItem } from '#domain/library/library-item'

export function LibraryCard({ item, onSelect }: { item: LibraryItem; onSelect?: () => void }) {
  const KindIcon = MEDIA_KIND_ICONS[item.kind]

  return (
    <button
      type="button"
      onClick={onSelect}
      className="tap-scale group flex flex-col gap-2 rounded-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-none bg-muted">
        {item.posterUrl ? (
          item.kind === 'album' ? (
            <>
              <img
                src={item.posterUrl}
                alt=""
                aria-hidden="true"
                className="size-full scale-110 object-cover blur-xl"
                loading="lazy"
              />
              <img
                src={item.posterUrl}
                alt={item.title}
                className="absolute inset-0 m-auto aspect-square w-[calc(100%-1.5rem)] rounded-none object-cover shadow-md transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </>
          ) : (
            <img
              src={item.posterUrl}
              alt={item.title}
              className="size-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          )
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            No poster
          </div>
        )}
        <div className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-none bg-black/60 text-white backdrop-blur-sm">
          <KindIcon className="size-3.5" />
        </div>
        <Badge
          className={cn(
            'absolute top-2 right-2 border-0 shadow-sm',
            item.hasFile ? 'bg-black/60 text-white backdrop-blur-sm' : 'bg-destructive text-white',
          )}
        >
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
