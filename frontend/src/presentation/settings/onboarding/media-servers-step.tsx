import { useState } from 'react'
import { ArrowRight, Check, ChevronLeft } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#presentation/ui/tabs'
import { Button } from '#presentation/ui/button'
import { MediaServerForm } from '#presentation/settings/media-server-form'
import { MEDIA_SERVER_META } from '#presentation/shared/media-server-meta'
import { MEDIA_SERVER_KINDS } from '#domain/settings/media-server'
import type { MediaServerKind } from '#domain/settings/media-server'

export function MediaServersStep({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const [configured, setConfigured] = useState<Record<MediaServerKind, boolean>>({
    plex: false,
    jellyfin: false,
    emby: false,
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Where do you watch?</h2>
        <p className="text-sm text-muted-foreground">
          Optional. Declare your Plex, Jellyfin or Emby URL to get a "open in…" link on every
          title you already have in your library.
        </p>
      </div>

      <Tabs defaultValue="plex">
        <TabsList className="w-full">
          {MEDIA_SERVER_KINDS.map((kind) => (
            <TabsTrigger key={kind} value={kind}>
              {MEDIA_SERVER_META[kind].label}
              {configured[kind] ? <Check className="size-3.5 text-primary" /> : null}
            </TabsTrigger>
          ))}
        </TabsList>
        {MEDIA_SERVER_KINDS.map((kind) => (
          <TabsContent key={kind} value={kind} forceMount className="data-[state=inactive]:hidden">
            <MediaServerForm
              kind={kind}
              duringOnboarding
              onSaved={() => setConfigured((prev) => ({ ...prev, [kind]: true }))}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex w-full items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
