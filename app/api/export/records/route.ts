import { NextResponse } from "next/server"
import { desc } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { weatherRecords } from "@/lib/db/schema"
import { recordsToCsv, recordsToJson, recordsToPdf } from "@/lib/export-records"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const format = new URL(request.url).searchParams.get("format") ?? "json"
    const rows = await getDb()
      .select()
      .from(weatherRecords)
      .orderBy(desc(weatherRecords.createdAt))

    if (format === "json") {
      return new NextResponse(recordsToJson(rows), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="weather-snapshots.json"',
        },
      })
    }

    if (format === "csv") {
      return new NextResponse(recordsToCsv(rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="weather-snapshots.csv"',
        },
      })
    }

    if (format === "pdf") {
      const bytes = await recordsToPdf(rows)
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="weather-snapshots.pdf"',
        },
      })
    }

    return NextResponse.json(
      { error: "Use format=json, csv, or pdf." },
      { status: 400 }
    )
  } catch (err) {
    console.error("[export/records]", err)
    return NextResponse.json(
      { error: "Export failed." },
      { status: 500 }
    )
  }
}
