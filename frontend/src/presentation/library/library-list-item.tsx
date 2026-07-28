import { Eye, EyeOff } from 'lucide-react'
import { Badge } from '#presentation/ui/badge'
import { cn } from '#presentation/shared/utils.ts'
import { MEDIA_KIND_ICONS } from '#presentation/shared/media-kind-icons'
import { formatSize } from '#presentation/shared/format-size'
import type { LibraryItem } from '#domain/library/library-item'

export function LibraryListItem({ item, onSelect }: { item: LibraryItem; onSelect?: () => void }) {
  const KindIcon = MEDIA_KIND_ICONS[item.kind]

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      <span title={item.monitored ? 'Monitored' : 'Unmonitored'} className="shrink-0 text-muted-foreground">
        {item.monitored ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </span>

      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
        {formatSize(item.sizeOnDiskBytes)}
      </span>

      <Badge
        variant="outline"
        className={cn('shrink-0', item.hasFile ? '' : 'border-destructive text-destructive')}
      >
        {item.hasFile ? 'Downloaded' : 'Missing'}
      </Badge>
    </button>
  )
}
