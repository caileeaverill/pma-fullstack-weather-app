export type GeocodeResult = {
  name: string
  country: string | null
  admin1: string | null
  latitude: number
  longitude: number
}

export type CurrentWeather = {
  time: string
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  precipitation: number
  weather_code: number
  wind_speed_10m: number
  wind_direction_10m: number
}

export type DailyForecast = {
  dates: string[]
  weather_codes: number[]
  temp_max: number[]
  temp_min: number[]
  precip_prob_max: number[]
}

export type ForecastPayload = {
  timezone: string
  current: CurrentWeather
  daily: DailyForecast
}

export type WeatherLocation = {
  name: string
  subtitle: string | null
  country: string | null
  admin1: string | null
  latitude: number
  longitude: number
}

export type WeatherApiSuccess = ForecastPayload & {
  location: WeatherLocation
}

const GEOCODE_BASE = "https://geocoding-api.open-meteo.com/v1/search"
const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast"

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

type GeocodeResponse = {
  results?: Array<{
    name: string
    country?: string
    admin1?: string
    latitude: number
    longitude: number
  }>
}

function mapGeocodeResults(data: GeocodeResponse): GeocodeResult[] {
  if (!data.results?.length) return []
  return data.results.map((r) => ({
    name: r.name,
    country: r.country ?? null,
    admin1: r.admin1 ?? null,
    latitude: r.latitude,
    longitude: r.longitude,
  }))
}

/** Multiple matches for search-as-you-type autocomplete */
export async function searchLocations(
  query: string,
  count = 8
): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const url = `${GEOCODE_BASE}?${new URLSearchParams({
    name: trimmed,
    count: String(count),
    language: "en",
    format: "json",
  })}`

  const data = await fetchJson<GeocodeResponse>(url)
  return mapGeocodeResults(data)
}

export async function searchLocation(
  query: string
): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const url = `${GEOCODE_BASE}?${new URLSearchParams({
    name: trimmed,
    count: "5",
    language: "en",
    format: "json",
  })}`

  const data = await fetchJson<GeocodeResponse>(url)
  const first = data.results?.[0]
  if (!first) return null

  return {
    name: first.name,
    country: first.country ?? null,
    admin1: first.admin1 ?? null,
    latitude: first.latitude,
    longitude: first.longitude,
  }
}

type ForecastApiResponse = {
  timezone: string
  current: CurrentWeather
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
  }
}

export async function getForecast(
  latitude: number,
  longitude: number
): Promise<ForecastPayload> {
  const url = `${FORECAST_BASE}?${new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
    ].join(","),
    timezone: "auto",
    forecast_days: "5",
  })}`

  const data = await fetchJson<ForecastApiResponse>(url)

  return {
    timezone: data.timezone,
    current: data.current,
    daily: {
      dates: data.daily.time,
      weather_codes: data.daily.weather_code,
      temp_max: data.daily.temperature_2m_max,
      temp_min: data.daily.temperature_2m_min,
      precip_prob_max: data.daily.precipitation_probability_max,
    },
  }
}
