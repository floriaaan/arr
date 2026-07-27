import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'
import { Email } from '#domain/identity/email.vo'
import { User } from '#domain/identity/user.entity'
import type { UserRole } from '#domain/identity/user-role.vo'

interface UserRow {
  id: string
  email: string
  role: string
  created_at: Date | string
}

function toDomain(row: UserRow): User {
  const email = Email.create(row.email)
  if (!email.ok) throw new Error(`Corrupted user row ${row.id}: ${email.error.message}`)

  const createdAt =
    row.created_at instanceof Date ? row.created_at : DateTime.fromSQL(row.created_at).toJSDate()
  return User.create(row.id, {
    email: email.value,
    role: row.role as UserRole,
    createdAt,
  })
}

/**
 * Reads directly from better-auth's own `user` table — read-only, no writes.
 * All account creation/role changes go through better-auth's own API
 * (cf. docs/adr/0005-better-auth-tables-identite.md), never through here.
 */
export class BetterAuthUserDirectory implements UserDirectory {
  async findById(id: string): Promise<User | null> {
    const row = await db.from('user').where('id', id).first()
    return row ? toDomain(row) : null
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await db.from('user').where('email', email.value).first()
    return row ? toDomain(row) : null
  }

  async existsAny(): Promise<boolean> {
    const row = await db.from('user').select('id').first()
    return row !== null
  }
}
