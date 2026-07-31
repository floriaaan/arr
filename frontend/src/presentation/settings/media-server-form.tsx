import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Loader2, Save, Trash2 } from 'lucide-react'
import { useSaveMediaServer } from '#application/settings/save-media-server.mutation'
import { useDeleteMediaServer } from '#application/settings/delete-media-server.mutation'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Button } from '#presentation/ui/button'
import { Switch } from '#presentation/ui/switch'
import { MEDIA_SERVER_META } from '#presentation/shared/media-server-meta'
import { DiscoveryDialog } from './discovery-dialog'
import { buildMediaServerSearchUrl } from '#domain/settings/media-server-link'
import type { MediaServerDto, MediaServerKind } from '#domain/settings/media-server'

/**
 * Deliberately much thinner than `ServiceInstanceForm`: a media server is a
 * URL and a toggle, with no API key to test and no profiles to fetch — this
 * app only builds links to it (cf. docs/phase-5-quality-of-life).
 */
export function MediaServerForm({
  kind,
  existing,
  duringOnboarding,
  onSaved,
  onRemoved,
}: {
  kind: MediaServerKind
  existing?: MediaServerDto
  duringOnboarding: boolean
  onSaved?: (server: MediaServerDto) => void
  onRemoved?: () => void
}) {
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? '')
  const [enabled, setEnabled] = useState(existing?.enabled ?? true)

  const saveMediaServer = useSaveMediaServer()
  const deleteMediaServer = useDeleteMediaServer()
  const meta = MEDIA_SERVER_META[kind]

  function handleSave() {
    saveMediaServer.mutate(
      { kind, duringOnboarding, draft: { baseUrl, enabled } },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          toast.success(`${meta.label} saved.`)
          setBaseUrl(result.value.baseUrl)
          onSaved?.(result.value)
        },
        onError: () => toast.error('Something went wrong.'),
      },
    )
  }

  function handleRemove() {
    deleteMediaServer.mutate(kind, {
      onSuccess: () => {
        toast.success(`${meta.label} removed.`)
        setBaseUrl('')
        setEnabled(true)
        onRemoved?.()
      },
      onError: () => toast.error('Something went wrong.'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Base URL</Label>
          <DiscoveryDialog kind={kind} duringOnboarding={duringOnboarding} onPick={setBaseUrl} />
        </div>
        <Input
          placeholder={meta.placeholder}
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          The URL you open in your browser. Used to link to {meta.label} from an item's detail —
          no API key needed, nothing is ever sent to {meta.label}.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <Label>Show links to {meta.label}</Label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={!baseUrl || saveMediaServer.isPending}>
          {saveMediaServer.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save
        </Button>

        {existing ? (
          <Button variant="outline" asChild>
            <a
              href={buildMediaServerSearchUrl(existing, '')}
              target="_blank"
              rel="noreferrer noopener"
            >
              <ExternalLink className="size-4" />
              Open {meta.label}
            </a>
          </Button>
        ) : null}

        {existing && !duringOnboarding ? (
          <Button
            variant="ghost"
            onClick={handleRemove}
            disabled={deleteMediaServer.isPending}
            className="text-destructive"
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  )
}
