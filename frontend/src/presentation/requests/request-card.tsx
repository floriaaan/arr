import { useState } from 'react'
import { toast } from 'sonner'
import { Clapperboard, Music, Tv, X, Check, Ban } from 'lucide-react'
import { useCancelRequest } from '#application/requests/cancel-request.mutation'
import { useApproveRequest } from '#application/requests/approve-request.mutation'
import { useRejectRequest } from '#application/requests/reject-request.mutation'
import { useSession } from '#application/identity/session.query'
import { RequestEpisodes } from './request-episodes'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#presentation/ui/accordion'
import { Card, CardContent } from '#presentation/ui/card'
import { Badge } from '#presentation/ui/badge'
import { Progress } from '#presentation/ui/progress'
import { Button } from '#presentation/ui/button'
import { Input } from '#presentation/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#presentation/ui/alert-dialog'
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

function RejectDialog({ requestId, title }: { requestId: string; title: string }) {
  const [reason, setReason] = useState('')
  const rejectRequest = useRejectRequest()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={rejectRequest.isPending}>
          <Ban className="size-4" />
          Reject
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject "{title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            The request is cancelled and the requester can see why.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          placeholder="Reason (shown to the requester)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setReason('')}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={reason.trim().length === 0}
            onClick={() =>
              rejectRequest.mutate(
                { id: requestId, reason: reason.trim() },
                {
                  onSuccess: (result) => {
                    if (!result.ok) toast.error(result.error.message)
                    setReason('')
                  },
                },
              )
            }
          >
            Reject
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function RequestCard({ request }: { request: MediaRequest }) {
  const session = useSession()
  const cancelRequest = useCancelRequest()
  const approveRequest = useApproveRequest()
  const [episodesOpen, setEpisodesOpen] = useState(false)
  const KindIcon = KIND_ICON[request.kind]
  // Only a series has episodes to unfold, and only once it has been submitted.
  const canUnfold = request.kind === 'series' && request.status !== 'pending'
  const isAdmin = session.data?.user?.role === 'admin'

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <KindIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{request.title}</p>
            <Badge variant={STATUS_VARIANT[request.status]}>{request.status}</Badge>
            {request.requiresApproval ? <Badge variant="outline">Awaiting approval</Badge> : null}
            {request.origin === 'watchlist' ? <Badge variant="secondary">Watchlist</Badge> : null}
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
          {request.rejectionReason ? (
            <p className="text-xs text-destructive">Rejected: {request.rejectionReason}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Requested by {request.requestedBy.email ?? 'unknown'} ·{' '}
            {new Date(request.createdAt).toLocaleDateString()}
          </p>

          {canUnfold ? (
            <Accordion
              type="single"
              collapsible
              value={episodesOpen ? 'episodes' : ''}
              onValueChange={(value) => setEpisodesOpen(value === 'episodes')}
            >
              <AccordionItem value="episodes" className="border-b-0">
                <AccordionTrigger className="py-1 text-xs text-muted-foreground">
                  Episodes
                </AccordionTrigger>
                <AccordionContent>
                  <RequestEpisodes requestId={request.id} open={episodesOpen} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}

          {isAdmin && request.requiresApproval ? (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                disabled={approveRequest.isPending}
                onClick={() =>
                  approveRequest.mutate(request.id, {
                    onSuccess: (result) => {
                      if (!result.ok) toast.error(result.error.message)
                    },
                  })
                }
              >
                <Check className="size-4" />
                Approve
              </Button>
              <RejectDialog requestId={request.id} title={request.title} />
            </div>
          ) : null}
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
