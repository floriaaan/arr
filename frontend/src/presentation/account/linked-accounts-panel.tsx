import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Clapperboard, MonitorPlay, Tv, Unlink, ExternalLink, Loader2 } from 'lucide-react'
import { useMyMediaAccounts } from '#application/watchlist/my-media-accounts.query'
import { useStartPlexLink } from '#application/watchlist/start-plex-link.mutation'
import { useCompletePlexLink } from '#application/watchlist/complete-plex-link.mutation'
import { useLinkMediaServerAccount } from '#application/watchlist/link-media-server-account.mutation'
import { useSetWatchlistAccountEnabled } from '#application/watchlist/set-watchlist-account-enabled.mutation'
import { useUnlinkMediaAccount } from '#application/watchlist/unlink-media-account.mutation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#presentation/ui/card'
import { Button } from '#presentation/ui/button'
import { Badge } from '#presentation/ui/badge'
import { Switch } from '#presentation/ui/switch'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import type { MediaAccountKind, PlexPin, UserMediaAccountDto } from '#domain/watchlist/user-media-account'

const KIND_META: Record<MediaAccountKind, { label: string; icon: typeof Clapperboard; description: string }> = {
  plex: {
    label: 'Plex',
    icon: Clapperboard,
    description: 'Syncs your Plex Watchlist (plex.tv, works from any server).',
  },
  jellyfin: {
    label: 'Jellyfin',
    icon: Tv,
    description: 'Syncs items you mark as Favorite on your Jellyfin server.',
  },
  emby: {
    label: 'Emby',
    icon: MonitorPlay,
    description: 'Syncs items you mark as Favorite on your Emby server.',
  },
}

const POLL_INTERVAL_MS = 2_000
const POLL_TIMEOUT_MS = 5 * 60_000

function PlexCard({ account }: { account?: UserMediaAccountDto }) {
  const meta = KIND_META.plex
  const Icon = meta.icon
  const startLink = useStartPlexLink()
  const completeLink = useCompletePlexLink()
  const setEnabled = useSetWatchlistAccountEnabled()
  const unlink = useUnlinkMediaAccount()
  const [linking, setLinking] = useState(false)
  const pollRef = useRef<{ pin: PlexPin; startedAt: number } | null>(null)

  useEffect(() => {
    if (!linking) return
    const interval = setInterval(() => {
      const state = pollRef.current
      if (!state) return
      if (Date.now() - state.startedAt > POLL_TIMEOUT_MS) {
        setLinking(false)
        toast.error('Plex linking timed out — try again.')
        return
      }
      completeLink.mutate(state.pin, {
        onSuccess: (result) => {
          if (!result.ok) {
            setLinking(false)
            toast.error(result.error.message)
            return
          }
          if (result.value.status === 'linked') {
            setLinking(false)
            toast.success('Plex account linked.')
          }
        },
      })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [linking])

  function handleLink() {
    startLink.mutate(undefined, {
      onSuccess: (result) => {
        if (!result.ok) return toast.error(result.error.message)
        window.open(result.value.authUrl, '_blank', 'noopener,noreferrer')
        pollRef.current = { pin: result.value.pin, startedAt: Date.now() }
        setLinking(true)
        toast.info('Authorize arr in the Plex tab that just opened.')
      },
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4.5" />
        </div>
        <div className="flex-1">
          <CardTitle>{meta.label}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </div>
        <Badge variant={account ? 'default' : 'outline'}>{account ? 'Linked' : 'Not linked'}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 border-t pt-6">
        {account ? (
          <AccountRow
            account={account}
            onToggle={(enabled) =>
              setEnabled.mutate(
                { id: account.id, enabled },
                { onSuccess: (r) => !r.ok && toast.error(r.error.message) },
              )
            }
            onUnlink={() =>
              unlink.mutate(account.id, {
                onSuccess: (r) => (r.ok ? toast.success('Plex unlinked.') : toast.error(r.error.message)),
              })
            }
          />
        ) : (
          <Button onClick={handleLink} disabled={startLink.isPending || linking}>
            {linking ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
            {linking ? 'Waiting for authorization…' : 'Link Plex account'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function AccountRow({
  account,
  onToggle,
  onUnlink,
}: {
  account: UserMediaAccountDto
  onToggle: (enabled: boolean) => void
  onUnlink: () => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{account.username}</p>
          <p className="text-xs text-muted-foreground">
            {account.lastSyncError
              ? `Last sync failed: ${account.lastSyncError}`
              : account.lastSyncedAt
                ? `Last synced ${new Date(account.lastSyncedAt).toLocaleString()}`
                : 'Not synced yet'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onUnlink} title="Unlink">
          <Unlink className="size-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={account.watchlistEnabled} onCheckedChange={onToggle} />
        <Label>Sync watchlist</Label>
      </div>
    </div>
  )
}

function MediaServerCard({
  kind,
  account,
}: {
  kind: Extract<MediaAccountKind, 'jellyfin' | 'emby'>
  account?: UserMediaAccountDto
}) {
  const meta = KIND_META[kind]
  const Icon = meta.icon
  const [expanded, setExpanded] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const link = useLinkMediaServerAccount()
  const setEnabled = useSetWatchlistAccountEnabled()
  const unlink = useUnlinkMediaAccount()

  function handleLink() {
    link.mutate(
      { kind, baseUrl, username, password },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          toast.success(`${meta.label} account linked.`)
          setPassword('')
          setExpanded(false)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4.5" />
        </div>
        <div className="flex-1">
          <CardTitle>{meta.label}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </div>
        <Badge variant={account ? 'default' : 'outline'}>{account ? 'Linked' : 'Not linked'}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 border-t pt-6">
        {account ? (
          <AccountRow
            account={account}
            onToggle={(enabled) =>
              setEnabled.mutate(
                { id: account.id, enabled },
                { onSuccess: (r) => !r.ok && toast.error(r.error.message) },
              )
            }
            onUnlink={() =>
              unlink.mutate(account.id, {
                onSuccess: (r) =>
                  r.ok ? toast.success(`${meta.label} unlinked.`) : toast.error(r.error.message),
              })
            }
          />
        ) : expanded ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Server URL</Label>
              <Input
                placeholder={`https://${kind}.example.com`}
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={(event) => setUsername(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your password is used once to obtain an access token — it is never stored.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleLink}
                disabled={link.isPending || !baseUrl || !username || !password}
              >
                {link.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Link account
              </Button>
              <Button type="button" variant="outline" onClick={() => setExpanded(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setExpanded(true)}>Link {meta.label} account</Button>
        )}
      </CardContent>
    </Card>
  )
}

export function LinkedAccountsPanel() {
  const accounts = useMyMediaAccounts()
  const byKind = new Map(accounts.data?.map((account) => [account.kind, account]))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Linked accounts</h2>
        <p className="text-sm text-muted-foreground">
          Link your Plex, Jellyfin, or Emby account so items you add to your watchlist (or mark as
          favorite) are automatically requested — subject to your approval policy.
        </p>
      </div>
      <div className="space-y-3">
        <PlexCard account={byKind.get('plex')} />
        <MediaServerCard kind="jellyfin" account={byKind.get('jellyfin')} />
        <MediaServerCard kind="emby" account={byKind.get('emby')} />
      </div>
    </div>
  )
}
