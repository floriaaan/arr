import { Button } from '#presentation/ui/button'
import { SkipOnboardingButton } from './skip-onboarding-button'

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Welcome to arr</h1>
      <p className="text-muted-foreground">
        Let's set up your admin account and connect your Radarr, Sonarr, and Lidarr instances.
      </p>
      <Button onClick={onNext} className="w-full">
        Get started
      </Button>
      <SkipOnboardingButton />
    </div>
  )
}
