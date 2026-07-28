import type { ReactNode } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  Folder,
  Gauge,
  HardDrive,
  Radio,
  Server,
  TriangleAlert,
} from 'lucide-react'
import { useMediaDetail } from '#application/catalog/media-detail.query'
import { useCreateRequest } from '#application/requests/create-request.mutation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#presentation/ui/dialog'
import { Button } from '#presentation/ui/button'
import { Badge } from '#presentation/ui/badge'
import { Skeleton } from '#presentation/ui/skeleton'
import { MEDIA_KIND_ICONS } from '#presentation/shared/media-kind-icons'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId } from '#domain/catalog/external-id'
import type { LibraryItem } from '#domain/library/library-item'

function formatSize(bytes: number): string {
  if (bytes <= 0) return '—'
  const gb = bytes / 1_000_000_000
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1_000_000).toFixed(0)} MB`
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto min-w-0 truncate font-medium">{value}</span>
    </div>
  )
}

export function MediaDetailDrawer({
  externalId,
  kind,
  libraryItem,
  onOpenChange,
}: {
  externalId: ExternalId | null
  kind: MediaKind
  libraryItem?: LibraryItem | null
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
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
            {(() => {
              const value = detail.data.value
              const KindIcon = MEDIA_KIND_ICONS[value.kind]
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <KindIcon className="size-4.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{value.title}</span>
                      {value.alreadyManaged ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      ) : null}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex flex-col gap-4 sm:flex-row">
                    {value.posterUrl ? (
                      <img
                        src={value.posterUrl}
                        alt={value.title}
                        className="h-72 w-48 shrink-0 self-center rounded-md object-cover sm:self-start"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-4">
                      {value.status || value.genres.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {value.status ? (
                            <Badge variant="secondary" className="capitalize">
                              {value.status}
                            </Badge>
                          ) : null}
                          {value.genres.map((genre) => (
                            <Badge key={genre} variant="outline">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      <p className="text-sm text-muted-foreground">{value.overview}</p>

                      <div className="space-y-1.5 rounded-md border p-3">
                        <MetaRow icon={CalendarDays} label="Year" value={value.year ?? 'Unknown'} />
                        {value.runtimeMinutes ? (
                          <MetaRow
                            icon={Clock}
                            label="Runtime"
                            value={`${value.runtimeMinutes} min`}
                          />
                        ) : null}
                        {value.network ? (
                          <MetaRow icon={Radio} label="Network" value={value.network} />
                        ) : null}
                      </div>

                      {value.managedBy ? (
                        <div className="space-y-1.5 rounded-md border p-3">
                          <MetaRow
                            icon={Server}
                            label="Instance"
                            value={value.managedBy.instanceId}
                          />
                          <MetaRow
                            icon={Folder}
                            label="Root folder"
                            value={value.managedBy.rootFolderPath}
                          />
                          <MetaRow
                            icon={Gauge}
                            label="Quality profile"
                            value={value.managedBy.qualityProfileId}
                          />
                          {libraryItem ? (
                            <>
                              <MetaRow
                                icon={HardDrive}
                                label="File size"
                                value={formatSize(libraryItem.sizeOnDiskBytes)}
                              />
                              <MetaRow
                                icon={libraryItem.hasFile ? Download : TriangleAlert}
                                label="Availability"
                                value={libraryItem.hasFile ? 'Downloaded' : 'Missing'}
                              />
                              <MetaRow
                                icon={libraryItem.monitored ? Eye : EyeOff}
                                label="Monitored"
                                value={libraryItem.monitored ? 'Yes' : 'No'}
                              />
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              )
            })()}

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
