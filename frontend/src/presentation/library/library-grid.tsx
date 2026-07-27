import { useState } from 'react'
import { Clapperboard, ListChecks, Music, Tv } from 'lucide-react'
import { useLibrary } from '#application/library/library.query'
import { LibraryCard } from './library-card'
import { EmptyState } from '#presentation/shared/empty-state'
import { ErrorState } from '#presentation/shared/error-state'
import { Skeleton } from '#presentation/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '#presentation/ui/tabs'
import type { MediaKind } from '#domain/catalog/media-kind'

const KIND_TABS = [
  { value: 'all', label: 'All', icon: ListChecks },
  { value: 'movie', label: 'Movies', icon: Clapperboard },
  { value: 'series', label: 'Series', icon: Tv },
  { value: 'album', label: 'Music', icon: Music },
] as const
type KindTab = (typeof KIND_TABS)[number]['value']

export function LibraryGrid() {
  const [kindTab, setKindTab] = useState<KindTab>('all')
  const kind: MediaKind | undefined = kindTab === 'all' ? undefined : kindTab
  const { data, isLoading, isError, refetch } = useLibrary(kind)

  return (
    <div className="space-y-6">
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
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {data.map((item) => (
            <LibraryCard key={`${item.externalId.scheme}:${item.externalId.value}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
