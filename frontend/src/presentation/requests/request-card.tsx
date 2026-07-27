import { toast } from 'sonner'
import { Clapperboard, Music, Tv, X } from 'lucide-react'
import { useCancelRequest } from '#application/requests/cancel-request.mutation'
import { Card, CardContent } from '#presentation/ui/card'
import { Badge } from '#presentation/ui/badge'
import { Progress } from '#presentation/ui/progress'
import { Button } from '#presentation/ui/button'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { MediaRequest } from '#domain/requests/media-request'

const KIND_ICON: Record<MediaKind, typeof Clapperboard> = {
  movie: Clapperboard,
  series: Tv,
  album: Music,
}

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
  const KindIcon = KIND_ICON[request.kind]

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <KindIcon className="size-4" />
        </div>
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
            Requested by {request.requestedBy.email ?? 'unknown'} ·{' '}
            {new Date(request.createdAt).toLocaleDateString()}
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
