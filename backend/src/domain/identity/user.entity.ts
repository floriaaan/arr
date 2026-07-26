import { Entity } from '#domain/shared/entity'
import { AuthenticatedUser } from './authenticated-user.vo.js'
import type { Email } from './email.vo.js'
import type { UserRole } from './user-role.vo.js'

interface UserProps {
  email: Email
  role: UserRole
  createdAt: Date
}

/**
 * Read model reconstructed from the better-auth tables — never written to
 * directly by this domain (cf. docs/adr/0005-better-auth-tables-identite.md).
 * There is no setter for `role`: a role change only ever happens through
 * better-auth's own admin plugin.
 */
export class User extends Entity<string> {
  private props: UserProps

  private constructor(id: string, props: UserProps) {
    super(id)
    this.props = props
  }

  static create(id: string, props: UserProps): User {
    return new User(id, props)
  }

  get email(): Email {
    return this.props.email
  }

  get role(): UserRole {
    return this.props.role
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  toAuthenticatedUser(): AuthenticatedUser {
    return AuthenticatedUser.create({ id: this.id, email: this.props.email, role: this.props.role })
  }
}
