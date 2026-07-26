export type UserRole = 'admin' | 'user'

export const UserRoles = {
  Admin: 'admin',
  User: 'user',
} as const satisfies Record<string, UserRole>
