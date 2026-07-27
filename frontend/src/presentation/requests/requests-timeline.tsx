import { useState } from 'react'
import { Activity, CheckCircle2, Clapperboard, ListChecks, Music, Tv, XCircle } from 'lucide-react'
import { useRequests } from '#application/requests/requests.query'
import { RequestCard } from './request-card'
import { EmptyState } from '#presentation/shared/empty-state'
import { ErrorState } from '#presentation/shared/error-state'
import { Skeleton } from '#presentation/ui/skeleton'
import { Card, CardContent } from '#presentation/ui/card'
import { Tabs, TabsList, TabsTrigger } from '#presentation/ui/tabs'
import { cn } from '#presentation/shared/utils'
import { ACTIVE_REQUEST_STATUSES } from '#domain/requests/request-filter'
import type { RequestFilter } from '#domain/requests/request-filter'
import type { MediaRequest } from '#domain/requests/media-request'

const KIND_TABS = [
  { value: 'all', label: 'All', icon: ListChecks },
  { value: 'movie', label: 'Movies', icon: Clapperboard },
  { value: 'series', label: 'Series', icon: Tv },
  { value: 'album', label: 'Music', icon: Music },
] as const
type KindTab = (typeof KIND_TABS)[number]['value']

function statsFrom(data: MediaRequest[]) {
  return {
    total: data.length,
    active: data.filter((r) => ACTIVE_REQUEST_STATUSES.includes(r.status)).length,
    available: data.filter((r) => r.status === 'available').length,
    failed: data.filter((r) => r.status === 'failed').length,
  }
}

const STAT_CARDS = [
  { key: 'total', label: 'Total', icon: ListChecks, tone: 'text-foreground' },
  { key: 'active', label: 'Active', icon: Activity, tone: 'text-primary' },
  { key: 'available', label: 'Available', icon: CheckCircle2, tone: 'text-emerald-600' },
  { key: 'failed', label: 'Failed', icon: XCircle, tone: 'text-destructive' },
] as const

export function RequestsTimeline({ filter = {} }: { filter?: RequestFilter }) {
  const [kindTab, setKindTab] = useState<KindTab>('all')
  const { data, isLoading, isError, refetch } = useRequests(filter)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <ErrorState message="Could not load requests." onRetry={() => refetch()} />
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState title="No requests yet" description="Search the catalog to request something." />
    )
  }

  const stats = statsFrom(data)
  const visible = data.filter((request) => kindTab === 'all' || request.kind === kindTab)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.key}>
            <CardContent className="flex items-center gap-3">
              <stat.icon className={cn('size-5', stat.tone)} />
              <div>
                <p className="text-lg leading-none font-semibold">{stats[stat.key]}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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

      {visible.length === 0 ? (
        <EmptyState title="Nothing here" description="No requests match this filter." />
      ) : (
        <div className="space-y-3">
          {visible.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  )
}
