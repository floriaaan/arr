import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { useQualityProfileSchema } from '#application/settings/quality-profile-schema.query'
import { useCreateQualityProfile } from '#application/settings/create-quality-profile.mutation'
import { useUpdateQualityProfile } from '#application/settings/update-quality-profile.mutation'
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
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { QualityProfileItem, QualityProfileRecord } from '#domain/settings/quality-profile-record'

function itemLabel(item: QualityProfileItem): string {
  return item.quality?.name ?? item.name ?? 'Unknown'
}

function itemKey(item: QualityProfileItem, index: number): string {
  return item.id !== undefined ? `id-${item.id}` : `index-${index}`
}

export function QualityProfileFormDialog({
  kind,
  profile,
  open,
  onOpenChange,
}: {
  kind: ServarrKind
  /** `null` creates a new quality profile from the instance's schema, otherwise edits this one. */
  profile: QualityProfileRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isEdit = profile !== null
  const schema = useQualityProfileSchema(kind, open && !isEdit)
  const createProfile = useCreateQualityProfile()
  const updateProfile = useUpdateQualityProfile()
  const queryClient = useQueryClient()

  const [name, setName] = useState(profile?.name ?? '')
  const [upgradeAllowed, setUpgradeAllowed] = useState(profile?.upgradeAllowed ?? false)
  const [items, setItems] = useState<QualityProfileItem[] | null>(profile?.items ?? null)
  const [cutoff, setCutoff] = useState<number | undefined>(profile?.cutoff)
  const [template, setTemplate] = useState<QualityProfileRecord | null>(profile)

  const pending = createProfile.isPending || updateProfile.isPending
  const canSave = name.trim() !== '' && items !== null && cutoff !== undefined

  /** For a new profile, hydrate from the *arr's own schema once it loads. */
  useEffect(() => {
    if (isEdit || items !== null || !schema.data?.ok) return
    const value = schema.data.value
    setTemplate(value)
    setItems(value.items)
    setCutoff(value.cutoff)
    setUpgradeAllowed(value.upgradeAllowed)
  }, [isEdit, items, schema.data])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['quality-profiles', kind] })
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
    const payload: QualityProfileRecord = {
      ...(template ?? {}),
      name: name.trim(),
      upgradeAllowed,
      cutoff,
      items,
    }

    if (isEdit && profile.id !== undefined) {
      updateProfile.mutate(
        { kind, id: profile.id, payload },
        {
          onSuccess: (result) => {
            if (!result.ok) return toast.error(result.error.message)
            toast.success(`"${payload.name}" saved.`)
            invalidate()
            onOpenChange(false)
          },
        },
      )
    } else {
      createProfile.mutate(
        { kind, payload },
        {
          onSuccess: (result) => {
            if (!result.ok) return toast.error(result.error.message)
            toast.success(`"${payload.name}" created.`)
            invalidate()
            onOpenChange(false)
          },
        },
      )
    }
  }

  const allowedItems = items?.filter((item) => item.allowed) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit quality profile' : 'New quality profile'}</DialogTitle>
          <DialogDescription>
            Pushed straight to this {kind} instance — a real Quality Profile there, not a local
            preset.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="HD-1080p, 4K…"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={upgradeAllowed} onCheckedChange={setUpgradeAllowed} />
            <Label>Upgrades allowed</Label>
          </div>

          {schema.isLoading && !isEdit ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading the instance's qualities…
            </div>
          ) : null}

          {schema.data && !schema.data.ok ? (
            <p className="text-sm text-destructive">{schema.data.error.message}</p>
          ) : null}

          {items ? (
            <>
              <div className="space-y-2">
                <Label>Allowed qualities</Label>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                  {items.map((item, index) => (
                    <label
                      key={itemKey(item, index)}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
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
