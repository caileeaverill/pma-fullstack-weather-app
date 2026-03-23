/** Convert meteorological degrees to 8-point compass label */
export function windDirectionLabel(degrees: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  const d = ((degrees % 360) + 360) % 360
  const i = Math.round(d / 45) % 8
  return dirs[i] ?? "N"
}

export function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}
