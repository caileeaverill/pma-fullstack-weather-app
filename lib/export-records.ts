import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

import type { WeatherRecordRow } from "@/lib/db/schema"

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function recordsToJson(rows: WeatherRecordRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      locationName: r.locationName,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      admin1: r.admin1,
      dateRangeStart: r.dateRangeStart,
      dateRangeEnd: r.dateRangeEnd,
      weatherJson: r.weatherJson,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    null,
    2
  )
}

export function recordsToCsv(rows: WeatherRecordRow[]): string {
  const header = [
    "id",
    "location_name",
    "latitude",
    "longitude",
    "country",
    "admin1",
    "date_range_start",
    "date_range_end",
    "created_at",
    "updated_at",
  ]
  const lines = [header.join(",")]
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.locationName),
        String(r.latitude),
        String(r.longitude),
        csvEscape(r.country ?? ""),
        csvEscape(r.admin1 ?? ""),
        r.dateRangeStart,
        r.dateRangeEnd,
        csvEscape(r.createdAt),
        csvEscape(r.updatedAt),
      ].join(",")
    )
  }
  return lines.join("\n")
}

export async function recordsToPdf(rows: WeatherRecordRow[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  let page = doc.addPage([595, 842])
  const { width, height } = page.getSize()
  let y = height - 48
  const margin = 48
  const line = 14

  page.drawText("Skyline Weather — saved snapshots", {
    x: margin,
    y,
    size: 16,
    font: bold,
    color: rgb(0.1, 0.1, 0.15),
  })
  y -= 28

  if (rows.length === 0) {
    page.drawText("No records to export.", { x: margin, y, size: 11, font })
  } else {
    for (const r of rows) {
      const block = [
        r.locationName,
        `${r.dateRangeStart} → ${r.dateRangeEnd}`,
        `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`,
        `Updated: ${r.updatedAt}`,
      ]
      for (const lineText of block) {
        if (y < margin + 40) {
          page = doc.addPage([595, 842])
          y = height - 48
        }
        page.drawText(lineText, {
          x: margin,
          y,
          size: 10,
          font,
          color: rgb(0.2, 0.2, 0.25),
          maxWidth: width - 2 * margin,
        })
        y -= line
      }
      y -= 8
    }
  }

  return doc.save()
}
