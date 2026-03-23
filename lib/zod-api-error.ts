import type { ZodError } from "zod"

/** First human-readable message for API JSON responses */
export function zodErrorPayload(error: ZodError) {
  const flat = error.flatten()
  const first = error.issues[0]?.message
  return {
    error: first ?? "Validation failed",
    details: flat,
  }
}
