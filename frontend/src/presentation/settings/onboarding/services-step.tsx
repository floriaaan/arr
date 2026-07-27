import { Tabs, TabsList, TabsTrigger, TabsContent } from '#presentation/ui/tabs'
import { Button } from '#presentation/ui/button'
import { ServiceInstanceForm } from '#presentation/settings/service-instance-form'

const SERVARR_KINDS = ['radarr', 'sonarr', 'lidarr'] as const

export function ServicesStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Connect your services</h2>
        <p className="text-sm text-muted-foreground">
          Optional and independent — configure the ones you use, skip the rest.
        </p>
      </div>

      <Tabs defaultValue="radarr">
        <TabsList>
          {SERVARR_KINDS.map((kind) => (
            <TabsTrigger key={kind} value={kind} className="capitalize">
              {kind}
            </TabsTrigger>
          ))}
        </TabsList>
        {SERVARR_KINDS.map((kind) => (
          <TabsContent key={kind} value={kind}>
            <ServiceInstanceForm kind={kind} duringOnboarding />
          </TabsContent>
        ))}
      </Tabs>

      <Button onClick={onNext}>Continue</Button>
    </div>
  )
}
