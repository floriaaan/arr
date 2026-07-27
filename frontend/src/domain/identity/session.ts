import type { AuthenticatedUser } from './user'

export type Session = { user: AuthenticatedUser } | { user: null }
