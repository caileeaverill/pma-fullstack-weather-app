import type {
  AirQualityCurrent,
  CurrentWeather,
  DailyForecast,
} from "@/lib/open-meteo"

/** Shape stored in `weather_records.weather_json` */
export type StoredWeatherSnapshot = {
  timezone: string
  current: CurrentWeather
  daily: DailyForecast
  fetchedAt: string
  airQuality?: AirQualityCurrent | null
}
