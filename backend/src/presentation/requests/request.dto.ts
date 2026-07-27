import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'

export async function toMediaRequestDto(request: MediaRequest, userDirectory: UserDirectory) {
  const user = await userDirectory.findById(request.requestedBy)
  const progress = request.progress

  return {
    id: request.id,
    requestedBy: { id: request.requestedBy, email: user?.email.value ?? null },
    kind: request.kind,
    externalId: { scheme: request.externalId.scheme, value: request.externalId.value },
    title: request.title,
    status: request.status,
    progress: progress
      ? {
          percentage: progress.percentage,
          sizeLeftBytes: progress.sizeLeftBytes,
          eta: progress.eta ? progress.eta.toISOString() : null,
          stepLabel: progress.stepLabel,
        }
      : null,
    failureReason: request.failureReason,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  }
}

export function toMediaRequestDtoList(requests: MediaRequest[], userDirectory: UserDirectory) {
  return Promise.all(requests.map((request) => toMediaRequestDto(request, userDirectory)))
}
