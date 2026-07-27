import { z } from 'zod'

export const errorEnvelopeSchema = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})
