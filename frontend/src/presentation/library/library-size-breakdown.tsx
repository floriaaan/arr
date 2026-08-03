import { MEDIA_KIND_ICONS } from '#presentation/shared/media-kind-icons'
import { formatSize } from '#presentation/shared/format-size'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { LibraryItem } from '#domain/library/library-item'

const KIND_ORDER: readonly MediaKind[] = ['movie', 'series', 'album']

const KIND_META: Record<MediaKind, { label: string; barClass: string; swatchClass: string }> = {
  movie: { label: 'Movies', barClass: 'bg-chart-1', swatchClass: 'bg-chart-1' },
  series: { label: 'Series', barClass: 'bg-chart-2', swatchClass: 'bg-chart-2' },
  album: { label: 'Music', barClass: 'bg-chart-3', swatchClass: 'bg-chart-3' },
}

export function LibrarySizeBreakdown({ items }: { items: LibraryItem[] }) {
  const byKind = KIND_ORDER.map((kind) => {
    const kindItems = items.filter((item) => item.kind === kind)
    const bytes = kindItems.reduce((sum, item) => sum + item.sizeOnDiskBytes, 0)
    return { kind, count: kindItems.length, bytes }
  })
  const totalBytes = byKind.reduce((sum, entry) => sum + entry.bytes, 0)

  if (totalBytes === 0) return null

  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Storage used</p>
        <p className="text-sm text-muted-foreground">{formatSize(totalBytes)} total</p>
      </div>

      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {byKind
          .filter((entry) => entry.bytes > 0)
          .map((entry) => (
            <div
              key={entry.kind}
              className={`h-full first:rounded-l-full last:rounded-r-full ${KIND_META[entry.kind].barClass}`}
              style={{ width: `${(entry.bytes / totalBytes) * 100}%` }}
              title={`${KIND_META[entry.kind].label}: ${formatSize(entry.bytes)} (${Math.round((entry.bytes / totalBytes) * 100)}%)`}
            />
          ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {byKind.map((entry) => {
          const KindIcon = MEDIA_KIND_ICONS[entry.kind]
          const meta = KIND_META[entry.kind]
          return (
            <div
              key={entry.kind}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className={`size-2 shrink-0 rounded-full ${meta.swatchClass}`} />
              <KindIcon className="size-3.5" />
              <span>{meta.label}</span>
              <span className="font-medium text-foreground">{formatSize(entry.bytes)}</span>
              <span>
                ({entry.count} item{entry.count === 1 ? '' : 's'})
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
