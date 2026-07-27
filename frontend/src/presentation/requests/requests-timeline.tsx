import { useRequests } from '#application/requests/requests.query'
import { RequestCard } from './request-card'
import { EmptyState } from '#presentation/shared/empty-state'
import { ErrorState } from '#presentation/shared/error-state'
import { Skeleton } from '#presentation/ui/skeleton'
import type { RequestFilter } from '#domain/requests/request-filter'

export function RequestsTimeline({ filter = {} }: { filter?: RequestFilter }) {
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

  return (
    <div className="space-y-3">
      {data.map((request) => (
        <RequestCard key={request.id} request={request} />
      ))}
    </div>
  )
}
