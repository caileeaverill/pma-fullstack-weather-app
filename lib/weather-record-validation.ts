import { z } from "zod"

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")

/** Open-Meteo forecast window: past_days up to 7 and forecast_days up to 16 in our integration */
const MAX_RANGE_DAYS = 14
const PAST_DAYS_AVAILABLE = 7
const FUTURE_DAYS_AVAILABLE = 16

function utcDateString(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseDay(iso: string): number {
  return Date.parse(`${iso}T12:00:00.000Z`)
}

export function allowedDateWindow(): { min: string; max: string } {
  const now = new Date()
  const minD = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - PAST_DAYS_AVAILABLE
    )
  )
  const maxD = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + FUTURE_DAYS_AVAILABLE
    )
  )
  return { min: utcDateString(minD), max: utcDateString(maxD) }
}

export const createOrUpdateWeatherRecordBody = z
  .object({
    locationQuery: z.string().trim().min(1).optional(),
    latitude: z.number().gte(-90).lte(90).optional(),
    longitude: z.number().gte(-180).lte(180).optional(),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine(
    (d) =>
      (d.latitude !== undefined && d.longitude !== undefined) ||
      (d.locationQuery !== undefined && d.locationQuery.length > 0),
    {
      message:
        "Provide either locationQuery (non-empty) or both latitude and longitude.",
      path: ["locationQuery"],
    }
  )
  .refine(
    (d) =>
      d.latitude === undefined ||
      (d.latitude !== undefined && d.longitude !== undefined),
    { message: "latitude and longitude must be provided together.", path: ["latitude"] }
  )
  .refine(
    (d) =>
      d.longitude === undefined ||
      (d.latitude !== undefined && d.longitude !== undefined),
    { message: "latitude and longitude must be provided together.", path: ["longitude"] }
  )
  .refine((d) => d.endDate >= d.startDate, {
    message: "endDate must be on or after startDate.",
    path: ["endDate"],
  })
  .refine((d) => {
    const span =
      (parseDay(d.endDate) - parseDay(d.startDate)) / 86400000 + 1
    return span >= 1 && span <= MAX_RANGE_DAYS
  }, {
    message: `Date range must be 1–${MAX_RANGE_DAYS} calendar days (inclusive).`,
    path: ["endDate"],
  })
  .refine(
    (d) => {
      const { min, max } = allowedDateWindow()
      return d.startDate >= min && d.endDate <= max
    },
    {
      message: `Dates must fall within the forecast window (${PAST_DAYS_AVAILABLE} days past through ${FUTURE_DAYS_AVAILABLE} days ahead, UTC).`,
      path: ["startDate"],
    }
  )

export type CreateOrUpdateWeatherRecordInput = z.infer<
  typeof createOrUpdateWeatherRecordBody
>
