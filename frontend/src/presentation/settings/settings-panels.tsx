import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Clapperboard,
  ChevronDown,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Save,
  ShieldOff,
  Users,
  MonitorPlay,
  Bell,
  Send,
  UserCheck,
  ListVideo,
} from 'lucide-react'
import { useInstances } from '#application/settings/instances.query'
import { useDeleteInstance } from '#application/settings/delete-instance.mutation'
import { useSso } from '#application/settings/sso.query'
import { useSaveOidc } from '#application/settings/save-oidc.mutation'
import { useEffectiveAuthSettings } from '#application/settings/auth-settings.query'
import { useMediaServers } from '#application/settings/media-servers.query'
import { useNotificationSettings } from '#application/settings/notification-settings.query'
import { useSaveNotificationSettings } from '#application/settings/save-notification-settings.mutation'
import { useTestNotification } from '#application/settings/test-notification.mutation'
import { useRequestApprovalSettings } from '#application/settings/request-approval-settings.query'
import { useSaveRequestApprovalSettings } from '#application/settings/save-request-approval-settings.mutation'
import { useWatchlistSettings } from '#application/settings/watchlist-settings.query'
import { useSaveWatchlistSettings } from '#application/settings/save-watchlist-settings.mutation'
import { useAllMediaAccounts } from '#application/settings/all-media-accounts.query'
import { ServiceInstanceForm } from './service-instance-form'
import { MediaServerForm } from './media-server-form'
import { UsersPanel } from './users-panel'
import { MEDIA_SERVER_META } from '#presentation/shared/media-server-meta'
import { SERVARR_META } from '#presentation/shared/servarr-meta'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#presentation/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#presentation/ui/card'
import { Button } from '#presentation/ui/button'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Badge } from '#presentation/ui/badge'
import { Switch } from '#presentation/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#presentation/ui/select'
import { cn } from '#presentation/shared/utils'
import { MEDIA_SERVER_KINDS } from '#domain/settings/media-server'
import type { ServarrKind, ServarrInstanceDto } from '#domain/settings/servarr-instance'
import type { MediaServerDto, MediaServerKind } from '#domain/settings/media-server'
import type { NotificationAuthMode } from '#domain/settings/notification-settings'
import type { ApprovalPolicy } from '#domain/settings/request-approval-settings'

const SERVARR_KINDS: readonly ServarrKind[] = ['radarr', 'sonarr', 'lidarr']

function InstanceStatusBadge({ existing }: { existing?: ServarrInstanceDto }) {
  if (!existing) return <Badge variant="outline">Not configured</Badge>
  if (!existing.enabled) return <Badge variant="secondary">Disabled</Badge>
  if (existing.healthy === false) return <Badge variant="destructive">Unreachable</Badge>
  return <Badge>Enabled</Badge>
}

