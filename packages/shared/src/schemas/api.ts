/**
 * API Response — Standard transport wrapper
 *
 * DDD Role: Infrastructure (transport layer, not a domain concept)
 *
 * Every backend endpoint returns this shape. Frontend Axios calls
 * expect this contract. The generic `T` is the domain-specific payload.
 *
 * Contract: { success: boolean, message?: string, data?: T }
 */
import { z } from 'zod'

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string().optional(),
    data: dataSchema.optional(),
  })

export type IApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}
