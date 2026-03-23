import { NextResponse } from "next/server"

import { searchLocations } from "@/lib/open-meteo"

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")
    if (q == null || q.trim() === "") {
      return NextResponse.json({ results: [] as const })
    }
    const results = await searchLocations(q.trim(), 8)
    return NextResponse.json({ results })
  } catch (err) {
    console.error("[geocode]", err)
    return NextResponse.json(
      { error: "Location search is unavailable. Try again in a moment." },
      { status: 502 }
    )
  }
}
