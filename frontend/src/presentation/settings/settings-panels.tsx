import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useInstances } from '#application/settings/instances.query'
import { useDeleteInstance } from '#application/settings/delete-instance.mutation'
import { useSso } from '#application/settings/sso.query'
import { useSaveOidc } from '#application/settings/save-oidc.mutation'
import { useEffectiveAuthSettings } from '#application/settings/auth-settings.query'
import { ServiceInstanceForm } from './service-instance-form'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#presentation/ui/tabs'
import { Button } from '#presentation/ui/button'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Badge } from '#presentation/ui/badge'
import type { ServarrKind } from '#domain/settings/servarr-instance'

const SERVARR_KINDS: readonly ServarrKind[] = ['radarr', 'sonarr', 'lidarr']

function ServicesPanel() {
  const queryClient = useQueryClient()
  const instances = useInstances()
  const deleteInstance = useDeleteInstance()

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['instances'] })
  }

  return (
    <Tabs defaultValue="radarr">
      <TabsList>
        {SERVARR_KINDS.map((kind) => (
          <TabsTrigger key={kind} value={kind} className="capitalize">
            {kind}
          </TabsTrigger>
        ))}
      </TabsList>
      {SERVARR_KINDS.map((kind) => {
        const existing = instances.data?.find((instance) => instance.kind === kind)
        return (
          <TabsContent key={kind} value={kind} className="space-y-4">
            <ServiceInstanceForm
              kind={kind}
              existing={existing}
              duringOnboarding={false}
              onSaved={invalidate}
            />
            {existing ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  deleteInstance.mutate(kind, {
                    onSuccess: () => {
                      toast.success(`${kind} removed.`)
                      invalidate()
                    },
                  })
                }
              >
                Remove
              </Button>
            ) : null}
          </TabsContent>
        )
      })}
    </Tabs>
  )
}

function SsoPanel() {
  const sso = useSso()
  const saveOidc = useSaveOidc()
  const [issuerUrl, setIssuerUrl] = useState(sso.data?.issuerUrl ?? '')
  const [clientId, setClientId] = useState(sso.data?.clientId ?? '')
  const [clientSecret, setClientSecret] = useState('')

  const configured = issuerUrl && clientId && clientSecret

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Issuer URL</Label>
        <Input value={issuerUrl} onChange={(event) => setIssuerUrl(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Client ID</Label>
        <Input value={clientId} onChange={(event) => setClientId(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Client secret</Label>
        <Input
          type="password"
          placeholder={sso.data ? 'Re-enter to change' : ''}
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() =>
            saveOidc.mutate(
              { config: configured ? { issuerUrl, clientId, clientSecret } : null },
              {
                onSuccess: (result) =>
                  result.ok
                    ? toast.success('SSO settings saved.')
                    : toast.error(result.error.message),
              },
            )
          }
          disabled={saveOidc.isPending}
        >
          Save
        </Button>
        {sso.data ? (
          <Button
            variant="outline"
            onClick={() =>
              saveOidc.mutate({ config: null }, { onSuccess: () => toast.success('SSO disabled.') })
            }
          >
            Disable SSO
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function AuthPanel() {
  const authSettings = useEffectiveAuthSettings()
  if (!authSettings.data) return null

  return (
    <div className="space-y-2 text-sm">
      <p>
        Password login:{' '}
        <Badge variant={authSettings.data.passwordLoginEnabled ? 'default' : 'outline'}>
          {authSettings.data.passwordLoginEnabled ? 'enabled' : 'disabled'}
        </Badge>
      </p>
      <p>
        SSO:{' '}
        <Badge variant={authSettings.data.oidcConfigured ? 'default' : 'outline'}>
          {authSettings.data.oidcConfigured ? 'configured' : 'not configured'}
        </Badge>
      </p>
      <p className="text-muted-foreground">
        Source: {authSettings.data.source}
        {authSettings.data.source === 'environment' ? ' (set via environment variables)' : ''}
      </p>
    </div>
  )
}

export function SettingsPanels() {
  return (
    <Tabs defaultValue="services">
      <TabsList>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="sso">SSO</TabsTrigger>
        <TabsTrigger value="auth">Auth</TabsTrigger>
      </TabsList>
      <TabsContent value="services">
        <ServicesPanel />
      </TabsContent>
      <TabsContent value="sso">
        <SsoPanel />
      </TabsContent>
      <TabsContent value="auth">
        <AuthPanel />
      </TabsContent>
    </Tabs>
  )
}
