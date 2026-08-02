import { useState } from 'react'
import { ArrowRight, Check, ChevronLeft } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#presentation/ui/tabs'
import { Button } from '#presentation/ui/button'
import { ServiceInstanceForm } from '#presentation/settings/service-instance-form'
import { SERVARR_META } from '#presentation/shared/servarr-meta'

const SERVARR_KINDS = ['radarr', 'sonarr', 'lidarr'] as const
type Kind = (typeof SERVARR_KINDS)[number]

export function ServicesStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [configured, setConfigured] = useState<Record<Kind, boolean>>({
    radarr: false,
    sonarr: false,
    lidarr: false,
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Connect your services</h2>
        <p className="text-sm text-muted-foreground">
          Optional and independent — configure the ones you use, skip the rest.
        </p>
      </div>

      <Tabs defaultValue="radarr">
        <TabsList className="w-full">
          {SERVARR_KINDS.map((kind) => {
            const Icon = SERVARR_META[kind].icon
            return (
              <TabsTrigger key={kind} value={kind} className="capitalize">
                <Icon className="size-3.5" />
                {kind}
                {configured[kind] ? <Check className="size-3.5 text-primary" /> : null}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {SERVARR_KINDS.map((kind) => (
          <TabsContent key={kind} value={kind} forceMount className="data-[state=inactive]:hidden">
            <ServiceInstanceForm
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
