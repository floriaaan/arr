import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { PosterRef } from '#domain/catalog/poster-ref.vo'
import type { ImageRefSigner } from '#presentation/shared/interfaces/image-ref-signer.interface'

interface LibraryItemLike {
  externalId: ExternalId
  kind: MediaKind
  title: string
  year: number | null
  posterRef: PosterRef | null
  monitored: boolean
  hasFile: boolean
  sizeOnDiskBytes: number
  status: string
  instanceId: string
}

export function toLibraryItemDto(item: LibraryItemLike, signer: ImageRefSigner) {
  return {
    externalId: { scheme: item.externalId.scheme, value: item.externalId.value },
    kind: item.kind,
    title: item.title,
    year: item.year,
    posterRef: item.posterRef ? signer.sign(item.posterRef.remoteUrl) : null,
    monitored: item.monitored,
    hasFile: item.hasFile,
    sizeOnDiskBytes: item.sizeOnDiskBytes,
    status: item.status,
    instanceId: item.instanceId,
  }
}
