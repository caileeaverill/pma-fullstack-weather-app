import { NextResponse } from "next/server"

import { getForecast, searchLocation } from "@/lib/open-meteo"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")
    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")
    /** When resolving coordinates from autocomplete, client sends display labels */
    const placeName = searchParams.get("name")?.trim()
    const placeSubtitle = searchParams.get("subtitle")?.trim()

    if (lat != null && lat !== "" && lon != null && lon !== "") {
      const latitude = Number(lat)
      const longitude = Number(lon)
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return NextResponse.json(
          { error: "Those coordinates are not valid. Use decimal degrees." },
          { status: 400 }
        )
      }
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          { error: "Latitude must be −90–90° and longitude −180–180°." },
          { status: 400 }
        )
      }
      const forecast = await getForecast(latitude, longitude)
      const fromAutocomplete = Boolean(placeName)
      return NextResponse.json({
        location: {
          name: fromAutocomplete
            ? placeName!
            : "Current location",
          subtitle: fromAutocomplete
            ? placeSubtitle || null
            : `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
          country: null as string | null,
          admin1: null as string | null,
          latitude,
          longitude,
        },
        ...forecast,
      })
    }

    if (q != null && q.trim() !== "") {
      const place = await searchLocation(q)
      if (!place) {
        return NextResponse.json(
          {
            error:
              "No location found. Try a city name, postal code, or broader region.",
          },
          { status: 404 }
        )
      }
      const forecast = await getForecast(place.latitude, place.longitude)
      const subtitle = [place.admin1, place.country].filter(Boolean).join(", ")
      return NextResponse.json({
        location: {
          name: place.name,
          subtitle: subtitle || null,
          country: place.country,
          admin1: place.admin1,
          latitude: place.latitude,
          longitude: place.longitude,
        },
        ...forecast,
      })
    }

    return NextResponse.json(
      { error: "Enter a place name or use your current location." },
      { status: 400 }
    )
  } catch (err) {
    console.error("[weather]", err)
    return NextResponse.json(
      {
        error:
          "We could not reach the weather service. Check your connection and try again.",
      },
      { status: 502 }
    )
  }
}
