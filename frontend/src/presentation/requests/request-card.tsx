import { toast } from 'sonner'
import { X } from 'lucide-react'
import { useCancelRequest } from '#application/requests/cancel-request.mutation'
import { Card, CardContent } from '#presentation/ui/card'
import { Badge } from '#presentation/ui/badge'
import { Progress } from '#presentation/ui/progress'
import { Button } from '#presentation/ui/button'
import type { MediaRequest } from '#domain/requests/media-request'

const STATUS_VARIANT: Record<
  MediaRequest['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'outline',
  submitted: 'outline',
  downloading: 'secondary',
  importing: 'secondary',
  available: 'default',
  failed: 'destructive',
  cancelled: 'outline',
}

const CANCELLABLE_STATUSES: readonly MediaRequest['status'][] = [
  'pending',
  'submitted',
  'downloading',
]

export function RequestCard({ request }: { request: MediaRequest }) {
  const cancelRequest = useCancelRequest()

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{request.title}</p>
            <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
          </div>
          {request.progress ? (
            <div className="flex items-center gap-2">
              <Progress value={request.progress.percentage} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">{request.progress.percentage}%</span>
            </div>
          ) : null}
          {request.failureReason ? (
            <p className="text-xs text-destructive">{request.failureReason}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Requested by {request.requestedBy.email ?? 'unknown'}
          </p>
        </div>
        {CANCELLABLE_STATUSES.includes(request.status) ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={cancelRequest.isPending}
            onClick={() =>
              cancelRequest.mutate(request.id, {
                onSuccess: (result) => {
                  if (!result.ok) toast.error(result.error.message)
                },
              })
            }
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
