import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Clapperboard,
  Tv,
  Music,
  ChevronDown,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Save,
  ShieldOff,
  Users,
  MonitorPlay,
} from 'lucide-react'
import { useInstances } from '#application/settings/instances.query'
import { useDeleteInstance } from '#application/settings/delete-instance.mutation'
import { useSso } from '#application/settings/sso.query'
import { useSaveOidc } from '#application/settings/save-oidc.mutation'
import { useEffectiveAuthSettings } from '#application/settings/auth-settings.query'
import { useMediaServers } from '#application/settings/media-servers.query'
import { ServiceInstanceForm } from './service-instance-form'
import { MediaServerForm } from './media-server-form'
import { UsersPanel } from './users-panel'
import { MEDIA_SERVER_META } from '#presentation/shared/media-server-meta'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#presentation/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#presentation/ui/card'
import { Button } from '#presentation/ui/button'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Badge } from '#presentation/ui/badge'
import { cn } from '#presentation/shared/utils'
import { MEDIA_SERVER_KINDS } from '#domain/settings/media-server'
import type { ServarrKind, ServarrInstanceDto } from '#domain/settings/servarr-instance'
import type { MediaServerDto, MediaServerKind } from '#domain/settings/media-server'

const SERVARR_META: Record<
  ServarrKind,
  { label: string; description: string; icon: typeof Clapperboard }
> = {
  radarr: { label: 'Radarr', description: 'Movies', icon: Clapperboard },
  sonarr: { label: 'Sonarr', description: 'TV shows', icon: Tv },
  lidarr: { label: 'Lidarr', description: 'Music', icon: Music },
}

const SERVARR_KINDS: readonly ServarrKind[] = ['radarr', 'sonarr', 'lidarr']

function InstanceStatusBadge({ existing }: { existing?: ServarrInstanceDto }) {
  if (!existing) return <Badge variant="outline">Not configured</Badge>
  return existing.enabled ? (
    <Badge>Enabled</Badge>
  ) : (
    <Badge variant="secondary">Disabled</Badge>
  )
}

function ServiceCard({
  kind,
  existing,
  onSaved,
  onRemove,
}: {
  kind: ServarrKind
  existing?: ServarrInstanceDto
  onSaved: (instance: ServarrInstanceDto) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(!existing)
  const meta = SERVARR_META[kind]
  const Icon = meta.icon

  return (
    <Card className="py-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="tap-scale flex w-full items-center gap-4 px-6 py-4 text-left"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{meta.label}</CardTitle>
            <InstanceStatusBadge existing={existing} />
          </div>
          <CardDescription className="truncate">
            {existing?.baseUrl ?? `Connect your ${meta.description.toLowerCase()} manager`}
          </CardDescription>
        </div>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded ? (
        <CardContent className="space-y-4 border-t py-6">
          <ServiceInstanceForm
            kind={kind}
            existing={existing}
            duringOnboarding={false}
            onSaved={onSaved}
            onRemove={existing ? onRemove : undefined}
          />
        </CardContent>
      ) : null}
    </Card>
  )
}

function ServicesPanel() {
  const queryClient = useQueryClient()
  const instances = useInstances()
  const deleteInstance = useDeleteInstance()

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['instances'] })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Connected services</h2>
        <p className="text-sm text-muted-foreground">
          Link your Radarr, Sonarr, and Lidarr instances so requests can be sent to them.
        </p>
      </div>
      <div className="space-y-3">
        {SERVARR_KINDS.map((kind) => {
          const existing = instances.data?.find((instance) => instance.kind === kind)
          return (
            <ServiceCard
              key={kind}
              kind={kind}
              existing={existing}
              onSaved={invalidate}
              onRemove={() =>
                deleteInstance.mutate(kind, {
                  onSuccess: () => {
                    toast.success(`${SERVARR_META[kind].label} removed.`)
                    invalidate()
                  },
                })
              }
            />
          )
        })}
      </div>
    </div>
  )
}

function MediaServerCard({
  kind,
  existing,
  onChanged,
}: {
  kind: MediaServerKind
  existing?: MediaServerDto
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState(!existing)
  const meta = MEDIA_SERVER_META[kind]
  const Icon = meta.icon

  return (
    <Card className="py-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="tap-scale flex w-full items-center gap-4 px-6 py-4 text-left"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{meta.label}</CardTitle>
            {existing ? (
              existing.enabled ? (
                <Badge>Linked</Badge>
              ) : (
                <Badge variant="secondary">Hidden</Badge>
              )
            ) : (
              <Badge variant="outline">Not configured</Badge>
            )}
          </div>
          <CardDescription className="truncate">
            {existing?.baseUrl ?? `Link your ${meta.description.toLowerCase()}`}
          </CardDescription>
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <CardContent className="space-y-4 border-t py-6">
          <MediaServerForm
            kind={kind}
            existing={existing}
            duringOnboarding={false}
            onSaved={onChanged}
            onRemoved={onChanged}
          />
        </CardContent>
      ) : null}
    </Card>
  )
}

