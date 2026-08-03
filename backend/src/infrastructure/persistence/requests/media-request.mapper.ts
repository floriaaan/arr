import { DateTime } from 'luxon'
import type MediaRequestLucidModel from './media_request.lucid.js'
import { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalId, type ExternalIdScheme } from '#domain/catalog/external-id.vo'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { RequestStatus } from '#domain/requests/request-status.vo'
import type { RequestOrigin } from '#domain/requests/request-origin.vo'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import { RequestProgress } from '#domain/requests/request-progress.vo'
import type { Result } from '#domain/shared/result'
import type { ValidationError } from '#domain/shared/validation-error'

function okOrThrow<T>(result: Result<T, ValidationError>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

export function toDomain(row: MediaRequestLucidModel): MediaRequest {
  const externalId = okOrThrow(
    ExternalId.create(row.externalIdScheme as ExternalIdScheme, row.externalIdValue),
  )

  const externalRef = row.externalRefRemoteId
    ? ExternalRef.create(row.servarrInstanceId, row.externalRefRemoteId)
    : null

  const progress =
    row.progressPercentage !== null &&
    row.progressSizeLeftBytes !== null &&
    row.progressStepLabel !== null
      ? okOrThrow(
          RequestProgress.create({
            percentage: Number(row.progressPercentage),
            sizeLeftBytes: Number(row.progressSizeLeftBytes),
            eta: row.progressEta?.toJSDate() ?? null,
            stepLabel: row.progressStepLabel,
          }),
        )
      : null

  return MediaRequest.reconstruct(row.id, {
    requestedBy: row.requestedByUserId,
    kind: row.kind as MediaKind,
    externalId,
    title: row.title,
    instanceId: row.servarrInstanceId,
    externalRef,
    status: row.status as RequestStatus,
    progress,
    failureReason: row.failureReason,
    origin: row.origin as RequestOrigin,
    requiresApproval: row.requiresApproval,
    approvedAt: row.approvedAt?.toJSDate() ?? null,
    approvedByUserId: row.approvedByUserId,
    rejectedAt: row.rejectedAt?.toJSDate() ?? null,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toJSDate(),
    updatedAt: row.updatedAt.toJSDate(),
  })
}

export function applyToModel(request: MediaRequest, model: MediaRequestLucidModel): void {
  model.id = request.id
  model.requestedByUserId = request.requestedBy
  model.kind = request.kind
  model.externalIdScheme = request.externalId.scheme
  model.externalIdValue = request.externalId.value
  model.title = request.title
  model.servarrInstanceId = request.instanceId
  model.externalRefRemoteId = request.externalRef?.remoteId ?? null
  model.status = request.status
  model.progressPercentage = request.progress?.percentage ?? null
  model.progressSizeLeftBytes = request.progress?.sizeLeftBytes ?? null
  model.progressEta = request.progress?.eta ? DateTime.fromJSDate(request.progress.eta) : null
  model.progressStepLabel = request.progress?.stepLabel ?? null
  model.failureReason = request.failureReason
  model.origin = request.origin
  model.requiresApproval = request.requiresApproval
  model.approvedAt = request.approvedAt ? DateTime.fromJSDate(request.approvedAt) : null
  model.approvedByUserId = request.approvedByUserId
  model.rejectedAt = request.rejectedAt ? DateTime.fromJSDate(request.rejectedAt) : null
  model.rejectionReason = request.rejectionReason
}
