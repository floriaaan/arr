import type { CalendarEntryKind } from '#domain/catalog/calendar-entry.entity'
import type { PosterRef } from '#domain/catalog/poster-ref.vo'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { ImageRefSigner } from '#presentation/shared/interfaces/image-ref-signer.interface'

interface CalendarEntryLike {
  entryId: string
  kind: CalendarEntryKind
  title: string
  subtitle: string | null
  releaseDate: string
  posterRef: PosterRef | null
  monitored: boolean
  hasFile: boolean
  instanceId: string
  externalId: ExternalId | null
}

export function toCalendarEntryDto(entry: CalendarEntryLike, signer: ImageRefSigner) {
  return {
    id: entry.entryId,
    kind: entry.kind,
    title: entry.title,
    subtitle: entry.subtitle,
    releaseDate: entry.releaseDate,
    posterRef: entry.posterRef ? signer.sign(entry.posterRef.remoteUrl) : null,
    monitored: entry.monitored,
    hasFile: entry.hasFile,
    instanceId: entry.instanceId,
    externalId: entry.externalId
      ? { scheme: entry.externalId.scheme, value: entry.externalId.value }
      : null,
  }
}
