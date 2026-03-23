"use client"

import { useCallback, useEffect, useState } from "react"
import { FileDown, Loader2, Pencil, Save, Trash2 } from "lucide-react"

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

export type PlaceSaveContext = {
  latitude: number
  longitude: number
  defaultStart: string
  defaultEnd: string
}

type WeatherRecordRow = {
  id: string
  locationName: string
  latitude: number
  longitude: number
  country: string | null
  admin1: string | null
  dateRangeStart: string
  dateRangeEnd: string
  weatherJson: unknown
  createdAt: string
  updatedAt: string
}

function utcISODate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function defaultRange(): { start: string; end: string } {
  const now = new Date()
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 4)
  )
  return {
    start: utcISODate(now),
    end: utcISODate(end),
  }
}

export function SavedWeatherRecordsPanel({
  placeContext,
}: {
  placeContext: PlaceSaveContext | null
}) {
  const { start: defaultStart, end: defaultEnd } = defaultRange()
  const [locationQuery, setLocationQuery] = useState("")
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [useMapCoords, setUseMapCoords] = useState(!!placeContext)

  const [records, setRecords] = useState<WeatherRecordRow[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCoords, setEditCoords] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const loadRecords = useCallback(async () => {
    setListLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/records")
      const body = (await res.json()) as {
        records?: WeatherRecordRow[]
        error?: string
      }
      if (!res.ok) {
        setError(body.error ?? "Could not load saved records.")
        return
      }
      setRecords(body.records ?? [])
    } catch {
      setError("Could not load saved records.")
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  /** Fixed-length deps (primitives only) — avoids React 19 "useEffect dependency array changed size" when `placeContext` toggles null/object. */
  const pcLat = placeContext?.latitude
  const pcLon = placeContext?.longitude
  const pcStart = placeContext?.defaultStart
  const pcEnd = placeContext?.defaultEnd

  useEffect(() => {
    if (
      pcLat === undefined ||
      pcLon === undefined ||
      pcStart === undefined ||
      pcEnd === undefined
    ) {
      return
    }
    setStartDate(pcStart)
    setEndDate(pcEnd)
    setUseMapCoords(true)
  }, [pcLat, pcLon, pcStart, pcEnd])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        startDate,
        endDate,
      }
      if (!useMapCoords) {
        body.locationQuery = locationQuery.trim()
      } else if (editingId && editCoords) {
        body.latitude = editCoords.latitude
        body.longitude = editCoords.longitude
      } else if (placeContext) {
        body.latitude = placeContext.latitude
        body.longitude = placeContext.longitude
      } else {
        setError(
          "Load a forecast first to save with map coordinates, or uncheck and enter a location."
        )
        setSaveLoading(false)
        return
      }

      const url = editingId ? `/api/records/${editingId}` : "/api/records"
      const method = editingId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { error?: string; record?: WeatherRecordRow }
      if (!res.ok) {
        setError(json.error ?? "Save failed.")
        return
      }
      setEditingId(null)
      setEditCoords(null)
      setLocationQuery("")
      void loadRecords()
    } catch {
      setError("Save failed.")
    } finally {
      setSaveLoading(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this saved snapshot?")) return
    setError(null)
    try {
      const res = await fetch(`/api/records/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const j = (await res.json()) as { error?: string }
        setError(j.error ?? "Delete failed.")
        return
      }
      if (editingId === id) {
        setEditingId(null)
        setEditCoords(null)
      }
      void loadRecords()
    } catch {
      setError("Delete failed.")
    }
  }

  function onEdit(r: WeatherRecordRow) {
    setEditingId(r.id)
    setEditCoords({ latitude: r.latitude, longitude: r.longitude })
    setLocationQuery(r.locationName)
    setStartDate(r.dateRangeStart)
    setEndDate(r.dateRangeEnd)
    setUseMapCoords(true)
  }

  return (
    <Card className="border-border/60 bg-card/90 shadow-md backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-lg">Saved weather (REST + SQLite)</CardTitle>
        <CardDescription>
          Create, read, update, and delete snapshots with location and date-range
          validation. Data is stored locally in{" "}
          <code className="text-xs">data/weather.db</code>.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8" asChild>
            <a href="/api/export/records?format=json">
              <FileDown className="size-3.5" />
              JSON
            </a>
          </Button>
          <Button variant="outline" size="sm" className="h-8" asChild>
            <a href="/api/export/records?format=csv">
              <FileDown className="size-3.5" />
              CSV
            </a>
          </Button>
          <Button variant="outline" size="sm" className="h-8" asChild>
            <a href="/api/export/records?format=pdf">
              <FileDown className="size-3.5" />
              PDF
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSave} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={useMapCoords && (!!placeContext || !!editCoords)}
                disabled={!placeContext && !editCoords}
                onChange={(e) => setUseMapCoords(e.target.checked)}
              />
              <span>
                {editingId
                  ? "Use stored coordinates for this record"
                  : "Use coordinates from the forecast above"}
                {!placeContext && !editCoords && (
                  <span className="text-muted-foreground">
                    {" "}
                    (load a forecast or edit a saved row)
                  </span>
                )}
              </span>
            </label>
          </div>

          {!useMapCoords || (!placeContext && !editCoords) ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Location search
              </label>
              <Input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="City, postal code, region…"
                required={!useMapCoords || !placeContext}
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Start date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                End date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Allowed window: up to 7 days in the past through 16 days ahead (UTC),
            range ≤ 14 days — see server validation.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saveLoading}>
              {saveLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : editingId ? (
                <Pencil className="size-4" />
              ) : (
                <Save className="size-4" />
              )}
              <span className="ml-1.5">
                {editingId ? "Update snapshot" : "Save snapshot"}
              </span>
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null)
                  setEditCoords(null)
                  setLocationQuery("")
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </form>

        <div>
          <h3 className="mb-2 text-sm font-medium">Stored records</h3>
          {listLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border border-border/60">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{r.locationName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.dateRangeStart} → {r.dateRangeEnd} · updated{" "}
                      {new Date(r.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8"
                      onClick={() => onEdit(r)}
                    >
                      <Pencil className="size-3.5" />
                      <span className="ml-1">Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8"
                      onClick={() => void onDelete(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="ml-1">Delete</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
