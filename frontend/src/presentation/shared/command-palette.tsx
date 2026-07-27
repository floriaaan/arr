import { useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#presentation/ui/dialog'
import { Input } from '#presentation/ui/input'
import { Tabs, TabsList, TabsTrigger } from '#presentation/ui/tabs'
import { SearchResults } from '#presentation/catalog/search-results'
import { MediaDetailDrawer } from '#presentation/catalog/media-detail-drawer'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId } from '#domain/catalog/external-id'

/**
 * The app's only way to discover new media (no dedicated `/search` route,
 * cf. docs/phase-5) — open it, pick a kind, type, pick a result.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [kind, setKind] = useState<MediaKind>('movie')
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<ExternalId | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Search the catalog</DialogTitle>
          </DialogHeader>

          <Tabs value={kind} onValueChange={(value) => setKind(value as MediaKind)}>
            <TabsList>
              <TabsTrigger value="movie">Movies</TabsTrigger>
              <TabsTrigger value="series">Series</TabsTrigger>
              <TabsTrigger value="album">Albums</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder={`Search ${kind}s…`}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="pl-9"
            />
          </div>

          <SearchResults
            kind={kind}
            term={term}
            onSelect={(item) => setSelected(item.externalId)}
          />
        </DialogContent>
      </Dialog>

      <MediaDetailDrawer
        externalId={selected}
        kind={kind}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelected(null)
        }}
      />
    </>
  )
}
