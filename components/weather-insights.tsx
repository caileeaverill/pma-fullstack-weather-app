"use client"

import { Leaf, Sparkles, Sunrise, Sunset } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { WeatherApiSuccess } from "@/lib/open-meteo"
import { getSkyTip } from "@/lib/sky-tip"
import { cn } from "@/lib/utils"

type Props = {
  data: WeatherApiSuccess
  unit: "C" | "F"
  formatTemp: (c: number, u: "C" | "F") => number
}

function formatLocalTime(iso: string | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function WeatherInsights({ data, unit, formatTemp }: Props) {
  const nextDayPrecip = data.daily.precip_prob_max[1] ?? data.daily.precip_prob_max[0]
  const tip = getSkyTip({
    weatherCode: data.current.weather_code,
    tempC: data.current.temperature_2m,
    humidityPct: data.current.relative_humidity_2m,
    precipProbNextDay: nextDayPrecip,
    windKmh: data.current.wind_speed_10m,
  })

  const aq = data.airQuality
  const uv = data.daily.uv_index_max?.[0]
  const sunrise = data.daily.sunrise?.[0]
  const sunset = data.daily.sunset?.[0]

  const temps = data.daily.temp_max.map((hi, i) => ({
    hi,
    lo: data.daily.temp_min[i] ?? hi,
    date: data.daily.dates[i] ?? "",
  }))
  const globalMin = Math.min(...temps.map((t) => t.lo))
  const globalMax = Math.max(...temps.map((t) => t.hi))
  const span = Math.max(globalMax - globalMin, 0.1)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/60 bg-card/85 backdrop-blur-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-amber-500" aria-hidden />
            Sky tip
          </CardTitle>
          <CardDescription>Quick planning ideas from your current forecast.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground">{tip}</p>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              5-day temperature band
            </p>
            <div className="flex h-32 items-end justify-between gap-1 sm:gap-2">
              {temps.map((t, i) => {
                const hNorm = (t.hi - globalMin) / span
                return (
                  <div
                    key={t.date + i}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex h-24 w-full max-w-[3rem] items-end justify-center rounded-md bg-muted/40">
                      <div
                        className="w-[70%] rounded-t-md bg-linear-to-t from-sky-600 to-amber-300 shadow-sm"
                        style={{ height: `${Math.max(12, hNorm * 100)}%` }}
                        title={`High ${formatTemp(t.hi, unit)}°${unit} / Low ${formatTemp(t.lo, unit)}°${unit}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium tabular-nums">
                      {formatTemp(t.hi, unit)}°
                    </span>
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      {formatTemp(t.lo, unit)}°
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {i === 0
                        ? "Today"
                        : new Date(`${t.date}T12:00:00`).toLocaleDateString(
                            undefined,
                            { weekday: "narrow" }
                          )}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Column height follows daily high relative to this week&apos;s coolest and warmest.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/85 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="size-4 text-emerald-600" aria-hidden />
            Air &amp; daylight
          </CardTitle>
          <CardDescription>
            Extra Open-Meteo layers: air quality + today&apos;s sun &amp; UV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {aq ? (
            <dl className="space-y-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">EU AQI</dt>
                <dd className="font-medium tabular-nums">
                  {aq.europeanAqi ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">US AQI</dt>
                <dd className="font-medium tabular-nums">{aq.usAqi ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">PM2.5</dt>
                <dd className="font-medium tabular-nums">
                  {aq.pm2_5 != null ? `${aq.pm2_5.toFixed(1)} µg/m³` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">PM10</dt>
                <dd className="font-medium tabular-nums">
                  {aq.pm10 != null ? `${aq.pm10.toFixed(1)} µg/m³` : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">
              Air quality data unavailable for this point (API limit or network).
            </p>
          )}

          <div className="border-t border-border/50 pt-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Sunrise className="size-3.5 text-amber-500" aria-hidden />
                Sunrise
              </span>
              <span className="font-medium">{formatLocalTime(sunrise)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Sunset className="size-3.5 text-orange-500" aria-hidden />
                Sunset
              </span>
              <span className="font-medium">{formatLocalTime(sunset)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">UV index (max today)</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  uv != null && uv >= 6 && "text-amber-600"
                )}
              >
                {uv != null ? uv.toFixed(1) : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
