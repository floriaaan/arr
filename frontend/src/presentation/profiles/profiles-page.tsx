import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { Clapperboard, Tv, Music, Star, Pencil, Trash2, Plus, Gauge } from 'lucide-react'
import { useInstances } from '#application/settings/instances.query'
import { useInstanceProfiles } from '#application/settings/instance-profiles.query'
import { useInstanceCatalog } from '#application/settings/instance-catalog.query'
import { useDeleteInstanceProfile } from '#application/settings/delete-instance-profile.mutation'
import { useSetDefaultInstanceProfile } from '#application/settings/set-default-instance-profile.mutation'
import { InstanceProfileFormDialog } from './instance-profile-form-dialog'
import { QualityProfilesSection } from './quality-profiles-section'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#presentation/ui/card'
import { Badge } from '#presentation/ui/badge'
import { Button } from '#presentation/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '#presentation/ui/alert-dialog'
import type { ServarrKind, ServarrInstanceDto } from '#domain/settings/servarr-instance'
import type { InstanceProfileDto } from '#domain/settings/instance-profile'

const SERVARR_META: Record<
  ServarrKind,
  { label: string; description: string; icon: typeof Clapperboard }
> = {
  radarr: { label: 'Radarr', description: 'Movies', icon: Clapperboard },
  sonarr: { label: 'Sonarr', description: 'TV shows', icon: Tv },
  lidarr: { label: 'Lidarr', description: 'Music', icon: Music },
}

const SERVARR_KINDS: readonly ServarrKind[] = ['radarr', 'sonarr', 'lidarr']

function invalidateProfiles(
  queryClient: ReturnType<typeof useQueryClient>,
  kind: ServarrKind,
) {
  void queryClient.invalidateQueries({ queryKey: ['instance-profiles', kind] })
  void queryClient.invalidateQueries({ queryKey: ['instances'] })
}

function ProfileRow({
  kind,
  profile,
  qualityProfileName,
  onEdit,
}: {
  kind: ServarrKind
  profile: InstanceProfileDto
  qualityProfileName?: string
  onEdit: () => void
}) {
  const queryClient = useQueryClient()
  const setDefault = useSetDefaultInstanceProfile()
  const deleteProfile = useDeleteInstanceProfile()

  return (
    <div className="flex items-center gap-3 rounded-md border px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{profile.name}</span>
          {profile.isDefault ? <Badge>Default</Badge> : null}
          {qualityProfileName ? (
            <Badge variant="outline" className="gap-1">
              <Gauge className="size-3" />
              {qualityProfileName}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">{profile.rootFolderPath}</p>
      </div>

      {!profile.isDefault ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={setDefault.isPending}
          onClick={() =>
            setDefault.mutate(
              { kind, id: profile.id },
              {
                onSuccess: (result) => {
                  if (!result.ok) return toast.error(result.error.message)
                  toast.success(`"${profile.name}" is now the default profile.`)
                  invalidateProfiles(queryClient, kind)
                },
              },
            )
          }
        >
          <Star className="size-4" />
          Set default
        </Button>
      ) : null}

      <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${profile.name}`}>
        <Pencil className="size-4" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={profile.isDefault}
            aria-label={`Delete ${profile.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{profile.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This preset will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteProfile.mutate(
                  { kind, id: profile.id },
                  {
                    onSuccess: (result) => {
                      if (!result.ok) return toast.error(result.error.message)
                      toast.success(`"${profile.name}" deleted.`)
                      invalidateProfiles(queryClient, kind)
                    },
                  },
                )
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function InstanceProfilesSection({
  kind,
  instance,
}: {
  kind: ServarrKind
  instance: ServarrInstanceDto
}) {
  const meta = SERVARR_META[kind]
  const Icon = meta.icon
  const profiles = useInstanceProfiles(kind)
  const catalog = useInstanceCatalog(kind, true)
  const [dialogProfile, setDialogProfile] = useState<InstanceProfileDto | 'new' | null>(null)

  const qualityProfileNameById = new Map(
    (catalog.data?.ok ? catalog.data.value.qualityProfiles : []).map((qualityProfile) => [
      qualityProfile.id,
      qualityProfile.name,
    ]),
  )

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4.5" />
        </div>
        <div className="flex-1">
          <CardTitle>{meta.label}</CardTitle>
          <CardDescription className="truncate">{instance.baseUrl}</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogProfile('new')}>
          <Plus className="size-4" />
          Add profile
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 border-t pt-6">
        {profiles.data?.length ? (
          profiles.data.map((profile) => (
            <ProfileRow
              key={profile.id}
              kind={kind}
              profile={profile}
              qualityProfileName={qualityProfileNameById.get(profile.qualityProfileId)}
              onEdit={() => setDialogProfile(profile)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No profile yet.</p>
        )}
      </CardContent>

      {dialogProfile ? (
        <InstanceProfileFormDialog
          kind={kind}
          profile={dialogProfile === 'new' ? null : dialogProfile}
          open
          onOpenChange={(open) => {
            if (!open) setDialogProfile(null)
          }}
        />
      ) : null}
    </Card>
  )
}

function UnconfiguredInstanceCard({ kind }: { kind: ServarrKind }) {
  const meta = SERVARR_META[kind]
  const Icon = meta.icon

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4.5" />
        </div>
        <div className="flex-1">
          <CardTitle>{meta.label}</CardTitle>
          <CardDescription>Not connected yet.</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings">Connect in Settings</Link>
        </Button>
      </CardHeader>
    </Card>
  )
}

export function ProfilesPage() {
  const instances = useInstances()

  return (
    <div className="space-y-4">
      {SERVARR_KINDS.map((kind) => {
        const instance = instances.data?.find((candidate) => candidate.kind === kind)
        return instance ? (
          <div key={kind} className="space-y-4">
            <InstanceProfilesSection kind={kind} instance={instance} />
            <QualityProfilesSection kind={kind} />
          </div>
        ) : (
          <UnconfiguredInstanceCard key={kind} kind={kind} />
        )
      })}
    </div>
  )
}
