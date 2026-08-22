import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useInstanceCatalog } from '#application/settings/instance-catalog.query'
import { useQualityProfiles } from '#application/settings/quality-profiles.query'
import { useQualityProfileSchema } from '#application/settings/quality-profile-schema.query'
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
import { Switch } from '#presentation/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#presentation/ui/select'
import { SERVARR_LABEL } from '#presentation/shared/servarr-meta'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { InstanceProfileDto } from '#domain/settings/instance-profile'
import type {
  QualityProfileItem,
  QualityProfileRecord,
} from '#domain/settings/quality-profile-record'

const SERIES_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'daily', label: 'Daily' },
  { value: 'anime', label: 'Anime' },
] as const

const MINIMUM_AVAILABILITY_OPTIONS = [
  { value: 'announced', label: 'Announced' },
  { value: 'inCinemas', label: 'In cinemas' },
  { value: 'released', label: 'Released' },
  { value: 'preDB', label: 'PreDB' },
] as const

function itemLabel(item: QualityProfileItem): string {
  return item.quality?.name ?? item.name ?? 'Unknown'
}

function itemKey(item: QualityProfileItem, index: number): string {
  return item.id !== undefined ? `id-${item.id}` : `index-${index}`
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
  const qualityProfiles = useQualityProfiles(kind, open && isEdit)
  const qualitySchema = useQualityProfileSchema(kind, open && !isEdit)
  const createProfile = useCreateInstanceProfile()
  const updateProfile = useUpdateInstanceProfile()
  const queryClient = useQueryClient()

  const [name, setName] = useState(profile?.name ?? '')
  const [rootFolderPath, setRootFolderPath] = useState(profile?.rootFolderPath ?? '')
  const [metadataProfileId, setMetadataProfileId] = useState<number | undefined>(
    profile?.metadataProfileId ?? undefined,
  )
  const [languageProfileId, setLanguageProfileId] = useState<number | undefined>(
    profile?.languageProfileId ?? undefined,
  )
  const [seriesType, setSeriesType] = useState<string | undefined>(profile?.seriesType ?? undefined)
  const [minimumAvailability, setMinimumAvailability] = useState<string | undefined>(
    profile?.minimumAvailability ?? undefined,
  )

  // A profile *is* a Quality Profile now — this is the same editor as the
  // *arr's own "add/edit quality profile" form, hydrated from the schema
  // (new) or the existing record (edit) once it loads.
  const [qualityTemplate, setQualityTemplate] = useState<QualityProfileRecord | null>(null)
  const [items, setItems] = useState<QualityProfileItem[] | null>(null)
  const [cutoff, setCutoff] = useState<number | undefined>(undefined)
  const [upgradeAllowed, setUpgradeAllowed] = useState(false)

  const catalogData = catalog.data?.ok ? catalog.data.value : null
  const pending = createProfile.isPending || updateProfile.isPending
  const canSave =
    name.trim() !== '' &&
    rootFolderPath !== '' &&
    items !== null &&
    cutoff !== undefined &&
    (kind !== 'lidarr' || metadataProfileId !== undefined)

  const knownRootFolders = catalogData?.rootFolders.map((folder) => folder.path) ?? []
  const isKnownRootFolder = knownRootFolders.includes(rootFolderPath)
  const rootFolderListId = `root-folders-${kind}`

  useEffect(() => {
    if (items !== null) return
    if (isEdit) {
      const existing = qualityProfiles.data?.ok
        ? qualityProfiles.data.value.find((record) => record.id === profile.qualityProfileId)
        : undefined
      if (!existing) return
      setQualityTemplate(existing)
      setItems(existing.items)
      setCutoff(existing.cutoff)
      setUpgradeAllowed(existing.upgradeAllowed)
    } else {
      if (!qualitySchema.data?.ok) return
      const template = qualitySchema.data.value
      setQualityTemplate(template)
      setItems(template.items)
      setCutoff(template.cutoff)
      setUpgradeAllowed(template.upgradeAllowed)
    }
  }, [items, isEdit, profile, qualityProfiles.data, qualitySchema.data])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['instance-profiles', kind] })
    void queryClient.invalidateQueries({ queryKey: ['quality-profiles', kind] })
    void queryClient.invalidateQueries({ queryKey: ['instances'] })
  }

  function toggleAllowed(index: number) {
    setItems((current) =>
      current
        ? current.map((item, itemIndex) =>
            itemIndex === index ? { ...item, allowed: !item.allowed } : item,
          )
        : current,
    )
  }

  function handleSave() {
    if (items === null || cutoff === undefined) return
    const draft = {
      name: name.trim(),
      rootFolderPath,
      qualityProfile: { ...(qualityTemplate ?? {}), upgradeAllowed, cutoff, items },
      metadataProfileId,
      languageProfileId,
      seriesType,
      minimumAvailability,
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

  const loadingQuality = isEdit ? qualityProfiles.isLoading : qualitySchema.isLoading
  const qualityError = isEdit
    ? qualityProfiles.data && !qualityProfiles.data.ok
      ? qualityProfiles.data.error.message
      : null
    : qualitySchema.data && !qualitySchema.data.ok
      ? qualitySchema.data.error.message
      : null
  const allowedItems = items?.filter((item) => item.allowed) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit profile' : 'New profile'}</DialogTitle>
          <DialogDescription>
            Creates or edits a real Quality Profile on the {SERVARR_LABEL[kind]} instance, plus the
            root folder and language settings used when requesting with it.
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

          {loadingQuality ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading qualities from the instance…
            </div>
          ) : null}

          {qualityError ? <p className="text-sm text-destructive">{qualityError}</p> : null}

          <div className="flex items-center gap-2">
            <Switch checked={upgradeAllowed} onCheckedChange={setUpgradeAllowed} />
            <Label>Upgrades allowed</Label>
          </div>

          {items ? (
            <>
              <div className="space-y-2">
                <Label>Allowed qualities</Label>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-none border p-2">
                  {items.map((item, index) => (
                    <label
                      key={itemKey(item, index)}
                      className="flex items-center gap-2 rounded-none px-2 py-1.5 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={item.allowed}
                        onChange={() => toggleAllowed(index)}
                      />
                      {itemLabel(item)}
                      {item.items ? (
                        <span className="text-xs text-muted-foreground">(group)</span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cutoff</Label>
                <Select
                  value={cutoff?.toString()}
                  onValueChange={(value) => setCutoff(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a cutoff" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedItems.map((item, index) => (
                      <SelectItem key={itemKey(item, index)} value={String(item.id)}>
                        {itemLabel(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allowedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Allow at least one quality to pick a cutoff.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {kind === 'lidarr' && catalogData?.metadataProfiles ? (
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

            {kind === 'sonarr' && catalogData?.languageProfiles ? (
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

            {kind === 'sonarr' ? (
              <div className="space-y-2">
                <Label>Series type</Label>
                <Select value={seriesType} onValueChange={setSeriesType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a series type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERIES_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {kind === 'radarr' ? (
              <div className="space-y-2">
                <Label>Minimum availability</Label>
                <Select value={minimumAvailability} onValueChange={setMinimumAvailability}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a minimum availability" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINIMUM_AVAILABILITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
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
