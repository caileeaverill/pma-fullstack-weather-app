import { real, sqliteTable, text } from "drizzle-orm/sqlite-core"

/** Persisted weather snapshot: location, date range, and Open-Meteo payload slice */
export const weatherRecords = sqliteTable("weather_records", {
  id: text("id").primaryKey(),
  locationName: text("location_name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  country: text("country"),
  admin1: text("admin1"),
  dateRangeStart: text("date_range_start").notNull(),
  dateRangeEnd: text("date_range_end").notNull(),
  /** JSON: StoredWeatherSnapshot */
  weatherJson: text("weather_json", { mode: "json" }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export type WeatherRecordRow = typeof weatherRecords.$inferSelect
export type WeatherRecordInsert = typeof weatherRecords.$inferInsert
