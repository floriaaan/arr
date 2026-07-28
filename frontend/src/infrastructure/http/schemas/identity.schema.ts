import { z } from 'zod'

export const authenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'user']),
})

export const sessionSchema = z.object({
  user: authenticatedUserSchema.nullable(),
})

export const userAccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'user']),
  createdAt: z.coerce.date().transform((date) => date.toISOString()),
})

export const listUsersResponseSchema = z.object({
  users: userAccountSchema.array(),
})

export const setUserRoleResponseSchema = z.object({
  user: userAccountSchema,
})
