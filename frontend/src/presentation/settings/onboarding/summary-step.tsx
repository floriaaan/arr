import { useCompleteOnboarding } from '#application/settings/complete-onboarding.mutation'
import { useInstances } from '#application/settings/instances.query'
import { Button } from '#presentation/ui/button'
import { Badge } from '#presentation/ui/badge'

export function SummaryStep({ onComplete }: { onComplete: () => void }) {
  const instances = useInstances()
  const completeOnboarding = useCompleteOnboarding()

  function handleComplete() {
    completeOnboarding.mutate(undefined, { onSuccess: (result) => result.ok && onComplete() })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Ready to go</h2>
        <p className="text-sm text-muted-foreground">Here's what's configured so far.</p>
      </div>

      <ul className="space-y-2">
        {instances.data?.map((instance) => (
          <li key={instance.kind} className="flex items-center gap-2 text-sm capitalize">
            {instance.kind}
            <Badge variant={instance.enabled ? 'default' : 'outline'}>
              {instance.enabled ? 'enabled' : 'disabled'}
            </Badge>
          </li>
        ))}
        {instances.data?.length === 0 ? (
          <li className="text-sm text-muted-foreground">No services configured yet.</li>
        ) : null}
      </ul>

      {completeOnboarding.data && !completeOnboarding.data.ok ? (
        <p className="text-sm text-destructive">{completeOnboarding.data.error.message}</p>
      ) : null}

      <Button onClick={handleComplete} disabled={completeOnboarding.isPending}>
        {completeOnboarding.isPending ? 'Finishing…' : 'Finish setup'}
      </Button>
    </div>
  )
}
