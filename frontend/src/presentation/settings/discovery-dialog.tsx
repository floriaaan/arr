import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Radar, ServerCog } from 'lucide-react'
import { useDiscoverInstances } from '#application/settings/discover-instances.mutation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#presentation/ui/dialog'
import { Button } from '#presentation/ui/button'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Badge } from '#presentation/ui/badge'
import { Switch } from '#presentation/ui/switch'
import { SERVARR_LABEL } from '#presentation/shared/servarr-meta'
import { MEDIA_SERVER_META } from '#presentation/shared/media-server-meta'
import type { DiscoverableKind, DiscoveredInstance } from '#domain/settings/discovered-instance'

function kindLabel(kind: DiscoverableKind): string {
  return kind === 'radarr' || kind === 'sonarr' || kind === 'lidarr'
    ? SERVARR_LABEL[kind]
    : MEDIA_SERVER_META[kind].label
}

function ResultRow({
  instance,
  onUse,
}: {
  instance: DiscoveredInstance
  onUse?: (baseUrl: string) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-none border p-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-medium">{instance.baseUrl}</span>
          <Badge variant="outline" className="text-[10px] capitalize">
            {kindLabel(instance.kind)}
          </Badge>
          {instance.confidence === 'port' ? (
            <Badge variant="secondary" className="text-[10px]">
              Guessed from port
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {[instance.serverName, instance.detectedVersion].filter(Boolean).join(' · ') ||
            'No details advertised'}
        </p>
      </div>
      {onUse ? (
        <Button size="sm" variant="outline" onClick={() => onUse(instance.baseUrl)}>
          Use
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Shared by `ServiceInstanceForm` and `MediaServerForm`. Picking a result only
 * fills the Base URL field — saving still goes through the form's own
 * Test/Save (cf. docs/phase-5-quality-of-life/01, décision 8).
 */
export function DiscoveryDialog({
  kind,
  duringOnboarding,
  onPick,
  triggerClassName,
}: {
  kind: DiscoverableKind
  duringOnboarding: boolean
  onPick: (baseUrl: string) => void
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [extraHost, setExtraHost] = useState('')
  const [scanSubnet, setScanSubnet] = useState(false)
  const [results, setResults] = useState<DiscoveredInstance[] | null>(null)

  const discover = useDiscoverInstances()

  const matching = results?.filter((instance) => instance.kind === kind) ?? []
  const others = results?.filter((instance) => instance.kind !== kind) ?? []

  function handleScan() {
    discover.mutate(
      { extraHost: extraHost.trim() || undefined, scanSubnet, duringOnboarding },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          setResults(result.value)
          if (result.value.length === 0) toast.info('No service found on the network.')
        },
        onError: () => toast.error('The scan could not be completed.'),
      },
    )
  }

  function handleUse(baseUrl: string) {
    onPick(baseUrl)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={triggerClassName}>
          <Radar className="size-4" />
          Scan network
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Find {kindLabel(kind)} on your network</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Also check this host (optional)</Label>
            <Input
              placeholder="nas.local"
              value={extraHost}
              onChange={(event) => setExtraHost(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Localhost and the usual Docker service names are always checked. Add a hostname or IP
              here to check another machine — a URL works too, only the host is kept.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Switch checked={scanSubnet} onCheckedChange={setScanSubnet} className="mt-0.5" />
            <div>
              <Label>Also scan my local subnet</Label>
              <p className="text-xs text-muted-foreground">
                Probes the 254 addresses of this server's local network. Finds an instance running
                on another machine without typing anything, but takes several seconds.
              </p>
            </div>
          </div>

          <Button type="button" onClick={handleScan} disabled={discover.isPending}>
            {discover.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Radar className="size-4" />
            )}
            {discover.isPending ? 'Scanning…' : 'Scan'}
          </Button>

          {results ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-sm font-medium">
                  {matching.length > 0 ? `${kindLabel(kind)} found` : `No ${kindLabel(kind)} found`}
                </p>
                {matching.map((instance) => (
                  <ResultRow key={instance.baseUrl} instance={instance} onUse={handleUse} />
                ))}
              </div>

              {others.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-muted-foreground">
                    <ServerCog className="mr-1.5 inline size-3.5" />
                    Other services found
                  </p>
                  {others.map((instance) => (
                    <ResultRow key={`${instance.kind}:${instance.baseUrl}`} instance={instance} />
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Configure these from their own section.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
