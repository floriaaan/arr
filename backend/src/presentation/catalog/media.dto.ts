import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { PosterRef } from '#domain/catalog/poster-ref.vo'
import type { ManagedByInfo } from '#domain/catalog/media-detail.entity'
import type { ImageRefSigner } from '#presentation/shared/interfaces/image-ref-signer.interface'

interface MediaSummaryLike {
  externalId: ExternalId
  kind: MediaKind
  title: string
  year: number | null
  overview: string
  posterRef: PosterRef | null
  alreadyManaged: boolean
}

interface MediaDetailLike extends MediaSummaryLike {
  genres: string[]
  runtimeMinutes?: number
  network?: string
  status?: string
  managedBy?: ManagedByInfo
}

export function toMediaItemDto(item: MediaSummaryLike, signer: ImageRefSigner) {
  return {
    externalId: { scheme: item.externalId.scheme, value: item.externalId.value },
    kind: item.kind,
    title: item.title,
    year: item.year,
    overview: item.overview,
    posterRef: item.posterRef ? signer.sign(item.posterRef.remoteUrl) : null,
    alreadyManaged: item.alreadyManaged,
  }
}

export function toMediaDetailDto(detail: MediaDetailLike, signer: ImageRefSigner) {
  return {
    ...toMediaItemDto(detail, signer),
    genres: detail.genres,
    runtimeMinutes: detail.runtimeMinutes,
    network: detail.network,
    status: detail.status,
    managedBy: detail.managedBy,
  }
}
