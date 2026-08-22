import type { ReactNode } from 'react'
import { Pencil, Trash2, Split, Merge } from 'lucide-react'
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
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { MergedRecord } from '#domain/settings/merge-servarr-records'
import type { LucideIcon } from 'lucide-react'

export interface KindMeta {
  label: string
  icon: LucideIcon
}

/**
 * Shared by the download-clients and indexers pages — a `MergedRecord<T>`
 * displays merged by default (one card, group Edit/Delete), with a
 * "Demerge" toggle that splits it into one row per instance with
 * independent actions (cf. docs/phase-4-download-clients-indexers
 * decision 4). The toggle is purely client state owned by the caller — it
 * is not persisted, so a reload always starts merged again.
 */
export function MergedRecordCard<T extends { id?: number }>({
  merged,
  kindMeta,
  missingKinds,
  demerged,
  onToggleDemerge,
  renderInstanceStatus,
  onEditGroup,
  onEditInstance,
  onDeleteGroup,
  onDeleteInstance,
}: {
  merged: MergedRecord<T>
  kindMeta: Record<ServarrKind, KindMeta>
  missingKinds: ServarrKind[]
  demerged: boolean
  onToggleDemerge: () => void
  renderInstanceStatus: (record: T) => ReactNode
  onEditGroup: () => void
  onEditInstance: (kind: ServarrKind, record: T) => void
  onDeleteGroup: () => void
  onDeleteInstance: (kind: ServarrKind, record: T) => void
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2">
            {merged.name}
            <Badge variant="outline">{merged.implementation}</Badge>
            <Badge variant="outline" className="capitalize">
              {merged.protocol}
            </Badge>
          </CardTitle>
          <CardDescription className="mt-1 flex flex-wrap items-center gap-1.5">
            {merged.perInstance.map(({ kind }) => {
              const Icon = kindMeta[kind].icon
              return (
                <Badge key={kind} className="gap-1">
                  <Icon className="size-3" />
                  {kindMeta[kind].label}
                </Badge>
              )
            })}
            {missingKinds.map((kind) => {
              const Icon = kindMeta[kind].icon
              return (
                <Badge key={kind} variant="outline" className="gap-1 text-muted-foreground">
                  <Icon className="size-3" />
                  Not on {kindMeta[kind].label}
                </Badge>
              )
            })}
          </CardDescription>
        </div>

        <Button variant="ghost" size="sm" onClick={onToggleDemerge}>
          {demerged ? <Merge className="size-4" /> : <Split className="size-4" />}
          {demerged ? 'Merge back' : 'Demerge'}
        </Button>

        {!demerged ? (
          <>
            <Button variant="ghost" size="sm" onClick={onEditGroup}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &quot;{merged.name}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes it from{' '}
                    {merged.perInstance.map(({ kind }) => kindMeta[kind].label).join(', ')}. This
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteGroup}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </CardHeader>

      {demerged ? (
        <CardContent className="space-y-2 border-t pt-6">
          {merged.perInstance.map(({ kind, record }) => {
            const Icon = kindMeta[kind].icon
            return (
              <div key={kind} className="flex items-center gap-3 rounded-none border px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Badge className="gap-1 shrink-0">
                    <Icon className="size-3" />
                    {kindMeta[kind].label}
                  </Badge>
                  {renderInstanceStatus(record)}
                </div>

                <Button variant="ghost" size="sm" onClick={() => onEditInstance(kind, record)}>
                  <Pencil className="size-4" />
                  Edit
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete &quot;{merged.name}&quot; on {kindMeta[kind].label}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Only removes it from {kindMeta[kind].label} — other instances are
                        unaffected. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteInstance(kind, record)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )
          })}
        </CardContent>
      ) : null}
    </Card>
  )
}
