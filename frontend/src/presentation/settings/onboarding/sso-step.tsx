import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, ChevronLeft } from 'lucide-react'
import { useTestOidc } from '#application/settings/test-oidc.mutation'
import { useSaveOidc } from '#application/settings/save-oidc.mutation'
import { useEffectiveAuthSettings } from '#application/settings/auth-settings.query'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Button } from '#presentation/ui/button'
import { Card, CardContent } from '#presentation/ui/card'

export function SsoStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [issuerUrl, setIssuerUrl] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const testOidc = useTestOidc()
  const saveOidc = useSaveOidc()
  const authSettings = useEffectiveAuthSettings()

  const configured = issuerUrl && clientId && clientSecret

  /**
   * `OIDC_ISSUER_URL`/`OIDC_CLIENT_ID`/`OIDC_CLIENT_SECRET` already take
   * precedence over anything saved through this form (cf.
   * `EnvAuthSettingsProvider`) — asking the admin to retype them here (and
   * having nowhere safe to echo the secret back into) was the actual bug
   * behind "env vars don't prefill the inputs". There's nothing to prefill;
   * the right move is to skip the form entirely and say so.
   */
  const envManaged = authSettings.data?.source === 'environment'

  if (envManaged) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Single sign-on (optional)</h2>
          <p className="text-sm text-muted-foreground">
            Already configured via environment variables — nothing to do here.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            <code>OIDC_ISSUER_URL</code>, <code>OIDC_CLIENT_ID</code> and{' '}
            <code>OIDC_CLIENT_SECRET</code> are set on the backend. They override anything saved
            here, so this step is a no-op — SSO sign-in already works.
          </CardContent>
        </Card>
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

  function handleTest() {
    testOidc.mutate(
      { issuerUrl, clientId, clientSecret },
      {
        onSuccess: (result) =>
          result.ok ? toast.success('Discovery succeeded.') : toast.error(result.error.message),
      },
    )
  }

  function handleSaveAndContinue() {
    saveOidc.mutate(
      { config: configured ? { issuerUrl, clientId, clientSecret } : null, duringOnboarding: true },
      { onSuccess: (result) => result.ok && onNext() },
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Single sign-on (optional)</h2>
        <p className="text-sm text-muted-foreground">
          Connect PocketID, or skip — password login always stays available.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Issuer URL</Label>
        <Input
          placeholder="https://pocketid.example.com"
          value={issuerUrl}
          onChange={(event) => setIssuerUrl(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Client ID</Label>
        <Input value={clientId} onChange={(event) => setClientId(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Client secret</Label>
        <Input
          type="password"
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
        />
      </div>

      <div className="flex w-full items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!configured || testOidc.isPending}
          >
            {testOidc.isPending ? 'Testing…' : 'Test'}
          </Button>
          <Button onClick={handleSaveAndContinue} disabled={saveOidc.isPending}>
            {configured ? 'Save & continue' : 'Skip'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
