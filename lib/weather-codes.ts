import type { LucideIcon } from "lucide-react"
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloudy,
  Sun,
} from "lucide-react"

export type WeatherVisual = {
  label: string
  Icon: LucideIcon
  /** Subtle gradient for hero / cards */
  gradient: string
}

/** WMO Weather interpretation codes (WW) — Open-Meteo */
export function getWeatherVisual(code: number): WeatherVisual {
  if (code === 0) {
    return {
      label: "Clear sky",
      Icon: Sun,
      gradient: "from-sky-400/90 via-amber-200/80 to-sky-300/70",
    }
  }
  if (code === 1) {
    return {
      label: "Mainly clear",
      Icon: CloudSun,
      gradient: "from-sky-400/80 via-sky-200/70 to-amber-100/60",
    }
  }
  if (code === 2) {
    return {
      label: "Partly cloudy",
      Icon: CloudSun,
      gradient: "from-slate-400/70 via-sky-300/60 to-slate-200/50",
    }
  }
  if (code === 3) {
    return {
      label: "Overcast",
      Icon: Cloudy,
      gradient: "from-slate-500/75 via-slate-400/60 to-zinc-300/50",
    }
  }
  if (code === 45 || code === 48) {
    return {
      label: "Fog",
      Icon: CloudFog,
      gradient: "from-zinc-400/70 via-slate-400/55 to-zinc-300/45",
    }
  }
  if (code >= 51 && code <= 57) {
    return {
      label: "Drizzle",
      Icon: CloudDrizzle,
      gradient: "from-slate-500/70 via-blue-400/50 to-slate-400/45",
    }
  }
  if (code >= 61 && code <= 67) {
    return {
      label: "Rain",
      Icon: CloudRain,
      gradient: "from-blue-700/65 via-blue-500/55 to-slate-500/45",
    }
  }
  if (code >= 71 && code <= 77) {
    return {
      label: "Snow",
      Icon: CloudSnow,
      gradient: "from-sky-300/75 via-slate-200/65 to-blue-200/50",
    }
  }
  if (code >= 80 && code <= 82) {
    return {
      label: "Rain showers",
      Icon: CloudRain,
      gradient: "from-blue-600/70 via-sky-500/50 to-slate-500/45",
    }
  }
  if (code === 85 || code === 86) {
    return {
      label: "Snow showers",
      Icon: CloudSnow,
      gradient: "from-slate-300/75 via-sky-200/60 to-blue-100/50",
    }
  }
  if (code >= 95 && code <= 99) {
    return {
      label: "Thunderstorm",
      Icon: CloudLightning,
      gradient: "from-indigo-900/75 via-slate-700/60 to-violet-600/50",
    }
  }
  return {
    label: "Weather",
    Icon: Cloud,
    gradient: "from-slate-500/65 via-slate-400/50 to-zinc-300/45",
  }
}