function MediaServersPanel() {
  const queryClient = useQueryClient()
  const mediaServers = useMediaServers()

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['media-servers'] })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Media servers</h2>
        <p className="text-sm text-muted-foreground">
          Declare where you watch. Each linked server adds an "open in…" button on the detail of
          every title already in your library. No API key is stored, and nothing is ever sent to
          them — these are plain links.
        </p>
      </div>
      <div className="space-y-3">
        {MEDIA_SERVER_KINDS.map((kind) => (
          <MediaServerCard
            key={kind}
            kind={kind}
            existing={mediaServers.data?.find((server) => server.kind === kind)}
            onChanged={invalidate}
          />
        ))}
      </div>
    </div>
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
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Single sign-on</h2>
        <p className="text-sm text-muted-foreground">
          Let users sign in through an OpenID Connect provider instead of a password.
        </p>
      </div>
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <KeyRound className="size-4.5" />
          </div>
          <div className="flex-1">
            <CardTitle>OpenID Connect</CardTitle>
            <CardDescription>Issuer, client credentials, and claims mapping.</CardDescription>
          </div>
          <Badge variant={sso.data ? 'default' : 'outline'}>
            {sso.data ? 'Configured' : 'Not configured'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 border-t pt-6">
          <div className="space-y-2">
            <Label>Issuer URL</Label>
            <Input
              placeholder="https://auth.example.com"
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
              <Save className="size-4" />
              {saveOidc.isPending ? 'Saving…' : 'Save'}
            </Button>
            {sso.data ? (
              <Button
                variant="outline"
                onClick={() =>
                  saveOidc.mutate(
                    { config: null },
                    { onSuccess: () => toast.success('SSO disabled.') },
                  )
                }
              >
                <ShieldOff className="size-4" />
                Disable SSO
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AuthPanel() {
  const authSettings = useEffectiveAuthSettings()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Authentication</h2>
        <p className="text-sm text-muted-foreground">
          Effective sign-in configuration, resolved from the database and environment.
        </p>
      </div>
      {authSettings.data ? (
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <ShieldCheck className="size-4.5" />
            </div>
            <div className="flex-1">
              <CardTitle>Sign-in methods</CardTitle>
              <CardDescription>
                Source: {authSettings.data.source}
                {authSettings.data.source === 'environment' ? ' (set via environment variables)' : ''}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 border-t pt-6 text-sm">
            <div className="flex items-center gap-2">
              {authSettings.data.passwordLoginEnabled ? (
                <CheckCircle2 className="size-4 text-primary" />
              ) : (
                <XCircle className="size-4 text-muted-foreground" />
              )}
              Password login
              <Badge variant={authSettings.data.passwordLoginEnabled ? 'default' : 'outline'}>
                {authSettings.data.passwordLoginEnabled ? 'enabled' : 'disabled'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {authSettings.data.oidcConfigured ? (
                <CheckCircle2 className="size-4 text-primary" />
              ) : (
                <XCircle className="size-4 text-muted-foreground" />
              )}
              Single sign-on
              <Badge variant={authSettings.data.oidcConfigured ? 'default' : 'outline'}>
                {authSettings.data.oidcConfigured ? 'configured' : 'not configured'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export function SettingsPanels() {
  return (
    <Tabs defaultValue="services" orientation="vertical" className="items-start gap-8">
      <TabsList variant="line" className="w-48 shrink-0">
        <TabsTrigger value="services">
          <Clapperboard className="size-4" />
          Services
        </TabsTrigger>
        <TabsTrigger value="media-servers">
          <MonitorPlay className="size-4" />
          Media servers
        </TabsTrigger>
        <TabsTrigger value="sso">
          <KeyRound className="size-4" />
          Single sign-on
        </TabsTrigger>
        <TabsTrigger value="users">
          <Users className="size-4" />
          Users
        </TabsTrigger>
        <TabsTrigger value="auth">
          <ShieldCheck className="size-4" />
          Authentication
        </TabsTrigger>
      </TabsList>
      <TabsContent value="services" className="min-w-0">
        <ServicesPanel />
      </TabsContent>
      <TabsContent value="media-servers" className="min-w-0">
        <MediaServersPanel />
      </TabsContent>
      <TabsContent value="sso" className="min-w-0">
        <SsoPanel />
      </TabsContent>
      <TabsContent value="users" className="min-w-0">
        <UsersPanel />
      </TabsContent>
      <TabsContent value="auth" className="min-w-0">
        <AuthPanel />
      </TabsContent>
    </Tabs>
  )
}
