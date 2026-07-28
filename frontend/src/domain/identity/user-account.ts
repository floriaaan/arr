import type { UserRole } from './user'

export interface UserAccount {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}
