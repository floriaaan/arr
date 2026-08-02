import { useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#presentation/ui/dialog'
import { Input } from '#presentation/ui/input'
import { SearchResults } from '#presentation/catalog/search-results'
import { MediaDetailDrawer } from '#presentation/catalog/media-detail-drawer'
import { useDebouncedValue } from './use-debounced-value'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId } from '#domain/catalog/external-id'

/**
 * The app's only way to discover new media (no dedicated `/search` route,
 * cf. docs/phase-5) — open it, type, pick a result. The three kinds are
 * searched together: having to pick one up front only ever hid results the
 * user was looking for (cf. docs/phase-5-quality-of-life/01).
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [term, setTerm] = useState('')
  const debouncedTerm = useDebouncedValue(term, 300)
  const [selected, setSelected] = useState<{ externalId: ExternalId; kind: MediaKind } | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Search the catalog</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search movies, series and albums…"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="pl-9"
            />
          </div>

          <SearchResults
            term={debouncedTerm}
            /* The kind now comes from the picked result rather than a tab —
               which is what used to make "open a series while the Movies tab
               is active" impossible. */
            onSelect={(item) => setSelected({ externalId: item.externalId, kind: item.kind })}
          />
        </DialogContent>
      </Dialog>

      <MediaDetailDrawer
        externalId={selected?.externalId ?? null}
        kind={selected?.kind ?? 'movie'}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelected(null)
        }}
      />
    </>
  )
}
