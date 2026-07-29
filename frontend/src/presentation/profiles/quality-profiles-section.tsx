import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useQualityProfiles } from '#application/settings/quality-profiles.query'
import { useDeleteQualityProfile } from '#application/settings/delete-quality-profile.mutation'
import { QualityProfileFormDialog } from './quality-profile-form-dialog'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '#presentation/ui/card'
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
import { SERVARR_LABEL } from '#presentation/shared/servarr-meta'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { QualityProfileRecord } from '#domain/settings/quality-profile-record'

function cutoffLabel(profile: QualityProfileRecord): string {
  const cutoffItem = profile.items.find((item) => item.id === profile.cutoff)
  return cutoffItem?.quality?.name ?? cutoffItem?.name ?? `#${profile.cutoff}`
}

export function QualityProfilesSection({ kind }: { kind: ServarrKind }) {
  const qualityProfiles = useQualityProfiles(kind)
  const deleteProfile = useDeleteQualityProfile()
  const queryClient = useQueryClient()
  const [dialogProfile, setDialogProfile] = useState<QualityProfileRecord | 'new' | null>(null)

  const list = qualityProfiles.data?.ok ? qualityProfiles.data.value : []

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['quality-profiles', kind] })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex-1">
          <CardTitle>Quality profiles</CardTitle>
          <CardDescription>
            Managed directly on the {SERVARR_LABEL[kind]} instance — not a local preset.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogProfile('new')}>
          <Plus className="size-4" />
          New quality profile
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 border-t pt-6">
        {qualityProfiles.data && !qualityProfiles.data.ok ? (
          <p className="text-sm text-destructive">{qualityProfiles.data.error.message}</p>
        ) : list.length > 0 ? (
          list.map((profile, index) => (
            <div
              key={profile.id ?? index}
              className="flex items-center gap-3 rounded-md border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium">{profile.name}</span>
                <p className="text-xs text-muted-foreground">
                  {profile.items.filter((item) => item.allowed).length} allowed · cutoff{' '}
                  {cutoffLabel(profile)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDialogProfile(profile)}
                aria-label={`Edit ${profile.name}`}
              >
                <Pencil className="size-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${profile.name}`}>
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &quot;{profile.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the Quality Profile from the {SERVARR_LABEL[kind]} instance
                      itself. This can't be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (profile.id === undefined) return
                        deleteProfile.mutate(
                          { kind, id: profile.id },
                          {
                            onSuccess: (result) => {
                              if (!result.ok) return toast.error(result.error.message)
                              toast.success(`"${profile.name}" deleted.`)
                              invalidate()
                            },
                          },
                        )
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No quality profile yet.</p>
        )}
      </CardContent>

      {dialogProfile ? (
        <QualityProfileFormDialog
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
