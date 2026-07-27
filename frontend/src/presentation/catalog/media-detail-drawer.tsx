import { toast } from 'sonner'
import { useMediaDetail } from '#application/catalog/media-detail.query'
import { useCreateRequest } from '#application/requests/create-request.mutation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#presentation/ui/dialog'
import { Button } from '#presentation/ui/button'
import { Badge } from '#presentation/ui/badge'
import { Skeleton } from '#presentation/ui/skeleton'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId } from '#domain/catalog/external-id'

export function MediaDetailDrawer({
  externalId,
  kind,
  onOpenChange,
}: {
  externalId: ExternalId | null
  kind: MediaKind
  onOpenChange: (open: boolean) => void
}) {
  const detail = useMediaDetail(externalId?.scheme ?? 'tmdb', externalId?.value ?? '', kind)
  const createRequest = useCreateRequest()

  const isOpen = externalId !== null

  function handleRequest() {
    if (!externalId) return
    createRequest.mutate(
      { kind, externalId },
      {
        onSuccess: (result) => {
          if (result.ok) {
            toast.success(`"${result.value.title}" requested.`)
            onOpenChange(false)
          } else {
            toast.error(result.error.message)
          }
        },
        onError: () => toast.error('Something went wrong.'),
      },
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {detail.isLoading || !externalId ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="aspect-[2/3] w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : detail.isError || !detail.data ? (
          <p className="text-sm text-destructive">Could not load this title.</p>
        ) : !detail.data.ok ? (
          <p className="text-sm text-destructive">{detail.data.error.message}</p>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{detail.data.value.title}</DialogTitle>
              <DialogDescription>
                {detail.data.value.year ?? 'Unknown year'}
                {detail.data.value.network ? ` · ${detail.data.value.network}` : ''}
                {detail.data.value.runtimeMinutes
                  ? ` · ${detail.data.value.runtimeMinutes} min`
                  : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-4">
              {detail.data.value.posterUrl ? (
                <img
                  src={detail.data.value.posterUrl}
                  alt={detail.data.value.title}
                  className="h-48 w-32 shrink-0 rounded-md object-cover"
                />
              ) : null}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {detail.data.value.genres.map((genre) => (
                    <Badge key={genre} variant="outline">
                      {genre}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{detail.data.value.overview}</p>
              </div>
            </div>

            <Button
              onClick={handleRequest}
              disabled={detail.data.value.alreadyManaged || createRequest.isPending}
            >
              {detail.data.value.alreadyManaged
                ? 'Already in library'
                : createRequest.isPending
                  ? 'Requesting…'
                  : 'Request'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
