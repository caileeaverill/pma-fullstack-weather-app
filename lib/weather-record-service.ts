import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { weatherRecords, type WeatherRecordRow } from "@/lib/db/schema"
import {
  getForecastForDateRange,
  searchLocation,
} from "@/lib/open-meteo"
import type { StoredWeatherSnapshot } from "@/lib/stored-weather"
import type { CreateOrUpdateWeatherRecordInput } from "@/lib/weather-record-validation"

type ResolvedPlace = {
  name: string
  country: string | null
  admin1: string | null
  latitude: number
  longitude: number
}

async function resolvePlace(
  input: CreateOrUpdateWeatherRecordInput
): Promise<ResolvedPlace> {
  if (input.latitude !== undefined && input.longitude !== undefined) {
    return {
      name: `Coordinates (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)})`,
      country: null,
      admin1: null,
      latitude: input.latitude,
      longitude: input.longitude,
    }
  }
  const place = await searchLocation(input.locationQuery!)
  if (!place) {
    throw new Error("LOCATION_NOT_FOUND")
  }
  return {
    name: place.name,
    country: place.country,
    admin1: place.admin1,
    latitude: place.latitude,
    longitude: place.longitude,
  }
}

function buildSnapshot(payload: Awaited<ReturnType<typeof getForecastForDateRange>>): StoredWeatherSnapshot {
  const fetchedAt = new Date().toISOString()
  return {
    timezone: payload.timezone,
    current: payload.current,
    daily: payload.daily,
    fetchedAt,
    airQuality: payload.airQuality,
  }
}

export async function createWeatherRecord(
  input: CreateOrUpdateWeatherRecordInput
): Promise<WeatherRecordRow> {
  const place = await resolvePlace(input)
  const payload = await getForecastForDateRange(
    place.latitude,
    place.longitude,
    input.startDate,
    input.endDate
  )
  const snapshot = buildSnapshot(payload)
  const now = snapshot.fetchedAt
  const id = randomUUID()

  await getDb().insert(weatherRecords).values({
    id,
    locationName: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    country: place.country,
    admin1: place.admin1,
    dateRangeStart: input.startDate,
    dateRangeEnd: input.endDate,
    weatherJson: snapshot,
    createdAt: now,
    updatedAt: now,
  })

  const row = await getDb()
    .select()
    .from(weatherRecords)
    .where(eq(weatherRecords.id, id))
    .limit(1)
  return row[0]!
}

export async function updateWeatherRecord(
  id: string,
  input: CreateOrUpdateWeatherRecordInput
): Promise<WeatherRecordRow> {
  const existing = await getDb()
    .select()
    .from(weatherRecords)
    .where(eq(weatherRecords.id, id))
    .limit(1)
  if (!existing.length) {
    throw new Error("RECORD_NOT_FOUND")
  }

  const place = await resolvePlace(input)
  const payload = await getForecastForDateRange(
    place.latitude,
    place.longitude,
    input.startDate,
    input.endDate
  )
  const snapshot = buildSnapshot(payload)
  const now = snapshot.fetchedAt

  await getDb()
    .update(weatherRecords)
    .set({
      locationName: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      country: place.country,
      admin1: place.admin1,
      dateRangeStart: input.startDate,
      dateRangeEnd: input.endDate,
      weatherJson: snapshot,
      updatedAt: now,
    })
    .where(eq(weatherRecords.id, id))

  const row = await getDb()
    .select()
    .from(weatherRecords)
    .where(eq(weatherRecords.id, id))
    .limit(1)
  return row[0]!
}

export async function getWeatherRecordById(
  id: string
): Promise<WeatherRecordRow | null> {
  const row = await getDb()
    .select()
    .from(weatherRecords)
    .where(eq(weatherRecords.id, id))
    .limit(1)
  return row[0] ?? null
}

export async function deleteWeatherRecord(id: string): Promise<boolean> {
  const existing = await getWeatherRecordById(id)
  if (!existing) return false
  await getDb().delete(weatherRecords).where(eq(weatherRecords.id, id))
  return true
}
