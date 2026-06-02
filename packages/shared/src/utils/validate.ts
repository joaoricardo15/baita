import { ZodError, ZodSchema } from 'zod'

export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown,
  label: string
): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new Error(`Invalid ${label}: ${formatZodError(result.error)}`)
  }
  return result.data
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((i) =>
      i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message
    )
    .join(', ')
}
