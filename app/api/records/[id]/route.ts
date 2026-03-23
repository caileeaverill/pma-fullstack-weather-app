import { NextResponse } from "next/server"

import {
  deleteWeatherRecord,
  getWeatherRecordById,
  updateWeatherRecord,
} from "@/lib/weather-record-service"
import { createOrUpdateWeatherRecordBody } from "@/lib/weather-record-validation"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  try {
    const record = await getWeatherRecordById(id)
    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 })
    }
    return NextResponse.json({ record })
  } catch (err) {
    console.error("[records/[id] GET]", err)
    return NextResponse.json(
      { error: "Could not load the record." },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
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
    const record = await updateWeatherRecord(id, parsed.data)
    return NextResponse.json({ record })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "RECORD_NOT_FOUND") {
        return NextResponse.json({ error: "Record not found." }, { status: 404 })
      }
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
    console.error("[records/[id] PATCH]", err)
    return NextResponse.json(
      { error: "Could not update the record." },
      { status: 502 }
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  try {
    const removed = await deleteWeatherRecord(id)
    if (!removed) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[records/[id] DELETE]", err)
    return NextResponse.json(
      { error: "Could not delete the record." },
      { status: 500 }
    )
  }
}
