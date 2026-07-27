export type UserRole = 'admin' | 'user'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
}
