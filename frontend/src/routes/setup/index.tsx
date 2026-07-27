import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { createConnector, getCookieHeader } from '../../../providers/create-connector'
import { WelcomeStep } from '#presentation/settings/onboarding/welcome-step'
import { AdminStep } from '#presentation/settings/onboarding/admin-step'
import { ServicesStep } from '#presentation/settings/onboarding/services-step'
import { SsoStep } from '#presentation/settings/onboarding/sso-step'
import { SummaryStep } from '#presentation/settings/onboarding/summary-step'

export const Route = createFileRoute('/setup/')({
  beforeLoad: async () => {
    const connector = createConnector(getCookieHeader())
    const { status } = await connector.getOnboardingState()
    if (status === 'completed') throw redirect({ to: '/login' })
  },
  component: SetupRoute,
})

const STEPS = ['welcome', 'admin', 'services', 'sso', 'summary'] as const
type Step = (typeof STEPS)[number]

function SetupRoute() {
  const [step, setStep] = useState<Step>('welcome')
  const navigate = useNavigate()

  function next() {
    const currentIndex = STEPS.indexOf(step)
    const nextStep = STEPS[currentIndex + 1]
    if (nextStep) setStep(nextStep)
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      {step === 'welcome' ? <WelcomeStep onNext={next} /> : null}
      {step === 'admin' ? <AdminStep onNext={next} /> : null}
      {step === 'services' ? <ServicesStep onNext={next} /> : null}
      {step === 'sso' ? <SsoStep onNext={next} /> : null}
      {step === 'summary' ? (
        <SummaryStep onComplete={() => void navigate({ to: '/login' })} />
      ) : null}
    </div>
  )
}
