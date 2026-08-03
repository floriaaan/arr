import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { WelcomeStep } from '#presentation/settings/onboarding/welcome-step'
import { AdminStep } from '#presentation/settings/onboarding/admin-step'
import { ServicesStep } from '#presentation/settings/onboarding/services-step'
import { MediaServersStep } from '#presentation/settings/onboarding/media-servers-step'
import { SsoStep } from '#presentation/settings/onboarding/sso-step'
import { SummaryStep } from '#presentation/settings/onboarding/summary-step'
import { Card, CardContent } from '#presentation/ui/card'
import { ThemeToggle } from '#presentation/shared/theme-toggle'
import { cn } from '#presentation/shared/utils'

export const Route = createFileRoute('/setup/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    const { status } = await connector.getOnboardingState()
    if (status === 'completed') throw redirect({ to: '/login' })
  },
  component: SetupRoute,
})

const STEPS = ['welcome', 'admin', 'services', 'media-servers', 'sso', 'summary'] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: Record<Step, string> = {
  welcome: 'Welcome',
  admin: 'Admin account',
  services: 'Services',
  'media-servers': 'Media servers',
  sso: 'Single sign-on',
  summary: 'Summary',
}

function SetupRoute() {
  const [step, setStep] = useState<Step>('welcome')
  const navigate = useNavigate()

  function next() {
    const currentIndex = STEPS.indexOf(step)
    const nextStep = STEPS[currentIndex + 1]
    if (nextStep) setStep(nextStep)
  }

  function back() {
    const currentIndex = STEPS.indexOf(step)
    const previousStep = STEPS[currentIndex - 1]
    if (previousStep) setStep(previousStep)
  }

  const currentIndex = STEPS.indexOf(step)

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-10 w-32">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="display-title text-xl font-semibold tracking-tight">arr</div>
          <p className="text-sm text-muted-foreground">Instance setup</p>
        </div>

        <Card className="w-full">
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, index) => (
                  <div
                    key={s}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition-colors',
                      index <= currentIndex ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                ))}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Step {currentIndex + 1} of {STEPS.length} · {STEP_LABELS[step]}
              </p>
            </div>
            {step === 'welcome' ? <WelcomeStep onNext={next} /> : null}
            {step === 'admin' ? <AdminStep onNext={next} onBack={back} /> : null}
            {step === 'services' ? <ServicesStep onNext={next} onBack={back} /> : null}
            {step === 'media-servers' ? <MediaServersStep onNext={next} onBack={back} /> : null}
            {step === 'sso' ? <SsoStep onNext={next} onBack={back} /> : null}
            {step === 'summary' ? (
              <SummaryStep onComplete={() => void navigate({ to: '/login' })} onBack={back} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
