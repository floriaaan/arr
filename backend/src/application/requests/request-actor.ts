import type { MediaRequest } from '#domain/requests/media-request.aggregate'

/**
 * Who is acting on a request. Carried down to the use cases rather than being
 * checked in the controller: an authorization rule enforced only at the
 * transport layer is one the next caller of the use case silently loses
 * (cf. docs/phase-6-fiabilite-requests, chantier 1 décision 1).
 */
export interface RequestActor {
  id: string
  isAdmin: boolean
}

/** A request is yours to read and cancel; an admin's to read and cancel too. */
export function canActOn(actor: RequestActor, request: MediaRequest): boolean {
  return actor.isAdmin || request.requestedBy === actor.id
}
