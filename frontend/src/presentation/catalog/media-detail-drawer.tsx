import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Folder,
  Gauge,
  HardDrive,
  Loader2,
  Radio,
  Server,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useMediaDetail } from '#application/catalog/media-detail.query'
import { useCreateRequest } from '#application/requests/create-request.mutation'
import { useRemoveLibraryItem } from '#application/library/remove-library-item.mutation'
import { useSession } from '#application/identity/session.query'
import { useInstances } from '#application/settings/instances.query'
import { useInstanceCatalog } from '#application/settings/instance-catalog.query'
import { useMediaServers } from '#application/settings/media-servers.query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#presentation/ui/dialog'
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
import { Button } from '#presentation/ui/button'
import { Badge } from '#presentation/ui/badge'
import { Skeleton } from '#presentation/ui/skeleton'
import { MEDIA_KIND_ICONS } from '#presentation/shared/media-kind-icons'
import { formatSize } from '#presentation/shared/format-size'
import { SERVARR_LABEL } from '#presentation/shared/servarr-meta'
import { MEDIA_SERVER_META } from '#presentation/shared/media-server-meta'
import { buildMediaServerSearchUrl } from '#domain/settings/media-server-link'
import type { MediaKind } from '#domain/catalog/media-kind'
import type { ExternalId } from '#domain/catalog/external-id'
import type { LibraryItem } from '#domain/library/library-item'

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
  const removeLibraryItem = useRemoveLibraryItem()
  const session = useSession()
  const queryClient = useQueryClient()
  const instances = useInstances()
  const mediaServers = useMediaServers()

  const isOpen = externalId !== null
  const isAdmin = session.data?.user?.role === 'admin'

  const managedBy = detail.data?.ok ? detail.data.value.managedBy : undefined
  const managedInstance = managedBy
    ? instances.data?.find((instance) => instance.id === managedBy.instanceId)
    : undefined
  const catalog = useInstanceCatalog(managedInstance?.kind ?? 'radarr', Boolean(managedInstance))
  const qualityProfileName = managedBy
    ? catalog.data?.ok
      ? catalog.data.value.qualityProfiles.find(
          (qualityProfile) => qualityProfile.id === managedBy.qualityProfileId,
        )?.name
      : undefined
    : undefined

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

  function handleRemove(title: string) {
    if (!externalId) return
    removeLibraryItem.mutate(
      { externalId, deleteFiles: true },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          toast.success(`"${title}" removed from the library.`)
          void queryClient.invalidateQueries({ queryKey: ['library'] })
          void queryClient.invalidateQueries({ queryKey: ['catalog', 'detail'] })
          onOpenChange(false)
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
                            value={
                              managedInstance
                                ? `${SERVARR_LABEL[managedInstance.kind]} · ${managedInstance.baseUrl}`
                                : value.managedBy.instanceId
                            }
                          />
                          <MetaRow
                            icon={Folder}
                            label="Root folder"
                            value={value.managedBy.rootFolderPath}
                          />
                          <MetaRow
                            icon={Gauge}
                            label="Quality profile"
                            value={
                              catalog.isLoading
                                ? 'Loading…'
                                : (qualityProfileName ?? value.managedBy.qualityProfileId)
                            }
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

            {(() => {
              const value = detail.data.value
              const linkedServers = (mediaServers.data ?? []).filter((server) => server.enabled)
              // Linking to a media server's search for something that isn't
              // downloaded yet would just open an empty result page.
              if (!value.alreadyManaged || linkedServers.length === 0) return null

              return (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Watch on</span>
                  {linkedServers.map((server) => {
                    const meta = MEDIA_SERVER_META[server.kind]
                    const Icon = meta.icon
                    return (
                      <Button key={server.id} variant="outline" size="sm" asChild>
                        <a
                          href={buildMediaServerSearchUrl(server, value.title)}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <Icon className="size-4" />
                          {meta.label}
                          <ExternalLink className="size-3.5 text-muted-foreground" />
                        </a>
                      </Button>
                    )
                  })}
                </div>
              )
            })()}

            {(() => {
              const value = detail.data.value
              return (
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequest}
                    disabled={value.alreadyManaged || createRequest.isPending}
                  >
                    {value.alreadyManaged
                      ? 'Already in library'
                      : createRequest.isPending
                        ? 'Requesting…'
                        : 'Request'}
                  </Button>

                  {value.alreadyManaged && isAdmin ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={removeLibraryItem.isPending}>
                          {removeLibraryItem.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Remove from library
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove "{value.title}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes it from its *arr instance and deletes its files from disk.
                            This can't be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={() => handleRemove(value.title)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              )
            })()}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
