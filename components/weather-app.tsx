"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Loader2, MapPin, Navigation, Search } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { GeocodeResult, WeatherApiSuccess } from "@/lib/open-meteo"
import { formatDayLabel, windDirectionLabel } from "@/lib/weather-format"
import { getWeatherVisual } from "@/lib/weather-codes"
import { cn } from "@/lib/utils"

type ApiErrorBody = { error?: string }

function formatPlaceSubtitle(p: GeocodeResult): string | null {
  return [p.admin1, p.country].filter(Boolean).join(", ") || null
}

function formatPlaceLine(p: GeocodeResult): string {
  const sub = formatPlaceSubtitle(p)
  return sub ? `${p.name}, ${sub}` : p.name
}

function cToF(c: number) {
  return (c * 9) / 5 + 32
}

function formatTemp(value: number, unit: "C" | "F") {
  const n = unit === "F" ? cToF(value) : value
  return Math.round(n)
}

export function WeatherApp() {
  const listId = useId()
  const suggestAbortRef = useRef<AbortController | null>(null)
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [query, setQuery] = useState("")
  const [data, setData] = useState<WeatherApiSuccess | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [unit, setUnit] = useState<"C" | "F">("C")

  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)

  const loadFromUrl = useCallback(async (url: string) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(url)
      const body = (await res.json()) as WeatherApiSuccess & ApiErrorBody
      if (!res.ok) {
        setData(null)
        setError(body.error ?? "Something went wrong.")
        return
      }
      setData(body as WeatherApiSuccess)
    } catch {
      setData(null)
      setError(
        "Could not load weather. Check your network connection and try again."
      )
    } finally {
      setLoading(false)
      setGeoLoading(false)
    }
  }, [])

  const selectPlace = useCallback(
    (p: GeocodeResult) => {
      setSuggestOpen(false)
      setSuggestions([])
      setHighlightIdx(-1)
      setQuery(formatPlaceLine(p))
      const params = new URLSearchParams({
        lat: String(p.latitude),
        lon: String(p.longitude),
        name: p.name,
      })
      const sub = formatPlaceSubtitle(p)
      if (sub) params.set("subtitle", sub)
      void loadFromUrl(`/api/weather?${params}`)
    },
    [loadFromUrl]
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      setSuggestOpen(false)
      setSuggestLoading(false)
      setHighlightIdx(-1)
      return
    }

    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
    suggestDebounceRef.current = setTimeout(() => {
      suggestAbortRef.current?.abort()
      const ac = new AbortController()
      suggestAbortRef.current = ac
      setSuggestLoading(true)
      void (async () => {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
            signal: ac.signal,
          })
          const body = (await res.json()) as {
            results?: GeocodeResult[]
            error?: string
          }
          if (!res.ok) {
            setSuggestions([])
            setSuggestOpen(false)
            return
          }
          setSuggestions(body.results ?? [])
          setSuggestOpen(true)
          setHighlightIdx(-1)
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return
          setSuggestions([])
          setSuggestOpen(false)
        } finally {
          if (!ac.signal.aborted) setSuggestLoading(false)
        }
      })()
    }, 320)

    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
    }
  }, [query])

  useEffect(() => {
    return () => suggestAbortRef.current?.abort()
  }, [])

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    if (highlightIdx >= 0 && suggestions[highlightIdx]) {
      selectPlace(suggestions[highlightIdx])
      return
    }
    const q = query.trim()
    if (!q) {
      setError("Enter a city, ZIP code, or place name.")
      return
    }
    setSuggestOpen(false)
    void loadFromUrl(`/api/weather?q=${encodeURIComponent(q)}`)
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestOpen || (!suggestions.length && !suggestLoading)) {
      if (e.key === "Escape") setSuggestOpen(false)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIdx((i) =>
        i < 0 ? 0 : Math.min(i + 1, suggestions.length - 1)
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIdx((i) => (i <= 0 ? -1 : i - 1))
    } else if (e.key === "Escape") {
      e.preventDefault()
      setSuggestOpen(false)
      setHighlightIdx(-1)
    } else if (e.key === "Enter" && highlightIdx >= 0 && suggestions[highlightIdx]) {
      e.preventDefault()
      selectPlace(suggestions[highlightIdx])
    }
  }

  function onUseLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location detection.")
      return
    }
    setError(null)
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        void loadFromUrl(
          `/api/weather?lat=${latitude}&lon=${longitude}`
        )
      },
      () => {
        setGeoLoading(false)
        setError(
          "Location access was denied or unavailable. Allow location in your browser settings or search manually."
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  const currentVisual = data
    ? getWeatherVisual(data.current.weather_code)
    : null
  const CurrentIcon = currentVisual?.Icon

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-br transition-[background] duration-700",
          currentVisual
            ? currentVisual.gradient
            : "from-sky-500/40 via-indigo-400/30 to-violet-500/35"
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-background/75 backdrop-blur-[2px] dark:bg-background/80" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Skyline Weather
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground sm:text-base">
              Search any city or postal code, or use your position. Powered by{" "}
              <a
                className="font-medium text-foreground underline-offset-4 hover:underline"
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
              >
                Open-Meteo
              </a>
              .
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border bg-card/80 p-1 text-xs shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setUnit("C")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                unit === "C"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              °C
            </button>
            <button
              type="button"
              onClick={() => setUnit("F")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors",
                unit === "F"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              °F
            </button>
          </div>
        </header>

        <form
          onSubmit={onSearch}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative z-20 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            {suggestLoading && (
              <Loader2
                className="pointer-events-none absolute right-2.5 top-1/2 z-10 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden
              />
            )}
            <Input
              className={cn(
                "h-10 border-border/80 bg-card/90 pl-9 shadow-sm backdrop-blur-sm sm:h-11 sm:text-base",
                suggestLoading && "pr-9"
              )}
              placeholder="City, ZIP, region…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              onFocus={() => {
                if (query.trim().length >= 2 && (suggestions.length > 0 || suggestLoading)) {
                  setSuggestOpen(true)
                }
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setSuggestOpen(false)
                  setHighlightIdx(-1)
                }, 180)
              }}
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-label="Location search"
            />
            {suggestOpen && query.trim().length >= 2 && (
              <div
                id={listId}
                role="listbox"
                className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 max-h-72 overflow-auto rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg"
              >
                {suggestLoading && suggestions.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    Searching places…
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">
                    No matching places. Try another spelling or broader area.
                  </div>
                ) : (
                  <ul className="py-1">
                    {suggestions.map((p, i) => {
                      const sub = formatPlaceSubtitle(p)
                      const active = i === highlightIdx
                      return (
                        <li key={`${p.latitude}-${p.longitude}-${p.name}-${i}`} role="none">
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={cn(
                              "flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2.5 text-left text-sm transition-colors",
                              active
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-muted/80"
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectPlace(p)
                            }}
                            onMouseEnter={() => setHighlightIdx(i)}
                          >
                            <span className="font-medium text-foreground">
                              {p.name}
                            </span>
                            {sub && (
                              <span className="text-xs text-muted-foreground">
                                {sub}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <Button
              type="submit"
              className="h-10 flex-1 sm:flex-none sm:px-6"
              disabled={loading}
            >
              {loading && !geoLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Search className="size-4" aria-hidden />
              )}
              <span className="ml-1.5">Search</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 flex-1 sm:flex-none sm:px-4"
              onClick={onUseLocation}
              disabled={loading && geoLoading}
            >
              {geoLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Navigation className="size-4" aria-hidden />
              )}
              <span className="ml-1.5 hidden sm:inline">Locate</span>
              <span className="ml-1.5 sm:hidden">GPS</span>
            </Button>
          </div>
        </form>

        {error && (
          <Alert variant="destructive" className="border-destructive/40 bg-card/95">
            <AlertTitle>Unable to load weather</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && !data && (
          <div className="grid gap-4">
            <Skeleton className="h-48 w-full rounded-xl sm:h-56" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {data && currentVisual && CurrentIcon && (
          <div className="grid flex-1 gap-6 pb-8">
            <Card className="overflow-hidden border-border/60 bg-card/90 shadow-lg backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                      <MapPin className="size-5 shrink-0 text-primary" aria-hidden />
                      {data.location.name}
                    </CardTitle>
                    <CardDescription className="mt-1 text-base">
                      {data.location.subtitle ?? data.timezone}
                    </CardDescription>
                  </div>
                  <div className="text-left text-xs text-muted-foreground sm:text-right">
                    <p>Local time (API)</p>
                    <p className="font-mono text-foreground">
                      {data.current.time}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div
                      className={cn(
                        "flex size-28 items-center justify-center rounded-2xl bg-linear-to-br shadow-inner ring-1 ring-black/5 sm:size-36",
                        currentVisual.gradient
                      )}
                    >
                      <CurrentIcon
                        className="size-16 text-white drop-shadow-md sm:size-20"
                        strokeWidth={1.25}
                        aria-hidden
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {currentVisual.label}
                      </p>
                      <p className="font-heading text-5xl font-semibold tabular-nums tracking-tight text-foreground sm:text-6xl">
                        {formatTemp(data.current.temperature_2m, unit)}
                        <span className="text-3xl font-normal text-muted-foreground">
                          °{unit}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Feels like{" "}
                        <span className="font-medium text-foreground">
                          {formatTemp(data.current.apparent_temperature, unit)}°
                          {unit}
                        </span>
                      </p>
                    </div>
                  </div>
                  <dl className="grid w-full max-w-md grid-cols-2 gap-3 sm:max-w-none sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                    <div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        Humidity
                      </dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {data.current.relative_humidity_2m}%
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        Wind
                      </dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {Math.round(data.current.wind_speed_10m)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          km/h
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                          {windDirectionLabel(
                            data.current.wind_direction_10m
                          )}
                        </span>
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        Precipitation
                      </dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {data.current.precipitation.toFixed(1)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          mm
                        </span>
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/40 px-3 py-3">
                      <dt className="text-xs font-medium text-muted-foreground">
                        Rain chance (today)
                      </dt>
                      <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                        {data.daily.precip_prob_max[0] ?? 0}
                        <span className="text-sm font-normal text-muted-foreground">
                          %
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 font-heading text-lg font-semibold sm:text-xl">
                5-day outlook
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {data.daily.dates.map((date, i) => {
                  const code = data.daily.weather_codes[i] ?? 0
                  const vis = getWeatherVisual(code)
                  const DayIcon = vis.Icon
                  return (
                    <Card
                      key={date}
                      className="border-border/60 bg-card/85 backdrop-blur-sm"
                      size="sm"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {i === 0 ? "Today" : formatDayLabel(date)}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(`${date}T12:00:00`).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col items-center gap-2 pt-0">
                        <div
                          className={cn(
                            "flex size-14 items-center justify-center rounded-xl bg-linear-to-br",
                            vis.gradient
                          )}
                        >
                          <DayIcon
                            className="size-8 text-white drop-shadow"
                            strokeWidth={1.25}
                            aria-hidden
                          />
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                          {vis.label}
                        </p>
                        <p className="font-heading text-lg font-semibold tabular-nums">
                          {formatTemp(data.daily.temp_max[i] ?? 0, unit)}°
                          <span className="mx-1 text-muted-foreground">/</span>
                          <span className="text-muted-foreground">
                            {formatTemp(data.daily.temp_min[i] ?? 0, unit)}°
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rain{" "}
                          <span className="font-medium text-foreground">
                            {data.daily.precip_prob_max[i] ?? 0}%
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {!data && !loading && !error && (
          <Alert className="border-border/60 bg-card/90 backdrop-blur-sm">
            <AlertTitle>Get started</AlertTitle>
            <AlertDescription>
              Search for a place or tap <strong>Locate</strong> to use your
              device GPS. Results include live conditions and a five-day
              forecast.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
