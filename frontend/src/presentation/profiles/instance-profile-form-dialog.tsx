import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useInstanceCatalog } from '#application/settings/instance-catalog.query'
import { useCreateInstanceProfile } from '#application/settings/create-instance-profile.mutation'
import { useUpdateInstanceProfile } from '#application/settings/update-instance-profile.mutation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#presentation/ui/dialog'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Button } from '#presentation/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#presentation/ui/select'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { InstanceProfileDto } from '#domain/settings/instance-profile'

const SERVARR_LABEL: Record<ServarrKind, string> = {
  radarr: 'Radarr',
  sonarr: 'Sonarr',
  lidarr: 'Lidarr',
}

export function InstanceProfileFormDialog({
  kind,
  profile,
  open,
  onOpenChange,
}: {
  kind: ServarrKind
  /** `null` creates a new profile, otherwise edits this one. */
  profile: InstanceProfileDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = profile !== null
  const catalog = useInstanceCatalog(kind, open)
  const createProfile = useCreateInstanceProfile()
  const updateProfile = useUpdateInstanceProfile()
  const queryClient = useQueryClient()

  const [name, setName] = useState(profile?.name ?? '')
  const [rootFolderPath, setRootFolderPath] = useState(profile?.rootFolderPath ?? '')
  const [qualityProfileId, setQualityProfileId] = useState<number | undefined>(
    profile?.qualityProfileId,
  )
  const [metadataProfileId, setMetadataProfileId] = useState<number | undefined>(
    profile?.metadataProfileId ?? undefined,
  )
  const [languageProfileId, setLanguageProfileId] = useState<number | undefined>(
    profile?.languageProfileId ?? undefined,
  )

  const catalogData = catalog.data?.ok ? catalog.data.value : null
  const pending = createProfile.isPending || updateProfile.isPending
  const canSave = name.trim() !== '' && rootFolderPath !== '' && qualityProfileId !== undefined

  const knownRootFolders = catalogData?.rootFolders.map((folder) => folder.path) ?? []
  const isKnownRootFolder = knownRootFolders.includes(rootFolderPath)
  const rootFolderListId = `root-folders-${kind}`

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['instance-profiles', kind] })
    void queryClient.invalidateQueries({ queryKey: ['instances'] })
  }

  function handleSave() {
    if (qualityProfileId === undefined) return
    const draft = {
      name: name.trim(),
      rootFolderPath,
      qualityProfileId,
      metadataProfileId,
      languageProfileId,
    }

    if (isEdit) {
      updateProfile.mutate(
        { kind, id: profile.id, draft },
        {
          onSuccess: (result) => {
            if (!result.ok) return toast.error(result.error.message)
            toast.success(`${draft.name} saved.`)
            invalidate()
            onOpenChange(false)
          },
        },
      )
    } else {
      createProfile.mutate(
        { kind, draft },
        {
          onSuccess: (result) => {
            if (!result.ok) return toast.error(result.error.message)
            toast.success(`${draft.name} created.`)
            invalidate()
            onOpenChange(false)
          },
        },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit profile' : 'New profile'}</DialogTitle>
          <DialogDescription>
            A named preset of root folder and quality profile for this instance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="4K, Anime, Standard…"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Root folder</Label>
            <Input
              list={rootFolderListId}
              placeholder="/data/movies"
              value={rootFolderPath}
              onChange={(event) => setRootFolderPath(event.target.value)}
            />
            {catalogData ? (
              <datalist id={rootFolderListId}>
                {catalogData.rootFolders.map((folder) => (
                  <option key={folder.path} value={folder.path} />
                ))}
              </datalist>
            ) : null}
            {rootFolderPath !== '' && catalogData ? (
              isKnownRootFolder ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  Known root folder on this {SERVARR_LABEL[kind]} instance.
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                  <AlertTriangle className="size-3.5" />
                  Not one of {SERVARR_LABEL[kind]}&apos;s configured root folders — make sure it
                  exists there before saving.
                </p>
              )
            ) : null}
          </div>

          {catalog.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading catalog…
            </div>
          ) : null}

          {catalog.data && !catalog.data.ok ? (
            <p className="text-sm text-destructive">{catalog.data.error.message}</p>
          ) : null}

          {catalogData ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quality profile</Label>
                <Select
                  value={qualityProfileId?.toString()}
                  onValueChange={(value) => setQualityProfileId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a quality profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogData.qualityProfiles.map((qualityProfile) => (
                      <SelectItem key={qualityProfile.id} value={qualityProfile.id.toString()}>
                        {qualityProfile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {kind === 'lidarr' && catalogData.metadataProfiles ? (
                <div className="space-y-2">
                  <Label>Metadata profile</Label>
                  <Select
                    value={metadataProfileId?.toString()}
                    onValueChange={(value) => setMetadataProfileId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a metadata profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogData.metadataProfiles.map((metadataProfile) => (
                        <SelectItem key={metadataProfile.id} value={metadataProfile.id.toString()}>
                          {metadataProfile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {kind === 'sonarr' && catalogData.languageProfiles ? (
                <div className="space-y-2">
                  <Label>Language profile</Label>
                  <Select
                    value={languageProfileId?.toString()}
                    onValueChange={(value) => setLanguageProfileId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a language profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogData.languageProfiles.map((languageProfile) => (
                        <SelectItem key={languageProfile.id} value={languageProfile.id.toString()}>
                          {languageProfile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!canSave || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