function instanceHealthLabel(existing: ServarrInstanceDto): string | null {
  if (!existing.enabled || existing.lastCheckedAt === null) return null
  const checkedAt = new Date(existing.lastCheckedAt).toLocaleString()
  if (existing.healthy === false) {
    return existing.lastError
      ? `${existing.lastError.message} · checked ${checkedAt}`
      : `Unreachable · checked ${checkedAt}`
  }
  return existing.detectedVersion
    ? `${existing.detectedVersion} · checked ${checkedAt}`
    : `Checked ${checkedAt}`
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
          {existing && instanceHealthLabel(existing) ? (
            <CardDescription className="truncate text-xs">
              {instanceHealthLabel(existing)}
            </CardDescription>
          ) : null}
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
            {existing?.baseUrl ?? `Link your ${meta.description}`}
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

function NotificationsPanel() {
  const queryClient = useQueryClient()
  const notificationSettings = useNotificationSettings()
  const saveNotificationSettings = useSaveNotificationSettings()
  const testNotification = useTestNotification()

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
  }

  const [webhookUrl, setWebhookUrl] = useState('')
  const [authMode, setAuthMode] = useState<NotificationAuthMode>(
    notificationSettings.data?.authMode ?? 'none',
  )
  const [token, setToken] = useState('')
  const [username, setUsername] = useState(notificationSettings.data?.username ?? '')
  const [password, setPassword] = useState('')
  const [onRequestCreated, setOnRequestCreated] = useState(
    notificationSettings.data?.onRequestCreated ?? true,
  )
  const [onRequestAvailable, setOnRequestAvailable] = useState(
    notificationSettings.data?.onRequestAvailable ?? true,
  )
  const [onRequestFailed, setOnRequestFailed] = useState(
    notificationSettings.data?.onRequestFailed ?? true,
  )
  const [onInstanceUnreachable, setOnInstanceUnreachable] = useState(
    notificationSettings.data?.onInstanceUnreachable ?? true,
  )
  const [onRequestPendingApproval, setOnRequestPendingApproval] = useState(
    notificationSettings.data?.onRequestPendingApproval ?? true,
  )

  const hasWebhookUrl = notificationSettings.data?.hasWebhookUrl ?? false
  const hasToken = notificationSettings.data?.hasToken ?? false
  const hasPassword = notificationSettings.data?.hasPassword ?? false

  function handleSave() {
    saveNotificationSettings.mutate(
      {
        ...(webhookUrl ? { webhookUrl } : {}),
        authMode,
        ...(authMode === 'token' && token ? { token } : {}),
        ...(authMode === 'basic' ? { username, ...(password ? { password } : {}) } : {}),
        onRequestCreated,
        onRequestAvailable,
        onRequestFailed,
        onInstanceUnreachable,
        onRequestPendingApproval,
      },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          toast.success('Notification settings saved.')
          setWebhookUrl('')
          setToken('')
          setPassword('')
          invalidate()
        },
      },
    )
  }

  function handleClear() {
    saveNotificationSettings.mutate(
      {
        webhookUrl: null,
        authMode,
        onRequestCreated,
        onRequestAvailable,
        onRequestFailed,
        onInstanceUnreachable,
        onRequestPendingApproval,
      },
      {
        onSuccess: () => {
          toast.success('Webhook cleared.')
          invalidate()
        },
      },
    )
  }

  function handleTest() {
    testNotification.mutate(undefined, {
      onSuccess: (result) => {
        if (!result.ok) return toast.error(result.error.message)
        toast.success('Test notification sent.')
      },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Push a notification to an ntfy topic when a request is created, becomes available, fails,
          or an instance goes unreachable.
        </p>
      </div>
      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Bell className="size-4.5" />
          </div>
          <div className="flex-1">
            <CardTitle>ntfy</CardTitle>
            <CardDescription>Pushed to the topic below.</CardDescription>
          </div>
          <Badge variant={hasWebhookUrl ? 'default' : 'outline'}>
            {hasWebhookUrl ? 'Configured' : 'Not configured'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 border-t pt-6">
          <div className="space-y-2">
            <Label>Topic URL</Label>
            <Input
              placeholder={hasWebhookUrl ? 'Re-enter to change' : 'https://ntfy.sh/my-topic'}
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Authentication</Label>
            <Select
              value={authMode}
              onValueChange={(value) => setAuthMode(value as NotificationAuthMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="token">Token (Bearer)</SelectItem>
                <SelectItem value="basic">Username / password</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              For a self-hosted ntfy topic behind access control — token auth or username/password.
            </p>
          </div>
          {authMode === 'token' ? (
            <div className="space-y-2">
              <Label>Token</Label>
              <Input
                type="password"
                placeholder={hasToken ? 'Re-enter to change' : 'tk_...'}
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </div>
          ) : null}
          {authMode === 'basic' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(event) => setUsername(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder={hasPassword ? 'Re-enter to change' : ''}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
          ) : null}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={onRequestCreated} onCheckedChange={setOnRequestCreated} />
              <Label>Request created</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={onRequestAvailable} onCheckedChange={setOnRequestAvailable} />
              <Label>Request available</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={onRequestFailed} onCheckedChange={setOnRequestFailed} />
              <Label>Request failed</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={onInstanceUnreachable} onCheckedChange={setOnInstanceUnreachable} />
              <Label>Instance unreachable</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={onRequestPendingApproval}
                onCheckedChange={setOnRequestPendingApproval}
              />
              <Label>Request needs approval</Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saveNotificationSettings.isPending}>
              <Save className="size-4" />
              {saveNotificationSettings.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={!hasWebhookUrl || testNotification.isPending}
            >
              <Send className="size-4" />
              {testNotification.isPending ? 'Sending…' : 'Send test'}
            </Button>
            {hasWebhookUrl ? (
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear webhook
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PolicyRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: ApprovalPolicy
  onChange: (value: ApprovalPolicy) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as ApprovalPolicy)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto-approve</SelectItem>
          <SelectItem value="manual">Requires approval</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ApprovalPanel() {
  const queryClient = useQueryClient()
  const approvalSettings = useRequestApprovalSettings()
  const saveApprovalSettings = useSaveRequestApprovalSettings()

  const [moviePolicy, setMoviePolicy] = useState<ApprovalPolicy>(
    approvalSettings.data?.moviePolicy ?? 'auto',
  )
  const [seriesPolicy, setSeriesPolicy] = useState<ApprovalPolicy>(
    approvalSettings.data?.seriesPolicy ?? 'auto',
  )
  const [albumPolicy, setAlbumPolicy] = useState<ApprovalPolicy>(
    approvalSettings.data?.albumPolicy ?? 'auto',
  )

  function handleSave() {
    saveApprovalSettings.mutate(
      { moviePolicy, seriesPolicy, albumPolicy },
      {
        onSuccess: () => {
          toast.success('Approval settings saved.')
          void queryClient.invalidateQueries({ queryKey: ['request-approval-settings'] })
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Approval</h2>
        <p className="text-sm text-muted-foreground">
          Decide whether a new request goes straight to your services, or waits for an admin to
          approve it — per media kind. Applies to every request, whether typed in the search bar or
          picked up from a watchlist. Admins always bypass this.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Policy per kind</CardTitle>
          <CardDescription>
            "Requires approval" leaves a request pending until an admin approves or rejects it from
            the requests list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 border-t pt-6">
          <PolicyRow label="Movies" value={moviePolicy} onChange={setMoviePolicy} />
          <PolicyRow label="Series" value={seriesPolicy} onChange={setSeriesPolicy} />
          <PolicyRow label="Music" value={albumPolicy} onChange={setAlbumPolicy} />
          <Button onClick={handleSave} disabled={saveApprovalSettings.isPending}>
            <Save className="size-4" />
            {saveApprovalSettings.isPending ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function WatchlistPanel() {
  const queryClient = useQueryClient()
  const watchlistSettings = useWatchlistSettings()
  const saveWatchlistSettings = useSaveWatchlistSettings()
  const accounts = useAllMediaAccounts()

  const [enabled, setEnabled] = useState(watchlistSettings.data?.enabled ?? true)
  const [intervalMinutes, setIntervalMinutes] = useState(
    watchlistSettings.data?.intervalMinutes ?? 60,
  )
  const [maxNewRequestsPerRun, setMaxNewRequestsPerRun] = useState(
    watchlistSettings.data?.maxNewRequestsPerRun ?? 20,
  )

  function handleSave() {
    saveWatchlistSettings.mutate(
      { enabled, intervalMinutes, maxNewRequestsPerRun },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          toast.success('Watchlist settings saved.')
          void queryClient.invalidateQueries({ queryKey: ['watchlist-settings'] })
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Watchlist sync</h2>
        <p className="text-sm text-muted-foreground">
          Turns items on a user's Plex Watchlist (or Jellyfin/Emby Favorites) into requests,
          following the approval policy configured under "Approval".
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Job settings</CardTitle>
          <CardDescription>
            How often the sync runs and how much it can create at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <Label>Enable watchlist sync</Label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Interval (minutes, min. 15)</Label>
              <Input
                type="number"
                min={15}
                value={intervalMinutes}
                onChange={(event) => setIntervalMinutes(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max new requests per account per run</Label>
              <Input
                type="number"
                min={1}
                value={maxNewRequestsPerRun}
                onChange={(event) => setMaxNewRequestsPerRun(Number(event.target.value))}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saveWatchlistSettings.isPending}>
            <Save className="size-4" />
            {saveWatchlistSettings.isPending ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Linked accounts</CardTitle>
          <CardDescription>Every Plex/Jellyfin/Emby account linked by any user.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y px-0">
          {accounts.data?.map((account) => (
            <div key={account.id} className="flex items-center gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{account.username}</p>
                  <Badge variant="outline" className="capitalize">
                    {account.kind}
                  </Badge>
                  {!account.watchlistEnabled ? <Badge variant="secondary">Paused</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {account.user.email ?? account.user.id}
                  {account.lastSyncError
                    ? ` · ${account.lastSyncError}`
                    : account.lastSyncedAt
                      ? ` · synced ${new Date(account.lastSyncedAt).toLocaleString()}`
                      : ' · not synced yet'}
                </p>
              </div>
            </div>
          ))}
          {accounts.data?.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No linked accounts yet.</p>
          ) : null}
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
                {authSettings.data.source === 'environment'
                  ? ' (set via environment variables)'
                  : ''}
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
        <TabsTrigger value="notifications">
          <Bell className="size-4" />
          Notifications
        </TabsTrigger>
        <TabsTrigger value="approval">
          <UserCheck className="size-4" />
          Approval
        </TabsTrigger>
        <TabsTrigger value="watchlist">
          <ListVideo className="size-4" />
          Watchlist
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
      <TabsContent value="notifications" className="min-w-0">
        <NotificationsPanel />
      </TabsContent>
      <TabsContent value="approval" className="min-w-0">
        <ApprovalPanel />
      </TabsContent>
      <TabsContent value="watchlist" className="min-w-0">
        <WatchlistPanel />
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
