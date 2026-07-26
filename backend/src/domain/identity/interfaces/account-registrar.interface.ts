import type { Result } from '#domain/shared/result'
import type { Email } from '../email.vo.js'
import type { UserRole } from '../user-role.vo.js'
import type { User } from '../user.entity.js'

export type RegistrationError = 'email_already_used' | 'weak_password'

export interface AccountRegistrar {
  register(email: Email, password: string, role: UserRole): Promise<Result<User, RegistrationError>>
}
