import { useMemo, useState } from 'react'
import { Clapperboard, LayoutGrid, List, ListChecks, Music, Search, Tv } from 'lucide-react'
import { useLibrary } from '#application/library/library.query'
import { LibraryCard } from './library-card'
import { LibraryListItem } from './library-list-item'
import { LibrarySizeBreakdown } from './library-size-breakdown'
import { EmptyState } from '#presentation/shared/empty-state'
import { ErrorState } from '#presentation/shared/error-state'
import { Skeleton } from '#presentation/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '#presentation/ui/tabs'
import { Input } from '#presentation/ui/input'
import { Button } from '#presentation/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#presentation/ui/select'
import { cn } from '#presentation/shared/utils'
import { useDebouncedValue } from '#presentation/shared/use-debounced-value'
import { MediaDetailDrawer } from '#presentation/catalog/media-detail-drawer'
import type { LibraryItem } from '#domain/library/library-item'

const KIND_TABS = [
  { value: 'all', label: 'All', icon: ListChecks },
  { value: 'movie', label: 'Movies', icon: Clapperboard },
  { value: 'series', label: 'Series', icon: Tv },
  { value: 'album', label: 'Music', icon: Music },
] as const
type KindTab = (typeof KIND_TABS)[number]['value']

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'downloaded', label: 'Downloaded' },
  { value: 'missing', label: 'Missing' },
] as const
type Availability = (typeof AVAILABILITY_OPTIONS)[number]['value']

const MONITORED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'monitored', label: 'Monitored' },
  { value: 'unmonitored', label: 'Unmonitored' },
] as const
type Monitored = (typeof MONITORED_OPTIONS)[number]['value']

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title (A–Z)' },
  { value: 'title-desc', label: 'Title (Z–A)' },
  { value: 'year-desc', label: 'Year (newest)' },
  { value: 'year-asc', label: 'Year (oldest)' },
  { value: 'size-desc', label: 'Size (largest)' },
  { value: 'size-asc', label: 'Size (smallest)' },
] as const
type Sort = (typeof SORT_OPTIONS)[number]['value']

type View = 'grid' | 'list'

function sortItems(items: LibraryItem[], sort: Sort): LibraryItem[] {
  const sorted = [...items]
  switch (sort) {
    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'title-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'year-desc':
      return sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    case 'year-asc':
      return sorted.sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    case 'size-desc':
      return sorted.sort((a, b) => b.sizeOnDiskBytes - a.sizeOnDiskBytes)
    case 'size-asc':
      return sorted.sort((a, b) => a.sizeOnDiskBytes - b.sizeOnDiskBytes)
  }
}

export function LibraryGrid() {
  const { data, isLoading, isError, refetch } = useLibrary()
  const [selected, setSelected] = useState<LibraryItem | null>(null)

  const [kindTab, setKindTab] = useState<KindTab>('all')
  const [view, setView] = useState<View>('grid')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [availability, setAvailability] = useState<Availability>('all')
  const [monitored, setMonitored] = useState<Monitored>('all')
  const [sort, setSort] = useState<Sort>('title-asc')

  const filtered = useMemo(() => {
    if (!data) return data
    const term = debouncedSearch.trim().toLowerCase()
    const items = data.filter((item) => {
      if (kindTab !== 'all' && item.kind !== kindTab) return false
      if (term && !item.title.toLowerCase().includes(term)) return false
      if (availability === 'downloaded' && !item.hasFile) return false
      if (availability === 'missing' && item.hasFile) return false
      if (monitored === 'monitored' && !item.monitored) return false
      if (monitored === 'unmonitored' && item.monitored) return false
      return true
    })
    return sortItems(items, sort)
  }, [data, kindTab, debouncedSearch, availability, monitored, sort])

  return (
    <div className="space-y-6">
      {data && data.length > 0 ? <LibrarySizeBreakdown items={data} /> : null}

      <Tabs value={kindTab} onValueChange={(value) => setKindTab(value as KindTab)}>
        <TabsList>
          {KIND_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              <tab.icon className="size-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-none border p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('size-7', view === 'grid' && 'bg-accent text-accent-foreground')}
            onClick={() => setView('grid')}
            title="Grid view"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('size-7', view === 'list' && 'bg-accent text-accent-foreground')}
            onClick={() => setView('list')}
            title="List view"
          >
            <List className="size-4" />
          </Button>
        </div>
        <div className="relative w-full flex-1 sm:w-auto sm:min-w-[200px]">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search library…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={availability}
          onValueChange={(value) => setAvailability(value as Availability)}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABILITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monitored} onValueChange={(value) => setMonitored(value as Monitored)}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Monitored" />
          </SelectTrigger>
          <SelectContent>
            {MONITORED_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as Sort)}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="aspect-[2/3] w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Could not load the library." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description="Nothing managed by your *arr instances yet."
        />
      ) : !filtered || filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          description="No items match the current search and filters."
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <LibraryCard
              key={`${item.externalId.scheme}:${item.externalId.value}`}
              item={item}
              onSelect={() => setSelected(item)}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y rounded-none border">
          {filtered.map((item) => (
            <LibraryListItem
              key={`${item.externalId.scheme}:${item.externalId.value}`}
              item={item}
              onSelect={() => setSelected(item)}
            />
          ))}
        </div>
      )}
      <MediaDetailDrawer
        externalId={selected?.externalId ?? null}
        kind={selected?.kind ?? 'movie'}
        libraryItem={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </div>
  )
}
