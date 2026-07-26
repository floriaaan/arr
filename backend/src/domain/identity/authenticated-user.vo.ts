import { ValueObject } from '#domain/shared/value-object'
import type { Email } from './email.vo.js'
import type { UserRole } from './user-role.vo.js'

interface AuthenticatedUserProps {
  id: string
  email: Email
  role: UserRole
}

export class AuthenticatedUser extends ValueObject<AuthenticatedUserProps> {
  private constructor(props: AuthenticatedUserProps) {
    super(props)
  }

  static create(props: AuthenticatedUserProps): AuthenticatedUser {
    return new AuthenticatedUser(props)
  }

  get id(): string {
    return this.props.id
  }

  get email(): Email {
    return this.props.email
  }

  get role(): UserRole {
    return this.props.role
  }

  isAdmin(): boolean {
    return this.props.role === 'admin'
  }
}
