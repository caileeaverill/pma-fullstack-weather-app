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
  /** ISO local times from Open-Meteo, aligned with `dates` */
  sunrise?: string[]
  sunset?: string[]
  uv_index_max?: number[]
}

/** Open-Meteo Air Quality API — current hour */
export type AirQualityCurrent = {
  europeanAqi: number | null
  usAqi: number | null
  pm10: number | null
  pm2_5: number | null
}

export type ForecastPayload = {
  timezone: string
  current: CurrentWeather
  daily: DailyForecast
  /** Present when the air-quality API succeeds */
  airQuality: AirQualityCurrent | null
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
const AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality"

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
    sunrise?: string[]
    sunset?: string[]
    uv_index_max?: number[]
  }
}

function mapDailyFromApi(daily: ForecastApiResponse["daily"]): DailyForecast {
  const base: DailyForecast = {
    dates: daily.time,
    weather_codes: daily.weather_code,
    temp_max: daily.temperature_2m_max,
    temp_min: daily.temperature_2m_min,
    precip_prob_max: daily.precipitation_probability_max,
  }
  if (daily.sunrise?.length) base.sunrise = daily.sunrise
  if (daily.sunset?.length) base.sunset = daily.sunset
  if (daily.uv_index_max?.length) base.uv_index_max = daily.uv_index_max
  return base
}

type AirQualityApiResponse = {
  current?: {
    european_aqi?: number
    us_aqi?: number
    pm10?: number
    pm2_5?: number
  }
}

export async function fetchAirQualityCurrent(
  latitude: number,
  longitude: number
): Promise<AirQualityCurrent | null> {
  try {
    const url = `${AIR_QUALITY_BASE}?${new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "european_aqi,us_aqi,pm10,pm2_5",
      timezone: "auto",
    })}`
    const data = await fetchJson<AirQualityApiResponse>(url)
    const c = data.current
    if (!c) return null
    return {
      europeanAqi: c.european_aqi ?? null,
      usAqi: c.us_aqi ?? null,
      pm10: c.pm10 ?? null,
      pm2_5: c.pm2_5 ?? null,
    }
  } catch {
    return null
  }
}

const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "sunrise",
  "sunset",
  "uv_index_max",
].join(",")

/** Keep only calendar days within [rangeStart, rangeEnd] (YYYY-MM-DD) */
export function filterDailyForecast(
  daily: DailyForecast,
  rangeStart: string,
  rangeEnd: string
): DailyForecast {
  const idxs: number[] = []
  for (let i = 0; i < daily.dates.length; i++) {
    const d = daily.dates[i]
    if (d >= rangeStart && d <= rangeEnd) idxs.push(i)
  }
  if (idxs.length === 0) {
    throw new Error("NO_DAYS_IN_RANGE")
  }
  const pick = <T>(arr: T[] | undefined) =>
    arr ? idxs.map((i) => arr[i]) : undefined
  const out: DailyForecast = {
    dates: idxs.map((i) => daily.dates[i]),
    weather_codes: idxs.map((i) => daily.weather_codes[i]),
    temp_max: idxs.map((i) => daily.temp_max[i]),
    temp_min: idxs.map((i) => daily.temp_min[i]),
    precip_prob_max: idxs.map((i) => daily.precip_prob_max[i]),
  }
  const sr = pick(daily.sunrise)
  const ss = pick(daily.sunset)
  const uv = pick(daily.uv_index_max)
  if (sr) out.sunrise = sr
  if (ss) out.sunset = ss
  if (uv) out.uv_index_max = uv
  return out
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
    daily: DAILY_VARS,
    timezone: "auto",
    forecast_days: "5",
  })}`

  const [data, airQuality] = await Promise.all([
    fetchJson<ForecastApiResponse>(url),
    fetchAirQualityCurrent(latitude, longitude),
  ])

  return {
    timezone: data.timezone,
    current: data.current,
    daily: mapDailyFromApi(data.daily),
    airQuality,
  }
}

/**
 * Uses past + forecast days from Open-Meteo, then filters to the requested inclusive range.
 */
export async function getForecastForDateRange(
  latitude: number,
  longitude: number,
  rangeStart: string,
  rangeEnd: string
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
    daily: DAILY_VARS,
    timezone: "auto",
    past_days: "7",
    forecast_days: "16",
  })}`

  const [data, airQuality] = await Promise.all([
    fetchJson<ForecastApiResponse>(url),
    fetchAirQualityCurrent(latitude, longitude),
  ])
  const dailyFull = mapDailyFromApi(data.daily)
  const daily = filterDailyForecast(dailyFull, rangeStart, rangeEnd)

  return {
    timezone: data.timezone,
    current: data.current,
    daily,
    airQuality,
  }
}
