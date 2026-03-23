import fs from "node:fs"
import path from "node:path"

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "./schema"

const dataDir = path.join(process.cwd(), "data")
const dbPath = path.join(dataDir, "weather.db")

const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database
  drizzle?: ReturnType<typeof drizzle>
}

function ensureSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS weather_records (
      id TEXT PRIMARY KEY NOT NULL,
      location_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      country TEXT,
      admin1 TEXT,
      date_range_start TEXT NOT NULL,
      date_range_end TEXT NOT NULL,
      weather_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}

/** Lazy DB — avoids opening SQLite during \`next build\` (multiple workers / locks). */
export function getDb() {
  if (globalForDb.drizzle) return globalForDb.drizzle

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const sqlite = new Database(dbPath, { timeout: 8000 })
  sqlite.pragma("journal_mode = WAL")
  ensureSchema(sqlite)

  const d = drizzle(sqlite, { schema })
  globalForDb.sqlite = sqlite
  globalForDb.drizzle = d

  return d
}
