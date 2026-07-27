import { z } from 'zod'

export const authenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'user']),
})

export const sessionSchema = z.object({
  user: authenticatedUserSchema.nullable(),
})
