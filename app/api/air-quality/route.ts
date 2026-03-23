import { NextResponse } from "next/server"

import { fetchAirQualityCurrent } from "@/lib/open-meteo"

/** Standalone air-quality lookup (also embedded in `/api/weather`). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")
  if (lat == null || lon == null || lat === "" || lon === "") {
    return NextResponse.json(
      { error: "Provide lat and lon query parameters." },
      { status: 400 }
    )
  }
  const latitude = Number(lat)
  const longitude = Number(lon)
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 })
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Coordinates out of range." }, { status: 400 })
  }
  try {
    const airQuality = await fetchAirQualityCurrent(latitude, longitude)
    if (!airQuality) {
      return NextResponse.json(
        { error: "Air quality data unavailable for this location." },
        { status: 502 }
      )
    }
    return NextResponse.json({ latitude, longitude, airQuality })
  } catch (err) {
    console.error("[air-quality]", err)
    return NextResponse.json(
      { error: "Could not load air quality." },
      { status: 502 }
    )
  }
}
