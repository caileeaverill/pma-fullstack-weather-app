import { desc } from "drizzle-orm"
import { NextResponse } from "next/server"

import { getDb } from "@/lib/db"
import { weatherRecords } from "@/lib/db/schema"
import { createWeatherRecord } from "@/lib/weather-record-service"
import { createOrUpdateWeatherRecordBody } from "@/lib/weather-record-validation"

export const runtime = "nodejs"

export async function GET() {
  try {
    const records = await getDb()
      .select()
      .from(weatherRecords)
      .orderBy(desc(weatherRecords.createdAt))
    return NextResponse.json({ records })
  } catch (err) {
    console.error("[records GET]", err)
    return NextResponse.json(
      { error: "Could not read saved weather records." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 })
  }

  const parsed = createOrUpdateWeatherRecordBody.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const record = await createWeatherRecord(parsed.data)
    return NextResponse.json({ record }, { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "LOCATION_NOT_FOUND") {
        return NextResponse.json(
          { error: "No location found for that search." },
          { status: 404 }
        )
      }
      if (err.message === "NO_DAYS_IN_RANGE") {
        return NextResponse.json(
          {
            error:
              "No forecast days fall in that range for this location. Adjust dates within the allowed window.",
          },
          { status: 422 }
        )
      }
    }
    console.error("[records POST]", err)
    return NextResponse.json(
      { error: "Could not create the weather record." },
      { status: 502 }
    )
  }
}
