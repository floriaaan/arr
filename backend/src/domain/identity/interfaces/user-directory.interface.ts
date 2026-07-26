import type { Email } from '../email.vo.js'
import type { User } from '../user.entity.js'

export interface UserDirectory {
  findByEmail(email: Email): Promise<User | null>
  existsAny(): Promise<boolean>
}
